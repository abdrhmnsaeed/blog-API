const Post = require('../models/postModel');
const User = require('../models/userModel');
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const HttpError = require('../models/errorModel');

// CREATE POST
const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;
    if (!title || !category || !description || !req.files)
      return next(
        new HttpError('Fill in all the fields and choose thumbnail.', 422)
      );

    const { thumbnail } = req.files;
    if (thumbnail.size > 2000000)
      return next(
        new HttpError('Thumbnail too big. File should be less than 2mb')
      );

    let fileName = thumbnail.name;
    let splittedFileName = fileName.split('.');
    let newFileName =
      splittedFileName[0] +
      uuid() +
      '.' +
      splittedFileName[splittedFileName.length - 1];
    thumbnail.mv(
      path.join(__dirname, '..', 'uploads', newFileName),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        } else {
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFileName,
            creator: req.user.id,
          });
          if (!newPost)
            return next(new HttpError('Post could not be created', 422));

          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

          res.status(201).json(newPost);
        }
      }
    );
  } catch (err) {
    return next(new HttpError(err));
  }
};

// GET ALL POSTS
const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({}).sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// GET A SINGLE POST
const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) return next(new HttpError('Post not found', 404));

    res.status(200).json(post);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// GET POSTS BY CATEGORY
const getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPosts = await Post.find({ category }).sort({ createdAt: -1 });

    res.status(200).json(catPosts);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// GET AUTHOR POST
const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// EDIT POST
const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFileName;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;

    if (!title || !category || description.length < 12) {
      return next(new HttpError('Fill in all the fields', 422));
    }

    const oldPost = await Post.findById(postId);
    if (req.user.id == oldPost.creator) {
      if (!req.files || !req.files.thumbnail) {
        // If no files are uploaded, just update the other fields
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { title, category, description },
          { new: true }
        );
      } else {
        // If a file is uploaded, delete the old one and save the new thumbnail
        fs.unlink(
          path.join(__dirname, '..', 'uploads', oldPost.thumbnail),
          (err) => {
            if (err) {
              return next(new HttpError(err));
            }
          }
        );

        const { thumbnail } = req.files;
        if (thumbnail.size > 2000000) {
          return next(
            new HttpError('Thumbnail too big. Should be less than 2mb')
          );
        }

        fileName = thumbnail.name;
        let splittedFileName = fileName.split('.');
        newFileName =
          splittedFileName[0] +
          uuid() +
          '.' +
          splittedFileName[splittedFileName.length - 1];

        thumbnail.mv(
          path.join(__dirname, '..', 'uploads', newFileName),
          (err) => {
            if (err) return next(new HttpError(err));
          }
        );

        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { title, category, description, thumbnail: newFileName },
          { new: true }
        );
      }
    }

    if (!updatedPost) {
      return next(new HttpError('Could not update post'));
    }

    res.status(200).json(updatedPost);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// DELETE POST
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) return next(new HttpError('Post unavailable', 400));

    const post = await Post.findById(postId);
    const fileName = post?.thumbnail;
    if (req.user.id == post?.creator) {
      fs.unlink(
        path.join(__dirname, '..', 'uploads', fileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          } else {
            await Post.findByIdAndDelete(postId);

            const currentUser = await User.findById(req.user.id);
            const userPostCount = currentUser?.posts - 1;
            await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
            res.json(`Post ${postId} deleted successfully`);
          }
        }
      );
    } else {
      return next(new HttpError('Post could not be deleted', 402));
    }
  } catch (err) {
    return next(new HttpError(err));
  }
};

module.exports = {
  createPost,
  getPost,
  getPosts,
  getCatPosts,
  getUserPosts,
  editPost,
  deletePost,
};
