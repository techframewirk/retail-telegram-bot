const db = require('../utils/mongo')
const axios = require('axios').default
const redis = require('../utils/redis')
const imageUtils = require('./../utils/imageUtils');
const replySender = require('./replySender');
const replySenderWithImage = require('./replySenderWithImage')
const replySenderWithImageFromPath = require('./replySenderWithImageFromPath')
const path=require('path');

const callBackController = async (req, res, next) => {
    try {
        const data = req.body
        console.log("Getting Callback....!");
        await db.getDB().collection('callbacks').insertOne(data)
        switch (data.context.action) {
            case 'on_search':
                // For Fetching saved data.
                const savedData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id,
                    isResolved: false
                })
                if (savedData != null) {
                    // TODO: update with each item extracted data.
                    // await db.getDB().collection('ongoing').updateOne({
                    //     _id: savedData._id
                    // }, {
                    //     $set: {
                    //         onSearchTriggerResult: savedData.onSearchTriggerResult === undefined ? [data] : [...savedData.onSearchTriggerResult, data]
                    //     }
                    // })

                    // When Data is found in mongo.
                    if ((data.context.domain == domains.retail_call) || (data.context.domain == domains.retail_recieve)) {
                        const bpp_providers = data.message.catalog['bpp/providers'];
                        const itemDetails = [];
                        bpp_providers.forEach((providerData) => {
                            const locationData = providerData['locations'];
                            const shopDetails = providerData['descriptor'];

                            providerData.items.forEach((itemData) => {
                                itemDetails.push({
                                    ...itemData, retail_location: locationData, retail_decriptor: shopDetails
                                });
                            });
                        });

                        itemDetails.forEach(async (itemData) => {
                            replySenderWithImageFromPath({
                                chat_id:savedData.chat_id,
                                text:JSON.stringify(itemData.retail_location),
                                reply_markup: JSON.stringify({
                                    inline_keyboard: [
                                        [{
                                            text: "Book",
                                            callback_data: "NOT Much..."
                                        }]
                                    ],
                                    "resize_keyboard": true,
                                    "one_time_keyboard": true
                                })
                            }, path.resolve("public/testImages/forTesting.jpg"))
                        });
                    }
                    else {
                        console.log("Data from Unknown Domain...");
                    }
                } else {
                    // When Data is not found in mongo.
                }
                break
            case 'on_confirm':
                break;
            case 'on_update':
                break
            case 'on_cancel':
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

const domains = {
    cabs: "nic2004:60221",
    parking: "nic2004:63031",
    metros: "nic2004:60212",
    retail_call: "nic2004:52110",
    retail_recieve: "nic2021:52110"
}

module.exports = callBackController