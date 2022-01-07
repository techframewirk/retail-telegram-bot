const db = require('../utils/mongo')
const {ObjectID} =require('mongodb')
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
                    message_id: data.context.message_id,
                    isResolved: false
                })
                if ((savedData)&&(data.context.domain == domains.retail_call) || (data.context.domain == domains.retail_recieve)) {
                    // When Data is found in mongo.
                    const bpp_providers = data.message.catalog['bpp/providers'];
                    let itemDetails = [];

                    let toDisplayItems = false;
                    if (!savedData.items) {
                        toDisplayItems = true;
                    }

                    const chat_id=savedData.chat_id;
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
                            const itemUniqueId = retail.createItemId({
                                bpp_id: bppId,
                                providerId: providerId,
                                itemId: itemData.id
                            });
                            const itemDetail = {
                                ...itemData,
                                retail_location: locationData,
                                retail_decriptor: shopDetails,
                                provider_unique_id: providerUniqueId,
                                provider_id: providerId,
                                bpp_id: bppId,
                                bpp_uri: bppURI,
                                item_unique_id: itemUniqueId,
                                _id: ObjectID(),
                            };

                            itemDetails.push(itemDetail);
                        });
                    });

                    itemDetails.forEach(async (itemData)=>{
                        await db.getDB().collection('ongoing').updateOne({
                            _id: savedData._id
                        }, {
                            $addToSet: {
                                items: itemData
                            }
                        })
                    });

                    itemDetails.forEach(async(itemData)=>{
                        await ioredis.rpush("chat_id"+chat_id, JSON.stringify(itemData));
                    });
                    
                    if(toDisplayItems){    
                        retail.sendItemMessage(chat_id);
                    }

                    console.log(await ioredis.llen("chat_id"+chat_id))
                } else {
                    // When Data is not found in mongo.
                }
            }
                break
            case 'on_select': {
                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id,
                    isResolved: false
                });

                
                // console.log(JSON.stringify(data))
                if (savedData != null) {
                    const chat_id = savedData.chat_id;
                    redis.get(chat_id, async (err, reply) => {
                        if (err) {
                            replySender({
                                chat_id: chat_id,
                                text: "Something went Wrong"
                            });
                            console.log(err)
                        }
                        else {
                            const cachedData = JSON.parse(reply)
                            // checking whether next step is wait for quote callback or not.
                            if(cachedData.nextStep!=retail.steps.waitForQouteCallback){
                                // Returning because current step is not wait for qoute callback.
                                return;
                            }

                            const qouteData = data.message.order.quote;
                            let qouteText = "Your Order.\n";
                            qouteData.breakup.forEach((itemData) => {
                                qouteText += "\n*" + itemData.title + "*\n";
                                qouteText += "Cost : *Rs. " + itemData.price.value + "*\n";
                            });
                            qouteText += "\nTotal : *Rs. " + qouteData.price.value + "*\n";
                            qouteText += "\nPlease Enter billing details to proceed further.\n";
                            qouteText += retail.msgs.billing_name;

                            replySender({
                                chat_id: chat_id,
                                text: qouteText
                            })

                            // Set it in mongo db.
                            await db.getDB().collection('ongoing').updateOne({
                                _id: savedData._id
                            }, {
                                $set: {
                                    qoute: qouteData
                                }
                            });

                            // Change the next step to billing_name.    
                            cachedData['nextStep'] = retail.steps.billing_name;
                            redis.set(chat_id, JSON.stringify(cachedData));
                        }
                    })
                }
                else {
                    // When Data is not found in mongo.
                }
            }
                break;
            case 'on_init': {
                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id,
                    isResolved: false
                });

                if(savedData!=null){
                    // TODO: check whether next step is wait for init callback or not.
                    
                    const chat_id = savedData.chat_id;
                    redis.get(chat_id, async (err, reply) => {
                        if (err) {
                            replySender({
                                chat_id: chat_id,
                                text: "Something went Wrong"
                            });
                            console.log(err)
                        }
                        else {
                            const cachedData = JSON.parse(reply)
                            if(!cachedData){
                                return;
                            }

                            const paymentData=data.message.order.payment;
                            await db.getDB().collection('ongoing').updateOne({
                                _id: savedData._id
                            }, {
                                $set: {
                                    payment: paymentData
                                }
                            });
                            const paymentText="Please Confirm your order.\n\nAmount: *Rs. "+paymentData.params.amount+"*\n\nPayment Method: *Cash on Delivery.*";
                            const reply_markup = {
                                inline_keyboard: [
                                    [
                                        {
                                            text: "Cancel",
                                            callback_data: callbackUtils.encrypt({
                                                type: 'retail',
                                                commandType: retail.callbackTypes.cancelConfirm,
                                                id: savedData.transaction_id
                                            })
                                        },
                                        {
                                            text: "Confirm",
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
                                chat_id:chat_id,
                                text: paymentText,
                                reply_markup: reply_markup
                            });

                            cachedData['nextStep']=retail.steps.stateOrderConfirmation;
                            redis.set(chat_id, JSON.stringify(cachedData));
                        }
                    })
                }
            }
                break;
            case 'on_confirm':
                const transactionId=data.context.transaction_id;
                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: transactionId,
                    isResolved: false
                });
                const chat_id=savedData.chat_id;
                if(data.error){
                    replySender({
                        chat_id: chat_id,
                        text:"*Order Confirmation Failed.*\n"+data.error.message
                    });
                    return;
                }

                if(savedData!=null){
                    // TODO: check whether next step is wait for confirm callback or not.
                    
                    redis.get(chat_id, async (err, reply) => {
                        if (err) {
                            replySender({
                                chat_id: chat_id,
                                text: "Something went Wrong"
                            });
                            console.log(err)
                        }
                        else {
                            const cachedData = JSON.parse(reply)
                            if(!cachedData){
                                return;
                            }

                            const orderId=data.message.order.id;
                            const orderState=data.message.order.state;
                            const orderInfo=data.message.order;

                            let orderText="*Order Confirmation*\n";
                            orderText+="\nOrder Id: *"+orderId+"*\n";
                            orderText+="\n*Costings*\n";

                            let currItemIdx=1;
                            orderInfo.quote.breakup.forEach((breakupItem) => {
                                orderText+="\n*"+currItemIdx+"*";
                                orderText+="\n*"+breakupItem.title+"*";
                                orderText+="\nCost: *Rs. "+breakupItem.price.value+"*\n";
                                currItemIdx++;
                            });

                            orderText+="\nTotal Amount: *Rs. "+orderInfo.quote.price.value+"*\n";
                            orderText+="\nThanks for shopping with us.\n"
                            
                            replySender({
                                chat_id:chat_id,
                                text:orderText
                            });

                            savedData['order']=orderInfo;
                            savedData['isResolved']=true;
                            
                            await db.getDB().collection('ongoing').deleteOne({
                                _id: savedData._id
                            })

                            savedData['_id']=undefined;
                            await db.getDB().collection('completed').insertOne({
                                ...savedData    
                            })
                        }
                    })
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