const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const User = require('../models/userModel');
const HttpError = require('../models/errorModel');

// Register User
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password)
      return next(new HttpError('Please fill all fields.', 422));

    const newEmail = email.toLowerCase();

    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) return next(new HttpError('Email already exists.', 422));

    if (password.trim().length < 6)
      return next(
        new HttpError('Password should be at least 6 characters', 422)
      );
    if (password != confirmPassword)
      return next(new HttpError('Passwords do not match', 422));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPassword,
    });

    res.status(201).json(`New User ${newUser.email} Registered.`);
  } catch (err) {
    return next(new HttpError('User registration failed.', 422));
  }
};

// Login User
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError('Please fill all fields.', 422));
    }

    const newEmail = email.toLowerCase();
    const user = await User.findOne({ email: newEmail });

    if (!user) return next(new HttpError('Invalid credentials.', 422));

    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword)
      return next(new HttpError('Invalid credentials.', 422));

    const { id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({
      token,
      id,
      name,
    });
  } catch (err) {
    return next(
      new HttpError('Login failed, Please check your credentials', 422)
    );
  }
};

// User Profile
const getUser = async (req, res, next) => {
  try {
    // const { id } = req.user;
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return next(new HttpError('User not found.', 404));

    res.status(200).json(user);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// CHANGE USER AVATAR
const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files.avatar)
      return next(new HttpError('Please choose an image', 422));

    const user = await User.findById(req.user.id);

    if (user.avatar)
      fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
        if (err) return next(new HttpError(err));
      });

    const { avatar } = req.files;
    if (avatar.size > 500000)
      return next(
        HttpError('Profile picture too big. Should be less than 500kb', 422)
      );

    let filename = avatar.name;
    let splittedFileName = filename.split('.');
    let newFileName =
      splittedFileName[0] +
      uuid() +
      '.' +
      splittedFileName[splittedFileName.length - 1];
    avatar.mv(
      path.join(__dirname, '..', 'uploads', newFileName),
      async (err) => {
        if (err) return next(new HttpError(err));

        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFileName },
          { new: true }
        );
        if (!updatedAvatar)
          return next(new HttpError('Avatar could not be changed', 422));

        res.status(200).json(updatedAvatar);
      }
    );
  } catch (err) {
    return next(new HttpError(err));
  }
};

// EDIT USER
const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;
    if (!name || !email || !currentPassword || !newPassword)
      return next(new HttpError('Fill in all fields', 422));

    const user = await User.findById(req.user.id);
    if (!user) return next(new HttpError('User not found', 403));

    const emailExist = await User.findOne({ email });
    if (emailExist && emailExist._id != req.user.id)
      return next(new HttpError('Email already exist', 422));

    const validateUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!validateUserPassword) {
      return next(new HttpError('Invalid Current Password', 422));
    }

    if (newPassword !== confirmNewPassword) {
      return next(new HttpError('New Passwords do not match', 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);

    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hashPassword },
      { new: true }
    );
    res.status(200).json(newInfo);
  } catch (err) {
    return next(new HttpError(err));
  }
};

// GET USERS
const getUsers = async (req, res, next) => {
  try {
    const authors = await User.find().select('-password');
    res.status(200).json(authors);
  } catch (err) {
    return next(new HttpError(err));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getUsers,
};
