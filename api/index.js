const serverless = require('serverless-http');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI).catch((err) => {
        console.error('Mongo connect failed in serverless entry:', err);
    });
} else {
    console.warn('MONGO_URI not set; DB operations will fail in serverless function');
}

try {
    const app = require('../app');
    module.exports = serverless(app);
} catch (err) {
    console.error('Serverless initialization error:', err && err.stack ? err.stack : err);
    module.exports = (req, res) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'serverless_init_error', message: err && err.message ? err.message : String(err) }));
    };
}
