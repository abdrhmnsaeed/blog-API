const express = require('express');
const cors = require('cors');
const { connect } = require('mongoose');
require('dotenv').config();
const upload = require('express-fileupload');


const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');


const app = express();


async function startServer() {
    const { agpGateway } = await import('agp-system');

    const app = express();
    
    // Now you can use it
    app.use('/api/gateway', agpGateway({
        secret: process.env.AGP_SECRET
    }));

    // Rest of your server logic...
}
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(upload());
app.use('/uploads', express.static(`${__dirname}/uploads`));

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// app.use('/api/gateway', agpGateway({
//     secret: process.env.AGP_SECRET 
// }));

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
const mongoDB = process.env.MONGO_URI;

connect(mongoDB)
  .then(app.listen(port, () => console.log(`Server running on port ${port}`)))
  .catch((err) => console.log(err));
