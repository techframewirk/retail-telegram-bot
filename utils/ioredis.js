const IORedis = require('ioredis');

const client = new IORedis({
    host: process.env.redisHost,
    port: parseInt(process.env.redisPort)
})

module.exports = client;