const redis = require('../utils/redis')
const replySender = require('./replySender')

const handleParking = async (cachedData, data) => {
    try {
        switch (cachedData.nextStep) {
            case 'booking_location':
                console.log("Book parking file")
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Do you want to book now or for later?",
                    reply_markup: {
                        inline_keyboard: [
                            [{
                                text: "Now",
                                callback_data: `${data.message.chat.id}_booklocationnow`
                            }],
                            [{
                                text: "Later",
                                callback_data: `${data.message.chat.id}_booklocationnow`
                            }]
                        ],
                        "resize_keyboard": true,
                        "one_time_keyboard": true
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
    handleParking
}