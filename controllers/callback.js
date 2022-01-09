const db = require('../utils/mongo')
const { ObjectID } = require('mongodb')
const axios = require('axios').default
const redis = require('../utils/redis')
const ioredis = require('../utils/ioredis')
const imageUtils = require('./../utils/imageUtils');
const replySender = require('./replySender');
const replySenderWithImage = require('./replySenderWithImage')
const replySenderWithImageFromPath = require('./replySenderWithImageFromPath')
const path = require('path');
const retail = require('./retail')
const callbackUtils = require('./../utils/callback')

const callBackController = async (req, res, next) => {
    try {
        const data = req.body
        console.log("Getting Callback....!");
        await db.getDB().collection('callbacks').insertOne(data)
        switch (data.context.action) {
            case 'on_search': {
                // For Fetching saved data.
                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id,
                    isResolved: false
                })
                if ((savedData) && (data.context.domain == domains.retail_call) || (data.context.domain == domains.retail_recieve)) {
                    // When Data is found in mongo.
                    const bpp_providers = data.message.catalog['bpp/providers'];
                    let itemDetails = [];

                    const chat_id = savedData.chat_id;
                    // if cache queue is empty use print the current items.
                    const toDisplayItems = (await ioredis.llen("chat_id" + chat_id)) == 0;

                    const transactionId = savedData.transaction_id;
                    bpp_providers.forEach((providerData) => {
                        const locationData = providerData['locations'];
                        const shopDetails = providerData['descriptor'];
                        const providerId = providerData['id'];
                        const bppId = data.context.bpp_id;
                        const bppURI = data.context.bpp_uri;
                        const providerUniqueId = retail.createProviderId({
                            bpp_id: bppId,
                            providerId: providerId
                        });

                        providerData.items.forEach((itemData) => {

                            const itemUniqueId = ObjectID();
                            const itemDetail = {
                                ...itemData,
                                retail_location: locationData,
                                retail_decriptor: shopDetails,
                                provider_unique_id: providerUniqueId,
                                provider_id: providerId,
                                bpp_id: bppId,
                                bpp_uri: bppURI,
                                item_unique_id: itemUniqueId,
                                _id: itemUniqueId,
                            };

                            itemDetails.push(itemDetail);
                        });
                    });

                    itemDetails.forEach(async (itemData) => {
                        await db.getDB().collection('ongoing').updateOne({
                            _id: savedData._id
                        }, {
                            $addToSet: {
                                items: itemData
                            }
                        })
                    });

                    itemDetails.forEach(async (itemData) => {
                        await ioredis.rpush("chat_id" + chat_id, JSON.stringify(itemData));
                    });

                    if ((toDisplayItems)&&(itemDetails.length)) {
                        // TODO: pass the language.
                        const cachedData=JSON.parse(await ioredis.get(chat_id));
                        retail.sendItemMessage(chat_id, transactionId, cachedData.language);
                    }

                    console.log(await ioredis.llen("chat_id" + chat_id))
                } else {
                    // When Data is not found in mongo.
                }
            }
                break
            case 'on_select': {
                console.log(data.context.bpp_id)
                const currQouteData = data.message.order.quote;
                await db.getDB().collection('ongoing').updateOne({
                    transaction_id: data.context.transaction_id
                }, {
                    $addToSet: {
                        onSelectCallbacks: data,
                        qoutes: currQouteData
                    }
                });

                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id,
                    isResolved: false
                });

                if (savedData == null) {
                    break;
                }

                const reqLength = Object.keys(savedData.selecteditemsOnProviders).length;
                if (reqLength > savedData.onSelectCallbacks.length) {
                    console.log("Waiting for more callbacks.")
                    break;
                }

                // console.log(JSON.stringify(data))

                // This will only execute if we have enough callbacks on the db.
                const chat_id = savedData.chat_id;
                redis.get(chat_id, async (err, reply) => {
                    if (err) {
                        replySender({
                            chat_id: chat_id,
                            text: retail.msgs(retail.languages.english).something_went_wrong
                        });
                        console.log(err)
                    }
                    else {
                        const cachedData = JSON.parse(reply)
                        // checking whether next step is wait for quote callback or not.
                        if (cachedData.nextStep != retail.steps.waitForQouteCallback) {
                            // Returning because current step is not wait for qoute callback.
                            return;
                        }

                        let qouteText = "Your Order.\n";
                        const allQoutes = savedData.qoutes;
                        let totalCost = 0;
                        allQoutes.forEach((qoute) => {
                            qoute.breakup.forEach((itemData) => {
                                qouteText += "\n*" + itemData.title + "*\n";
                                qouteText += "Cost : *Rs. " + itemData.price.value + "*\n";
                            });
                            totalCost += parseFloat(qoute.price.value)
                        });
                        qouteText += "\nTotal : *Rs. " + totalCost + "*\n";
                        qouteText += "\nPlease Enter billing details to proceed further.\n";
                        qouteText += retail.msgs(cachedData.language).billing_name;

                        replySender({
                            chat_id: chat_id,
                            text: qouteText
                        })

                        // Changing the next step to billing_name.    
                        cachedData['nextStep'] = retail.steps.billing_name;
                        redis.set(chat_id, JSON.stringify(cachedData));
                    }
                })
            }
                break;
            case 'on_init': {
                console.log(data.context.bpp_id)
                // console.log(JSON.stringify(data))
                const currOrder = data.message.order;
                const providerUniqueId = retail.createProviderId({
                    bpp_id: data.context.bpp_id,
                    providerId: currOrder.provider.id
                })

                const currPaymentData = currOrder.payment;
                await db.getDB().collection('ongoing').updateOne({
                    transaction_id: data.context.transaction_id
                }, {
                    $addToSet: {
                        onInitCallbacks: data,
                        payments: { ...currPaymentData, provider_unique_id: providerUniqueId },
                        orders: currOrder
                    }
                });

                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id,
                    isResolved: false
                });

                if (savedData == null) {
                    break;
                }

                const reqLength = Object.keys(savedData.selecteditemsOnProviders).length;
                if (reqLength > savedData.onInitCallbacks.length) {
                    console.log("Waiting for more callbacks.")
                    break;
                }


                const chat_id = savedData.chat_id;
                redis.get(chat_id, async (err, reply) => {
                    if (err) {
                        replySender({
                            chat_id: chat_id,
                            text: retail.msgs(retail.languages.english).something_went_wrong
                        });
                        console.log(err)
                    }
                    else {
                        const cachedData = JSON.parse(reply)
                        if (!cachedData) {
                            return;
                        }

                        
                        // We are returning now because here the next step should be to wait for init callback.
                        if(cachedData.nextStep!=retail.steps.waitForInitCallback){
                            return;
                        }

                        let paymentText = "Please Confirm your order.\n";
                        paymentText += "\n*Costings*\n";

                        let currItemIdx = 1;
                        const allOrders = savedData.orders;
                        let totalCost = 0;
                        allOrders.forEach((orderInfo) => {
                            orderInfo.quote.breakup.forEach((breakupItem) => {
                                paymentText += "\n*" + currItemIdx + "*";
                                paymentText += "\n*" + breakupItem.title + "*";
                                paymentText += "\nCost: *Rs. " + breakupItem.price.value + "*\n";
                                currItemIdx++;
                            });

                            const paymentData = orderInfo.payment;
                            totalCost += parseFloat(paymentData.params.amount);
                        });


                        paymentText += "\nAmount: *Rs. " + totalCost;
                        paymentText += "*\n\nPayment Method: *Cash on Delivery.*";

                        const reply_markup = {
                            inline_keyboard: [
                                [
                                    {
                                        text: retail.btnTxts(cachedData.language).cancel,
                                        callback_data: callbackUtils.encrypt({
                                            type: 'retail',
                                            commandType: retail.callbackTypes.cancelConfirm,
                                            id: savedData.transaction_id
                                        })
                                    },
                                    {
                                        text: retail.btnTxts(cachedData.language).confirm,
                                        callback_data: callbackUtils.encrypt({
                                            type: 'retail',
                                            commandType: retail.callbackTypes.confirmOrder,
                                            id: savedData.transaction_id
                                        })
                                    }
                                ]
                            ],
                            "resize_keyboard": true,
                            "one_time_keyboard": true
                        };
                        replySender({
                            chat_id: chat_id,
                            text: paymentText,
                            reply_markup: reply_markup
                        });

                        cachedData['nextStep'] = retail.steps.stateOrderConfirmation;
                        redis.set(chat_id, JSON.stringify(cachedData));
                    }
                })

            }
                break;
            case 'on_confirm':
                {
                    console.log(data.context.bpp_id)
                    // Save this data in onConfirmCallbacks of ongoing.
                    await db.getDB().collection('ongoing').updateOne({
                        transaction_id: data.context.transaction_id
                    }, {
                        $addToSet: {
                            onConfirmCallbacks: data,
                        }
                    });

                    const messageId = data.context.message_id;
                    const shortOrderId = ObjectID();
                    // Send message with data, track and status
                    const transactionId = data.context.transaction_id;
                    const savedData = await db.getDB().collection('ongoing').findOne({
                        transaction_id: transactionId,
                        isResolved: false
                    });

                    const chat_id = savedData.chat_id;
                    
                    // Save this confirm orders in the other db called confirm_orders.
                    await db.getDB().collection('confirmed_orders').insertOne({
                        ...data,
                        order_id: data.message.order.id,
                        message_id: messageId,
                        short_order_id: shortOrderId,
                        chat_id:chat_id
                    })

                    if (data.error) {
                        replySender({
                            chat_id: chat_id,
                            text: "*Order Confirmation Failed.*\n" + data.error.message
                        });
                        return;
                    }

                    if (savedData == null) {
                        break;
                    }

                    redis.get(chat_id, async (err, reply) => {
                        if (err) {
                            replySender({
                                chat_id: chat_id,
                                text: retail.msgs(retail.languages.english).something_went_wrong
                            });
                            console.log(err)
                        }
                        else {
                            const cachedData = JSON.parse(reply)
                            if (!cachedData) {
                                return;
                            }

                            // // TODO: Test in production.
                            // // We are returning from here because the next step is not wait for confirm callback.
                            // if(cachedData.nextStep!=retail.steps.waitForConfirmCallback){
                            //     return;
                            // }

                            const orderId = data.message.order.id;
                            const orderState = data.message.order.state;
                            const orderInfo = data.message.order;

                            let orderText = "*Order Confirmation*\n";
                            orderText += "\nOrder Id: *" + orderId + "*\n";
                            orderText += "\n*Costings*\n";

                            let currItemIdx = 1;
                            orderInfo.quote.breakup.forEach((breakupItem) => {
                                orderText += "\n*" + currItemIdx + "*";
                                orderText += "\n*" + breakupItem.title + "*";
                                orderText += "\nCost: *Rs. " + breakupItem.price.value + "*\n";
                                currItemIdx++;
                            });

                            orderText += "\nTotal Amount: *Rs. " + orderInfo.quote.price.value + "*\n";
                            orderText += "\nThanks for shopping with us.\n"

                            const reply_markup = {
                                inline_keyboard: [
                                    [
                                        {
                                            text: retail.btnTxts(cachedData.language).trackOrder,
                                            callback_data: callbackUtils.encrypt({
                                                type: 'retail',
                                                commandType: retail.callbackTypes.trackOrder,
                                                id: shortOrderId
                                            })
                                        },
                                        {
                                            text: retail.btnTxts(cachedData.language).ordeStatus,
                                            callback_data: callbackUtils.encrypt({
                                                type: 'retail',
                                                commandType: retail.callbackTypes.orderStatus,
                                                id: shortOrderId
                                            })
                                        }
                                    ]
                                ],
                                "resize_keyboard": true,
                                "one_time_keyboard": true
                            };

                            replySender({
                                chat_id: chat_id,
                                text: orderText,
                                reply_markup: JSON.stringify(reply_markup)
                            });

                        }
                    })

                    // We remove this flow data completely from ongoing when onConfirmCallback is enough.
                    const reqLength = Object.keys(savedData.selecteditemsOnProviders).length;
                    if (reqLength > savedData.onConfirmCallbacks.length) {
                        console.log("Waiting for more callbacks.")
                        break;
                    }

                    await db.getDB().collection('ongoing').deleteOne({
                        _id: savedData._id
                    })

                    savedData['_id'] = undefined;
                    await db.getDB().collection('completed').insertOne({
                        ...savedData
                    })
                }

                break
            case 'on_track':
                try {
                    const savedData = await db.getDB().collection('confirmed_orders').findOne({
                        transaction_id: data.context.transaction_id,
                    });

                    const orderId = savedData.message.order.id;
                    let trackText = "*Order Tracking*\n";
                    trackText += "\nOrder ID: *" + orderId + "*\n";
                    trackText += "\nUse this link to track your order.\n";
                    trackText += data.message.tracking.url + "\n";
                    trackText += "\nStatus: *" + data.message.tracking.status + "*"

                    replySender({
                        chat_id: savedData.chat_id,
                        text: trackText
                    });
                } catch (error) {
                    console.log(error)
                }

                break
            case 'on_status':
                try {
                    const orderId = data.message.order.id;
                    // console.log(JSON.stringify(data))
                    const savedData = await db.getDB().collection('confirmed_orders').findOne({
                        order_id: orderId,
                    });

                    const orderState = data.message.order.state;
                    const paymentInfo = data.message.order.payment;

                    let statusText = "*Order Status*\n";
                    statusText += "\nOrder ID: *" + orderId + "*\n";
                    statusText += "\nStatus: *" + orderState + "*\n";

                    try {
                        const fulfillmentState = data.message.order.fulfillment.state;
                        if (fulfillmentState) {
                            statusText += "\n*Fulfillment Info*\n";
                            statusText += "Name: *" + fulfillmentState.descriptor.name + "*\n";
                            statusText += "Code: *" + fulfillmentState.descriptor.code + "*\n";
                        }
                    } catch (error) {
                        console.log(error)
                    }

                    statusText += "\n*Payment*\n";
                    statusText += "Amount: *Rs. " + paymentInfo.params.amount + "*\n";
                    statusText += "Status: *" + paymentInfo.status + "*";

                    replySender({
                        chat_id: savedData.chat_id,
                        text: statusText
                    });

                } catch (error) {
                    console.log(error)
                }
                break
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