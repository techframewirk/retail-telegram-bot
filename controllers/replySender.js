const axios = require('axios').default

const replySender = async (data) => {
    try {
        const response = await axios.post(
            `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
            data
        )
    } catch (err) {
        console.log(err);
        throw err
    }
}

module.exports = replySender