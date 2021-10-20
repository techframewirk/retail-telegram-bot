const axios = require('axios').default

const setWebhook = async () => {
    try{
        const response = await axios.post(
            `https://api.telegram.org/bot${process.env.telegramToken}/setWebhook`,
            {
                url: `${process.env.telegramWebhook}/${process.env.telegramToken}`
            }
        )
        if(response.status === 200) {
            console.log(`${process.env.telegramWebhook}/${process.env.telegramToken}`)
            console.log("Webhook has been updated!")
        }
    } catch (err) {
        console.log(err)
    }
}

const webhookController = async (req, res, next) => {
    try{
        console.log(req.body)
        res.status(200).json({
            "status": "ok"
        })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    setWebhook,
    webhookController
}