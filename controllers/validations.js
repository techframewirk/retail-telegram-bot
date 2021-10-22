const start = require('./start')

const validateLocationData = async (data) => {
    const tempData = data.message.location
    console.log(typeof (tempData))
    if (tempData !== undefined) {
        return true
    } else {
        // const message = {
        //     chat_id: data.message.chat.id,
        //     text: "That was not a location! Please try again!"
        // }
        // await start.replySender(message)
        return false
    }
}

module.exports = {
    validateLocationData
}