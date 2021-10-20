// App Dependencies
require('dotenv').config()
const express = require('express')
const app = express()

// Util Imports
const db = require('./utils/mongo')
const redis = require('./utils/redis')

// Middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))

db.connectToMongoDB(() => {
    app.listen(3000)
})