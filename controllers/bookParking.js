const redis = require('../utils/redis')
const replySender = require('./replySender')

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
                redis.get(data.callback_query.from.id, (err, reply) => {
                    if(err) {
                        throw err
                    } else {
                        const cachedData = JSON.parse(reply)
                        console.log(cachedData)
                    }
                })
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