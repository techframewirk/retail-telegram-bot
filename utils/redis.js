const redis = require('redis')

const client = redis.createClient({
    host: process.env.redisHost,
    port: parseInt(process.env.redisPort)
})

module.exports = client