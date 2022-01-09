const axios = require('axios').default
const commands = require('../commands.json')
const redis = require('../utils/redis')
const ioredis = require('../utils/ioredis')
const db = require('../utils/mongo')
const replySender = require('./replySender');
const retail = require('./retail');
const callbackUtils = require('../utils/callback')

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
        // console.log(data);
        if (data.message != undefined) {
            if ((typeof (data.message.entities) != 'undefined') && (data.message.entities[0].type == 'bot_command')) {
                redis.del(data.message.from.id)
                await ioredis.del("chat_id"+data.message.from.id)
                
                switch (data.message.text) {
                    case '/retail':
                        redis.set(data.message.from.id, JSON.stringify({
                            chat_id: data.message.chat.id,
                            initiatedCommand: '/retail',
                            nextStep: retail.steps.language
                        }), (err, reply) => {
                            if (err) {
                                throw err
                            } else {
                                replySender({
                                    "chat_id": data.message.chat.id,
                                    "text": retail.msgs(retail.languages.english).language
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
                                text: retail.msgs(retail.languages.english).did_nt_understand
                            })
                        }
                    }
                })
            }
        } else if (data.callback_query != undefined) {
            // For Seperation We have Used
            const decryptedData = callbackUtils.decrypt(data.callback_query.data)
            const type = decryptedData.type;
            const chat_id=data.callback_query.from.id;
            switch (type) {
                case 'retail': {
                    const commandType = decryptedData.commandType
                    switch (commandType) {
                        case retail.callbackTypes.next:
                            retail.nextItemsCallback(chat_id, decryptedData.id)
                            break;
                        
                        case retail.callbackTypes.anotherSearch:
                            retail.anotherSearchCallback(chat_id, decryptedData.id)
                            break;

                        case retail.callbackTypes.addToCart:
                            retail.addToCartCallback(chat_id, decryptedData.id)
                            break;

                        case retail.callbackTypes.checkout:
                            retail.checkoutCallback(chat_id, decryptedData.id)
                            break;

                        case retail.callbackTypes.cancelCheckout:
                            retail.cancelCheckoutCallback(chat_id, decryptedData.id)
                            break;

                        case retail.callbackTypes.proceedCheckout:
                            retail.proceedCheckoutCallback(chat_id, decryptedData.id);
                            break;

                        case retail.callbackTypes.confirmOrder:
                            retail.confirmOrderCallback(chat_id, decryptedData.id);
                            break;

                        case retail.callbackTypes.cancelConfirm:
                            retail.cancelConfirmCallback(chat_id, decryptedData.id);
                            break;
                        
                        case retail.callbackTypes.trackOrder:
                            retail.trackOrderCallback(chat_id, decryptedData.id);
                            break;
                    
                        case retail.callbackTypes.orderStatus:
                            retail.orderStatusCallback(chat_id, decryptedData.id);
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