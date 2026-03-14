const serverless = require('serverless-http');
const mongoose = require('mongoose');
const dns = require('dns');

const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    try {
        dns.setServers(['1.1.1.1', '8.8.8.8']);
        console.log('Node DNS servers set to Cloudflare/Google for SRV resolution (serverless entry)');
    } catch (err) {
        console.warn('Could not set DNS servers for Node resolver (serverless entry):', err && err.message ? err.message : err);
    }
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
