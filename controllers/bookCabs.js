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
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Thank you so much!\n That’s all I need. I’m looking for cabs close to your pickup location. Please wait a few mins for me to send you a reply."
                })
            }
            break
    }
}

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

module.exports = handleBooking