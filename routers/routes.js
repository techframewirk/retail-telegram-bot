const { Router } = require('express')
const router = Router()

// Controller Imports
const start = require('../controllers/start')

router.post(`/telegram/webhook/${process.env.telegramToken}`, start.webhookController)

module.exports = router