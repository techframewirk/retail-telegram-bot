const db = require('../utils/mongo')
const axios = require('axios').default
const redis = require('../utils/redis')

const callBackController = async (req, res, next) => {
    try{
        const data = req.body
        switch(data.context.action) {
            case 'on_search':
                const savedData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id,
                    isResolved: false
                })
                if(savedData != null) {
                    await db.getDB().collection('ongoing').updateOne({
                        _id: savedData._id
                    }, {
                        $set: {
                            onSearchTriggerResult: savedData.onSearchTriggerResult === undefined ? [data] : [...savedData.onSearchTriggerResult, data]
                        }
                    })
                    if (data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark') !== undefined || data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark') !== null ) {
                        const resultDocument = data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark')
                        let parkingSpaces = resultDocument.items.map(item => {
                            return {
                                chat_id: savedData.chat_id,
                                text: `Name => ${item.descriptor.name}\nPrice => Rs.${item.price.value}\nQuantity Available:${item.quantity.available.count}`,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{
                                            text: "Book",
                                            callback_data: `bookparking-selectparkingslot-${item.location_id}-${item.id}`
                                        }]
                                    ],
                                    "resize_keyboard": true,
                                    "one_time_keyboard": true
                                }
                            }
                        })
                        parkingSpaces.forEach(parkingSpace => {
                            replySender(parkingSpace)
                        })
                        await db.getDB().collection('ongoing').updateOne({
                            _id: savedData._id
                        }, {
                            $set: {
                                parkingResponse: data,
                                parkingLocations: data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark').locations,
                                parkingLocations: data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark').items
                            }
                        })
                    } else {
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
                    }
                } else {
                    console.log('Cab Already Booked!')
                }
                break
            case 'on_confirm':
                const bookingData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id,
                    awaitingConfirmation: true
                })
                if(bookingData != null) {
                    const message = {
                        chat_id: bookingData.chat_id,
                        text: `Payment Amount:${data.message.order.payment.params.amount}\n\nPlease pay using the below link to confirm Parking Spot!\n\n\n${data.message.order.payment.uri}`
                    }
                    await replySender(message)
                    await db.getDB().collection('ongoing').updateOne({
                        _id: bookingData._id
                    }, {
                        $set: {
                            awaitingConfirmation: false,
                            paymentConfirmation: data
                        }
                    })
                }
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