const axios = require('axios').default
const commands = require('../commands.json')

const setWebhook = async () => {
    try{
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.telegramToken}/setWebhook`,
            {
                url: `${process.env.telegramWebhook}/${process.env.telegramToken}`
            }
        )
        if(response.status === 200) {
            console.log("Webhook has been updated!")
        }
    } catch (err) {
        console.log(err)
    }
}

const setCommands = async () => {
    try {
        const response = await axios.post(
            `${process.env.telegramURL}/bot${process.env.telegramToken}/setMyCommands`,
            {
                "commands": commands
            }
        )
        if (response.status === 200) {
            console.log("Commands Set Successfully!")
        }
    } catch (err) {
        throw err
    }
}

const webhookController = async (req, res, next) => {
    try{
        const data = req.body
        console.log(data)
        if(data.message != undefined) {
            if (typeof (data.message.entities) != 'undefined') {
                if (data.message.entities[0].type == 'bot_command') {
                    switch (data.message.text) {
                        case '/bookcabs':
                            replySender({
                                "chat_id": data.message.chat.id,
                                "text": "Select an option",
                                "reply_markup": {
                                    "inline_keyboard": [
                                        [{
                                            "text": "Buy Sandeep a MacBook Pro",
                                            "callback_data": "share"
                                        }],
                                        [{
                                            "text": "Buy Sandeep a Windows Computer",
                                            "callback_data": "share1"
                                        }]
                                    ],
                                    "resize_keyboard": true,
                                    "one_time_keyboard": true
                                }
                            })
                            break
                        case '/help':
                            replySender({
                                "chat_id": data.message.chat.id,
                                "text": "For any queries please reach out to support@stayhalo.in on Email!"
                            })
                            break
                        case '/aboutus':
                            replySender({
                                "chat_id": data.message.chat.id,
                                "text": "You can avail an array of services from the Kochi Open Mobility Network through StayHalo. Today, you can book taxi rides in Kochi.Next, you will also be able to book water metro rides and view metro schedules.In the days to come, I will help you avail a wider variety of services across the country."
                            })
                    }
                }
            }
        } else {
            console.log(data)
        }
        res.status(200).json({
            "status": "ok"
        })
    } catch (err) {
        next(err)
    }
}

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

module.exports = {
    setWebhook,
    setCommands,
    webhookController,
    replySender
}