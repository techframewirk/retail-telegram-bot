const { MongoClient } = require('mongodb')

let _db

const connectToMongoDB = async callback => {
    const client = new MongoClient(
        process.env.mongoURL, {
            maxPoolSize: 25,
            minPoolSize: 10
        }
    )
    client.connect().then(client => {
        console.log("MongoDB Connected")
        _db = client.db(process.env.mongoDBName)
        callback(client)
    }).catch(err => {
        console.log(err)
    })
}

const getDB = () => {
    if(_db) {
        return _db
    }
}

module.exports = {
    connectToMongoDB,
    getDB
}