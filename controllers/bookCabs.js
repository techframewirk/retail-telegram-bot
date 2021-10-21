const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')

const handleBooking = async (cachedData, data) => {
    switch(cachedData.nextStep) {
        case 'pickupLocation':
            if(validations.validateLocationData(data)) {
                redis.set(data.message.chat.id, JSON.stringify({ ...cachedData, nextStep: 'dropLocation', pickupLocation: `${data.message.location.latitude},${data.message.location.longitude}` }))
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Thanks for that! Similarly, please send me the drop location."
                })
            }
            break
        case 'dropLocation':
            if(validations.validateLocationData(data)) {
                redis.set(data.message.chat.id, JSON.stringify({ ...cachedData, nextStep: 'cabsSearch', dropLocation: `${data.message.location.latitude},${data.message.location.longitude}` }))
                await db.getDB().collection("ongoing").insertOne(
                    { ...cachedData, nextStep: 'cabsSearch', dropLocation: `${data.message.location.latitude},${data.message.location.longitude}`},
                )
                const response = await axios.post(
                    `${process.env.becknService}/trigger/search`,
                    {
                        "message": {
                            "intent": {
                                "pickups": [
                                    {
                                        "location": {
                                            "gps": {
                                                "lat": cachedData.pickupLocation.split(",")[0],
                                                "lon": cachedData.pickupLocation.split(",")[1]
                                            }
                                        },
                                        "id": "",
                                        "transfers": [],
                                        "departure_time": {
                                            "est": "2021-10-18T10:17:26.108226Z",
                                            "act": "2021-10-18T10:17:26.108226Z"
                                        }
                                    }
                                ],
                                "drops": [
                                    {
                                        "location": {
                                            "gps": {
                                                "lat": data.message.location.latitude,
                                                "lon": data.message.location.longitude
                                            }
                                        },
                                        "id": "",
                                        "transfers": [],
                                        "departure_time": {
                                            "est": "2021-10-18T10:17:26.108226Z",
                                            "act": "2021-10-18T10:17:26.108226Z"
                                        }
                                    }
                                ],
                                "payload": {
                                    "travellers": []
                                },
                                "tags": [
                                    {
                                        "value": "108132.013",
                                        "key": "distance"
                                    }
                                ]
                            }
                        }
                    }
                )
                if(response.status === 200) {
                    await db.getDB().collection('ongoing').updateOne({
                        chat_id: data.message.chat.id
                    }, {$set: {
                        onSearchTrigger: response.data,
                        transaction_id: response.data.context.transaction_id,
                        message_id: response.data.context.message_id
                    }})
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Thank you so much!\n That’s all I need. I’m looking for cabs close to your pickup location. Please wait a few mins for me to send you a reply."
                    })
                }
            }
            break
    }
}

const confirmBooking = async (data, callbackData) => {
    const chat_id = data.callback_query.from.id
    const savedData = await db.getDB().collection('ongoing').findOne({
        chat_id: chat_id
    }, { sort: { $natural: -1 } })
    const response = await axios.post(
        `${process.env.becknService}/trigger/confirm`,
        {
            "context": {
                "bpp_id": "https://mock_bpp.com/",
                "bpp_uri": "https://beckn.free.beeceptor.com",
                "transaction_id": savedData.transaction_id
            },
            "message": {
                "order": {
                    "items": [
                        {
                            "id": callbackData
                        }
                    ],
                    "cancellation_reasons": [],
                    "updated_at": new Date().toISOString(),
                    "created_at": new Date().toISOString(),
                    "id": callbackData
                }
            }
        }
    )
    if(response.status === 200) {
        await db.getDB().collection('ongoing').updateOne({
            _id: savedData._id
        }, { $set: {
            confirmationResponse: response.data
        } })
        replySender({
            chat_id: chat_id,
            text: "Your cab is being confirmed!\n\nIn the meantime, please send your Contact Details!",
            reply_markup: {
                keyboard: [
                    [{
                        "text": "Send Contact",
                        "request_contact": true
                    }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        })
    }
}

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

module.exports = {
    handleBooking,
    confirmBooking
}