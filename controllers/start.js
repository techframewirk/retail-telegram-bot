const axios = require('axios').default
const commands = require('../commands.json')
const redis = require('../utils/redis')
const arrayConvert = require('../utils/arrayConvert')
const bookCabs = require('./bookCabs')
const db = require('../utils/mongo')
const wonderlaTicket = require('./wonderlaTicket');

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
        console.log(typeof (data.message.entities) != 'undefined');
        if(data.message != undefined) {
            if (typeof (data.message.entities) != 'undefined') {
                if (data.message.entities[0].type == 'bot_command') {
                    redis.del(data.message.from.id)
                    switch (data.message.text) {
                        case '/bookcabs':
                            redis.set(data.message.from.id, JSON.stringify({
                                chat_id: data.message.chat.id,
                                initiatedCommand: '/bookcabs',
                                nextStep: 'pickupLocation'
                            }), (err, reply) => {
                                if(err) {
                                    throw err
                                } else {
                                    // // Old
                                    // replySender({
                                    //     chat_id: data.message.chat.id,
                                    //     text: "I am glad to book a cab for you!\nPlease help me by sending the pickup location."
                                    // })

                                    // New
                                    replySender({
                                        chat_id: data.message.chat.id,
                                        text: "I am glad to book a cab for you!\nWhere do you want to book your ride from?"
                                    })
                                }
                            })
                            break
                        case '/cancelbooking':
                            let activeBookings = []
                            let activeBookingMessages = []
                            const activeBookingsCursor = await db.getDB().collection('booked').find({
                                inProgress: true
                            })
                            await activeBookingsCursor.forEach(async (doc) => {
                                activeBookings.push(doc)
                            })
                            activeBookingMessages = activeBookings.map(booking => {
                                return {
                                    chat_id: booking.chat_id,
                                    text: `Cab Booking\n\nCar:${booking.updateDriver.message.order.trip.vehicle.color} ${booking.updateDriver.message.order.trip.vehicle.variant} - ${booking.updateDriver.message.order.trip.vehicle.registration.number}`,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{
                                                text: "Cancel",
                                                callback_data: `cancelCabBooking-${booking._id}`
                                            }]
                                        ],
                                        "resize_keyboard": true,
                                        "one_time_keyboard": true
                                    }
                                }
                            })
                            activeBookingMessages.forEach(async (message) => {
                                await replySender(message)
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
                            break
                        case '/wonderlaticket':
                            redis.set(data.message.from.id, JSON.stringify({
                                chat_id: data.message.chat.id,
                                initiatedCommand: '/wonderlaticket',
                                nextStep: wonderlaTicket.steps.selectLocation
                            }), (err, reply) => {
                                if(err) {
                                    throw err
                                } else {
                                    replySender({
                                        "chat_id": data.message.chat.id,
                                        "text": wonderlaTicket.messages.selectLocation
                                    })
                                }
                            })
                    }
                }
            } else {
                redis.get(data.message.from.id, async (err, reply) => {
                    if (err) {
                        throw err
                    } else {
                        const cachedData = JSON.parse(reply)
                        if(cachedData != null) {
                            switch (cachedData.initiatedCommand) {
                                case '/bookcabs':
                                    await bookCabs.handleBooking(cachedData, data)
                                    break

                                case '/wonderlaticket':
                                    await wonderlaTicket.handleBooking(cachedData, data)
                                    break
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
            const type = data.callback_query.data.split('-')[0]
            const callbackData = data.callback_query.data.split('-')[1]
            switch(type) {
                case 'bookCab':
                    bookCabs.confirmBooking(data, callbackData)
                    break
                case 'cancelCabBooking':
                    bookCabs.cancelBooking(data, callbackData)
                    break
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