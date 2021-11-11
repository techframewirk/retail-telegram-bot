const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')

const handleBooking = async (cachedData, data) => {
    switch(cachedData.nextStep) {
        case 'pickupLocation':
            if (data.message.location !== undefined) {
                redis.set(data.message.chat.id, JSON.stringify({ ...cachedData, nextStep: 'dropLocation', pickupLocation: `${data.message.location.latitude},${data.message.location.longitude}` }))
                // // Old
                // replySender({
                //     chat_id: data.message.chat.id,
                //     text: "Thanks for that! Similarly, please send me the drop location."
                // })

                // New
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Where do you want to book your ride to?"
                })
            } else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a location! Please try again!"
                })
            }
            break
        case 'dropLocation':
            if (data.message.location !== undefined) {
                redis.set(data.message.chat.id, JSON.stringify({ ...cachedData, nextStep: 'cabsSearch', dropLocation: `${data.message.location.latitude},${data.message.location.longitude}` }))
                const response = await axios.post(
                    `${process.env.becknService}/trigger/search`,
                    {
                        "context": {
                            "domain": "nic2004:60221",
                            "core_version": "0.8.2"
                        },
                        "message": {
                            "intent": {
                                "pickups": [
                                    {
                                        "location": {
                                            "address": {
                                                "state": "Karnataka",
                                                "country": "India",
                                                "building": "Juspay Apartments",
                                                "door": "#817",
                                                "street": "27th Main",
                                                "locality": "8th Block Koramangala",
                                                "city": "Bangalore",
                                                "area_code": "560047"
                                            },
                                            "gps": { "lat": cachedData.pickupLocation.split(",")[0], "lon": cachedData.pickupLocation.split(",")[1] },
                                        },
                                        "id": "",
                                        "transfers": [],
                                        "departure_time": {
                                            "est": new Date().toISOString(),
                                            "act": new Date().toISOString()
                                        },
                                        "arrival_time": {
                                            "est": "2021-10-18T10:17:26.108226Z",
                                            "act": "2021-10-18T10:17:26.108226Z"
                                        }
                                    }
                                ],
                                "drops": [
                                    {
                                        "location": {
                                            "address": {
                                                "state": "Karnataka",
                                                "country": "India",
                                                "building": "Juspay Apartments",
                                                "door": "#817",
                                                "street": "27th Main",
                                                "locality": "8th Block Koramangala",
                                                "city": "Bangalore",
                                                "area_code": "560047"
                                            },
                                            "gps": { "lat": data.message.location.latitude, "lon": data.message.location.longitude }
                                        },
                                        "id": "",
                                        "transfers": [],
                                        "departure_time": {
                                            "est": new Date().toISOString(),
                                            "act": new Date().toISOString()
                                        },
                                        "arrival_time": {
                                            "est": "2021-10-18T10:17:26.108226Z",
                                            "act": "2021-10-18T10:17:26.108226Z"
                                        }
                                    }
                                ],
                                "fare": {
                                    "value": { "fractional": "50", "integral": "360" },
                                    "currency": "INR"
                                },
                                "payload": {
                                    "travellers": []
                                },
                                "tags": [{ "value": "108132.013", "key": "distance" }]
                            }
                        }

                    }
                )
                if(response.status === 200) {
                    await db.getDB().collection("ongoing").insertOne(
                        {
                            ...cachedData, nextStep: 'cabsSearch', dropLocation: `${data.message.location.latitude},${data.message.location.longitude}`, onSearchTrigger: response.data,
                            isCabSelected: false,
                            transaction_id: response.data.context.transaction_id,
                            message_id: response.data.context.message_id },
                    )
                    // await db.getDB().collection('ongoing').updateOne({
                    //     chat_id: data.message.chat.id
                    // }, {$set: {
                        
                    // }})
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Thank you so much!\n That’s all I need. I’m looking for cabs close to your pickup location. Please wait a few mins for me to send you a reply."
                    })
                }
            } else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a location! Please try again!"
                })
            }
            break
        case 'requestContact':
            if(data.message.contact !== undefined) {
                const savedData = await db.getDB().collection('ongoing').findOne({
                    chat_id: data.message.chat.id
                }, { sort: { $natural: -1 } })
                await db.getDB().collection('ongoing').updateOne({
                    _id: savedData._id
                }, { $set: {
                    contactResponse: data.message.contact
                } })
                replySender({
                    chat_id: data.message.from.id,
                    text: "Thanks for that!\nYou will be updated once the Driver is allocated!"
                })
            } else {
                replySender({
                    chat_id: data.message.from.id,
                    text: "That doesn't seem like a contact!\n\nLet's try again!\n\nPlease send your Contact details!",
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
                "domain": "nic2004:60221",
                "core_version": "0.8.2",
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
            confirmationResponse: response.data,
            isCabSelected: true
        } })
        redis.set(chat_id, JSON.stringify({
            chat_id: chat_id,
            initiatedCommand: '/bookcabs',
            nextStep: 'requestContact'
        }), (err, reply) => {
            if(err) {
                console.log(err)
            }
        })
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

const cancelBooking = async (data) => {
    try{
        const chat_id = data.callback_query.from.id
        const savedData = await db.getDB().collection('booked').findOne({
            chat_id: chat_id,
            inProgress: true
        }, { sort: { $natural: -1 } })
        const response = await axios.post(
            `${process.env.becknService}/trigger/cancel`,
            {
                "context": {
                    "domain": "nic2004:60221",
                    "core_version": "0.8.2",
                    "bpp_id": "https://mock_bpp.com/",
                    "bpp_uri": "https://beckn.free.beeceptor.com",
                    "transaction_id": savedData.transaction_id
                },
                "message": {
                    "order": {
                        "id": savedData.updateDriver.message.order.id
                    }
                }
            }
        )
        if (response.status === 200) {
            await db.getDB().collection('booked').updateOne({
                _id: savedData._id
            }, {
                $set: {
                    cancelResponse: response.data,
                    inProgress: false
                }
            })
            replySender({
                chat_id: chat_id,
                text: "Cancellation has been initiated!\n\nPlease wait for confirmation."
            })
        }
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
    handleBooking,
    confirmBooking,
    cancelBooking
}