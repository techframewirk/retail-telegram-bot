const redis = require('../utils/redis')
const replySender = require('./replySender')

const handleParking = async (cachedData, data) => {
    try {
        switch (cachedData.nextStep) {
            case 'booking_location':
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Do you want to book now or for later?",
                    reply_markup: {
                        inline_keyboard: [
                            [{
                                text: "Now",
                                callback_data: `bookparking-booklocationnow`
                            }],
                            [{
                                text: "Later",
                                callback_data: `bookparking-booklocationlaters`
                            }]
                        ],
                        "resize_keyboard": true,
                        "one_time_keyboard": true
                    }
                })
                redis.set(data.message.from.id, JSON.stringify({
                    chat_id: data.message.chat.id,
                    initiatedCommand: '/bookparking',
                    nextStep: 'trigger_on_search'
                }), (err, reply) => {
                    if (err) {
                        throw err
                    } else {
                        replySender({
                            "chat_id": data.message.chat.id,
                            "text": "Sure. Please send the Pickup location for booking parking."
                        })
                    }
                })
                break
            case 'trigger_on_search':
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Please send the Pickup location for booking parking."
                })
                redis.set(data.message.from.id, JSON.stringify({
                    chat_id: data.message.chat.id,
                    initiatedCommand: '/bookparking',
                    nextStep: 'booking_location'
                }), (err, reply) => {
                    if (err) {
                        throw err
                    } else {
                        replySender({
                            "chat_id": data.message.chat.id,
                            "text": "Sure. Please send the Pickup location for booking parking."
                        })
                    }
                }
                )
                break
        }
    } catch (error) {
        console.log(error)
        throw err  
    }
}

const handleCallbackQuery = async (data, callbackData) => {
    try {
        switch(callbackData) {
            case 'booklocationnow':
                replySender({
                    chat_id: data.callback_query.from.id,
                    text: "Book now triggered"
                })
                redis.set(data.callback_query.from.id, JSON.stringify({
                    chat_id: data.callback_query.from.id,
                    initiatedCommand: '/bookparking',
                    nextStep: 'booking_location'
                    }), (err, reply) => {
                        if (err) {
                            throw err
                        } else {
                            replySender({
                                "chat_id": data.callback_query.from.id,
                                "text": "Sure. Please send the Pickup location for booking parking."
                            })
                        }
                    }
                )
                break
            case 'booklocationlaters':
                replySender({
                    chat_id: data.callback_query.from.id,
                    text: "Book later triggered"
                })
                redis.set(data.callback_query.from.id, JSON.stringify({
                    chat_id: data.callback_query.from.id,
                    initiatedCommand: '/bookparking',
                    nextStep: 'booking_location'
                }), (err, reply) => {
                    if (err) {
                        throw err
                    } else {
                        replySender({
                            "chat_id": data.callback_query.from.id,
                            "text": "Sure. Please send the Pickup location for booking parking."
                        })
                    }
                }
                )
                break
        }
    } catch (error) {
        console.log(error)
        throw err
    }
}
module.exports = {
    handleParking,
    handleCallbackQuery
}