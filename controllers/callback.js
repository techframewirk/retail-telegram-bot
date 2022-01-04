const db = require('../utils/mongo')
const axios = require('axios').default
const redis = require('../utils/redis')
const replySender = require('./replySender');
const replySenderWithImage = require('./replySenderWithImage')

const callBackController = async (req, res, next) => {
    try {
        const data = req.body
        await db.getDB().collection('callbacks').insertOne(data)
        switch (data.context.action) {
            case 'on_search':
                // For Fetching saved data.
                const savedData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id,
                    isResolved: false
                })
                if (savedData != null) {
                    await db.getDB().collection('ongoing').updateOne({
                        _id: savedData._id
                    }, {
                        $set: {
                            onSearchTriggerResult: savedData.onSearchTriggerResult === undefined ? [data] : [...savedData.onSearchTriggerResult, data]
                        }
                    })

                    // When Data is found in mongo.
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
    retail: "nic2021:52110"
}

module.exports = callBackController