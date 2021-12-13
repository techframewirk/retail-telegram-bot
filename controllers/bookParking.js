const redis = require('../utils/redis')
const replySender = require('./replySender')
const parkingSearchJSON = require('../requestJSONs/parking_search.json')
const axios = require('axios').default
const mongo = require('../utils/mongo')
const parkingConfirmJSON = require('../requestJSONs/parking_confirm.json')

const handleParking = async (cachedData, data) => {
    try {
        let message = {}
        let updatedCachedData = {}
        switch (cachedData.nextStep) {
            case 'booking_location':
                let timingsArray = []
                let currentTiming = new Date()
                const timingIntervals = parseInt(process.env.parkingTimingIntervals)
                const latitude = data.message.location.latitude
                const longitude = data.message.location.longitude
                do {
                    timingsArray.push(`${currentTiming.getHours()}:${currentTiming.getMinutes()}`)
                    currentTiming = new Date(currentTiming.getTime() + (timingIntervals * 60 * 1000))
                } while (currentTiming.getDate() == new Date().getDate())
                message = {
                    chat_id: data.message.chat.id,
                    text: "Please select a start time when you would like to use the parking space",
                    reply_markup: {
                        inline_keyboard: timingsArray.map(timing => {
                            return [{
                                text: timing,
                                callback_data: `bookparking-parkingtimeslotselect-${timing}`
                            }]
                        }),
                        "resize_keyboard": true,
                        "one_time_keyboard": true
                    }
                }
                updatedCachedData = {
                    ...cachedData,
                    nextStep: 'parking_timings',
                    latitude: latitude,
                    longitude: longitude
                }
                break
            case 'parking_reservation_time':
                const startDateTime = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), cachedData.selectedTime.split(':')[0], cachedData.selectedTime.split(':')[1])
                const endDateTime = new Date(startDateTime.getTime() + (parseInt(data.message.text) * 60 * 60 * 1000))
                console.log(cachedData)
                if (startDateTime.getDate() === endDateTime.getDate()) {
                    updatedCachedData = {
                        ...cachedData,
                        nextStep: 'booking_location',
                        startTime: startDateTime.getTime(),
                        endTime: endDateTime.getTime()
                    }
                    message = {
                        chat_id: data.message.chat.id,
                        text: `You have selected to book the parking for ${data.message.text} hours starting from ${startDateTime.toLocaleString()} to ${endDateTime.toLocaleString()}`,
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: 'Confirm',
                                    callback_data: `bookparking-finalizeTimings`
                                }]
                            ],
                            "resize_keyboard": true,
                            "one_time_keyboard": true
                        }
                    }
                } else {
                    message = {
                        chat_id: data.message.chat.id,
                        text: `Sorry.\nReservation End Time is ${endDateTime.toLocaleString()} Parking spaces can be reserved until the end of day only. (i.e., 11:59 PM)`,
                    }
                }
                break
            case 'recordname':
                const vehicleNumber = data.message.text
                await mongo.getDB().collection('ongoing').updateOne({
                    chat_id: data.message.chat.id
                }, {
                    $set: {
                        vehicleNumber: vehicleNumber
                    }
                })
                message = {
                    chat_id: data.message.chat.id,
                    text: `Please send your number!`,
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
                }
                updatedCachedData = {
                    ...cachedData,
                    nextStep: 'recordnumber'
                }
                break
            case 'recordnumber':
                console.log(data)
                const contactNumber = data.message.contact.phone_number
                await mongo.getDB().collection('ongoing').updateOne({
                    chat_id: data.message.chat.id
                }, {
                    $set: {
                        contactNumber: contactNumber,
                        recordName: `${data.message.contact.first_name} ${data.message.contact.last_name}`,
                        awaitingConfirmation: true
                    }
                })
                const savedData = await mongo.getDB().collection('ongoing').findOne({
                    chat_id: data.message.chat.id
                })
                const response = await axios.post(
                    `${process.env.becknService}/trigger/confirm`,
                    {
                        "context": {
                            "domain": "nic2004:63031",
                            "core_version": "0.9.3",
                            "bpp_id": "35.200.188.6",
                            "bpp_uri": "http://35.200.188.6/rest/V1/beckn/",
                            "transaction_id": savedData.transaction_id,
                        },
                        "message": {
                            "order": {
                                "provider": {
                                    "locations": [
                                        {
                                            "id": savedData.selectedParkingSpot.locationId,
                                        }
                                    ]
                                },
                                "items": [
                                    {
                                        "id": savedData.selectedParkingSpot.itemId,
                                        "quantity": {
                                            "count": 1
                                        }
                                    }
                                ],
                                "billing": {
                                    "name": savedData.recordName,
                                    "phone": savedData.contactNumber,
                                },
                                "fulfillment": {
                                    "start": {
                                        "time": {
                                            "timestamp": new Date(savedData.startTime).toISOString()
                                        }
                                    },
                                    "end": {
                                        "time": {
                                            "timestamp": new Date(savedData.endTime).toISOString()
                                        }
                                    },
                                    "vehicle": {
                                        "registration": savedData.vehicleNumber
                                    }
                                }
                            }
                        }
                    }
                )
                if(response.status === 200) {
                    await mongo.getDB().collection('ongoing').updateOne({
                        chat_id: data.message.chat.id
                    }, {
                        $set: {
                            confirmationRequestResponse: response.data,
                            awaitingConfirmation: true,
                            message_id: response.data.context.message_id
                        }
                    })
                    message = {
                        chat_id: data.message.chat.id,
                        text: `Thank you!\nPlease wait for confirmation!`,
                    }
                }
                break
        }
        redis.set(data.message.from.id, JSON.stringify(updatedCachedData), (err, reply) => {
            if (err) {
                throw err
            } else {
                replySender(message)
            }
        })
    } catch (error) {
        console.log(error)
        throw err  
    }
}

// Handle Callback when a button is clicked
const handleCallbackQuery = async (data, callbackData) => {
    try {
        switch(callbackData) {
            case 'parkingtimeslotselect':
                const selectedTime = data.callback_query.data.split('-')[2]
                let cachedData = {}
                redis.get(data.callback_query.from.id, (err, reply) => {
                    if (err) {
                        throw err
                    } else {
                        cachedData = JSON.parse(reply)
                        redis.set(data.callback_query.from.id, JSON.stringify({
                            latitude: cachedData.latitude,
                            longitude: cachedData.longitude,
                            chat_id: data.callback_query.from.id,
                            initiatedCommand: '/bookparking',
                            selectedTime: selectedTime,
                            nextStep: 'parking_reservation_time'
                        }), (err, reply) => {
                            if (err) {
                                throw err
                            } else {
                                replySender({
                                    "chat_id": data.callback_query.from.id,
                                    "text": "For how many hours would the parking need to be reserved?"
                                })
                            }
                        }
                        )
                    }
                })
                break
            case 'finalizeTimings':
                redis.get(data.callback_query.from.id, async (err, reply) => {
                    if(err) {
                        throw err
                    } else {
                        const cachedData = JSON.parse(reply)
                        const requestBody = {
                            context: parkingSearchJSON.context,
                            message: {
                                intent: {
                                    provider: {
                                        locations: [{
                                            gps: `${cachedData.latitude}, ${cachedData.longitude}`
                                        }]
                                    },
                                    fulfillment: {
                                        start: {
                                            time: {
                                                timestamp: new Date(cachedData.startTime).toISOString()
                                            }
                                        },
                                        end: {
                                            time: {
                                                timestamp: new Date(cachedData.endTime).toISOString()
                                            },
                                            location: {
                                                gps: `${cachedData.latitude}, ${cachedData.longitude}`
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        const response = await axios.post(
                            `${process.env.becknService}/trigger/search`,
                            requestBody
                        )
                        if(response.status === 200) {
                            await mongo.getDB().collection('ongoing').insertOne({
                                chat_id: data.callback_query.from.id,
                                initiatedCommand: cachedData.initiatedCommand,
                                nextStep: 'confirmParkingSpot',
                                parkingLocationRequested: cachedData.latitude + ', ' + cachedData.longitude,
                                startTime: cachedData.startTime,
                                endTime: cachedData.endTime,
                                searchTriggerRequestBody: requestBody,
                                searchTriggerResponseBody: response.data,
                                message_id: response.data.context.message_id,
                                isResolved: false,
                                transaction_id: response.data.context.transaction_id
                            })
                            redis.set(data.callback_query.from.id, JSON.stringify({
                                chat_id: data.callback_query.from.id,
                                initiatedCommand: cachedData.initiatedCommand,
                                nextStep: 'confirmParkingSpot',
                            }), (err, reply) => {
                                if(err) {
                                    throw err
                                } else {
                                    replySender({
                                        "chat_id": data.callback_query.from.id,
                                        "text": "Your parking reservation has been successfully made.\nPlease wait for the Payment Link from the parking provider."
                                    })
                                }
                            } )
                            
                        }
                    }
                })
                break
            case 'selectparkingslot':
                const locationId = data.callback_query.data.split('-')[2]
                const itemId = data.callback_query.data.split('-')[3]
                await mongo.getDB().collection('ongoing').updateOne({
                    chat_id: data.callback_query.from.id
                }, {
                    $set: {
                        isResolved: true,
                        selectedParkingSpot: {
                            locationId: locationId,
                            itemId: itemId
                        }
                    }
                })
                redis.set(data.callback_query.from.id, JSON.stringify({
                    chat_id: data.callback_query.from.id,
                    initiatedCommand: '/bookparking',
                    nextStep: 'recordname',
                }), (err, reply) => {
                    if(err) {
                        throw err
                    } else {
                        replySender({
                            "chat_id": data.callback_query.from.id,
                            "text": "Send Your Vehicle number for reservation!"
                        })
                    }
                })
                // const requestBody = {
                //     context: {
                //         ...parkingConfirmJSON.context,
                //         transaction_id: savedDoc.transaction_id,
                //     },
                //     message: {
                //         order: {
                //             provider: {
                //                 locations: [{
                //                     id: locationId
                //                 }]
                //             },
                //             items: [{
                //                 id: itemId,
                //                 quantity: {
                //                     count: 1
                //                 }
                //             }],
                //             billing: {
                //                 name: "Name", // To Do
                //                 phone: "8585858585"
                //             },
                //             fulfillment: {
                //                 start: {
                //                     time: {
                //                         timestamp: new Date(savedDoc.startTime).toISOString()
                //                     }
                //                 },
                //                 end: {
                //                     time: {
                //                         timestamp: new Date(savedDoc.endTime).toISOString()
                //                     },
                //                 },
                //                 vehicle: {
                //                     registration: "CH01DD7785"
                //                 }
                //             }
                //         }
                //     }
                // }
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