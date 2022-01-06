const axios = require('axios').default
const commands = require('../commands.json')
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender = require('./replySender');
const retail = require('./retail');
const callbackUtils=require('../utils/callback')

const setWebhook = async () => {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.telegramToken}/setWebhook`,
            {
                url: `${process.env.telegramWebhook}/${process.env.telegramToken}`
            }
        )
        if (response.status === 200) {
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
    try {
        const data = req.body
        console.log(data);
        if (data.message != undefined) {
            if ((typeof (data.message.entities) != 'undefined') && (data.message.entities[0].type == 'bot_command')) {
                redis.del(data.message.from.id)
                switch (data.message.text) {
                    case '/retail':
                        redis.set(data.message.from.id, JSON.stringify({
                            chat_id: data.message.chat.id,
                            initiatedCommand: '/retail',
                            nextStep: retail.steps.location
                        }), (err, reply) => {
                            if (err) {
                                throw err
                            } else {
                                replySender({
                                    "chat_id": data.message.chat.id,
                                    "text": retail.msgs.location
                                });
                            }
                        })
                        break;
                }
            } else {
                redis.get(data.message.from.id, async (err, reply) => {
                    if (err) {
                        throw err
                    } else {
                        const cachedData = JSON.parse(reply)
                        if (cachedData != null) {
                            switch (cachedData.initiatedCommand) {
                                // case '/bookcabs':
                                //     await bookCabs.handleBooking(cachedData, data)
                                //     break

                                case '/retail':
                                    await retail.handleRetail(cachedData, data)
                                    break;
                            }
                        } else {
                            replySender({
                                "chat_id": data.message.chat.id,
                                text: "I didn't understand that. Please try again!"
                            })
                        }
                    }
                })
            }
        } else if (data.callback_query != undefined) {
            // For Seperation We have Used
            const decryptedData=callbackUtils.decrypt(data.callback_query.data)
            const type = decryptedData.type;
            switch (type) {
                case 'retail' :{
                    const commandType=decryptedData.commandType
                    switch (commandType) {
                        case retail.callbackTypes.next:
                            retail.nextRetailItems(data, decryptedData)
                            break;
                        
                        case retail.callbackTypes.addToCart:
                            retail.addToCartCallback(data.callback_query.from.id, decryptedData.id)
                            break;
                        
                        case retail.callbackTypes.checkout:
                            console.log(decryptedData.id)
                            // TODO: handle checkout here.
                            break;
                    }
                
                    break;
                }
            }
        } else {
            console.log("S")
        }
        res.status(200).json({
            "status": "ok"
        })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    setWebhook,
    setCommands,
    webhookController,
    replySender
}