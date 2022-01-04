const { Router } = require('express')
const router = Router()

// Controller Imports
const start = require('../controllers/start')
const callBack = require('../controllers/callback')

router.post(`/telegram/webhook/${process.env.telegramToken}`, start.webhookController)
router.post('/callback', callBack)

module.exports = router