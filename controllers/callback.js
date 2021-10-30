const db = require('../utils/mongo')
const axios = require('axios').default
const redis = require('../utils/redis')

const callBackController = async (req, res, next) => {
    try{
        const data = req.body
        switch(data.context.action) {
            case 'on_search':
                const savedData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id
                })
                console.log(savedData.onSearchTriggerResult)
                await db.getDB().collection('ongoing').updateOne({
                    _id: savedData._id
                }, { $set: {
                    onSearchTriggerResult: savedData.onSearchTriggerResult === undefined? [data] : [...savedData.onSearchTriggerResult, data]
                }})
                let cabs = []
                data.message.catalog.items.forEach(cabData => {
                    cabs.push({
                        chat_id: savedData.chat_id,
                        text: `Name => ${cabData.descriptor.code}\nPrice => Rs.${cabData.price.value.integral}`,
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: "Book",
                                    callback_data: `bookCab-${cabData.id}`
                                }]
                            ],
                            "resize_keyboard": true,
                            "one_time_keyboard": true
                        }
                    })
                })
                await cabs.forEach(async cab => {
                    await replySender(cab)
                })
                break
            case 'on_update':
                const savedData1 = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id
                })
                await db.getDB().collection('booked').insertOne({
                    ...savedData1, updateDriver: data, inProgress: true
                })
                db.getDB().collection('ongoing').deleteOne({
                    _id: savedData1._id
                })
                replySender({
                    chat_id: savedData1.chat_id,
                    text: `The driver has been allocated!\nName: ${data.message.order.trip.driver.name.given_name} ${data.message.order.trip.driver.name.family_name}\nPhone:${data.message.order.trip.driver.phones[0]}\nPrice: Rs.${data.message.order.trip.fare.value.integral}\n\nFind the Tracking link below:\n${data.context.bpp_uri}v1/location?caseId=${data.message.order.trip.id}`
                })
                break
            case 'on_cancel':
                const savedData2 = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id
                })
                await db.getDB().collection('booked').updateOne({
                    _id: savedData2._id
                }, { $set: {
                    onCancelTriggerResult: data,
                    inProgress: false
                }})
                replySender({
                    chat_id: savedData2.chat_id,
                    text: `Your booking has been cancelled!\nReason: ${data.message.order.cancellation_reason_id}`
                })
                break
        }
        res.status(200).json({
            'status': 'ok'
        })
    } catch (err) {
        console.log(err)
        next(err)
    }
}

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

module.exports = callBackController