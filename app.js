// App Dependencies
require('dotenv').config()
const express = require('express')
const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");

const app = express()

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

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

app.get("/health", (req, res, next) => {
    res.status(200).json({
        'status': 'ok'
    })
})

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});

db.connectToMongoDB( async () => {
    try {
        await startController.setWebhook()
        await startController.setCommands()
        app.listen(3000)
    } catch (err) {
        console.log(err)
    }
})