const serverless = require('serverless-http');
const app = require('../app');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI).catch((err) => {
        console.error('Mongo connect failed in serverless entry:', err);
    });
} else {
    console.warn('MONGO_URI not set; DB operations will fail in serverless function');
}

module.exports = serverless(app);
