const start = require('./start')

const validateLocationData = async (data) => {
    const tempData = data.message.location
    console.log(typeof (tempData))
    if (tempData !== undefined) {
        return true
    } else {
        return false
    }
}

module.exports = {
    validateLocationData
}