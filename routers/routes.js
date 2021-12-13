const { Router } = require('express')
const router = Router()

// Controller Imports
const start = require('../controllers/start')
const callBack = require('../controllers/callback')
const wonderlaTicketsCallback=require('../controllers/wonderlaTicketsCallback')

router.post(`/telegram/webhook/${process.env.telegramToken}`, start.webhookController)
router.post('/callback', callBack)
router.post('/wonderlaTicketsCallback', wonderlaTicketsCallback)

module.exports = router