// App Dependencies
require('dotenv').config()
const express = require('express')
const app = express()

// Util Imports
const db = require('./utils/mongo')

// Controller Imports
const startController = require('./controllers/start')

// Router Imports
const mainRoutes = require('./routers/routes')

// Middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use(mainRoutes)

db.connectToMongoDB( async () => {
    await startController.setWebhook()
    await startController.setCommands()
    app.listen(3000)
})