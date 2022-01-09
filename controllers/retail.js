const axios = require('axios').default
const redis = require('../utils/redis')
const ioredis = require('../utils/ioredis')
const db = require('../utils/mongo')
const replySender = require('./replySender');
const replySenderWithImage = require('./replySenderWithImage')
const { ObjectId } = require('mongodb')
const callbackUtils = require('../utils/callback')
const validationUtils = require('../utils/validations')

const englishOtherMsgs = require('../msgsJSONs/english_other_msgs.json')
const englishStepsMsgs = require('../msgsJSONs/english_steps_msgs.json')

const kannadaOtherMsgs = require('../msgsJSONs/kannada_other_msgs.json')
const kannadaStepsMsgs = require('../msgsJSONs/kannada_steps_msgs.json')

const englishBtnTxts = require('../msgsJSONs/english_btns_txts.json')
const kannadaBtnTxts = require('../msgsJSONs/kannada_btns_txts.json')

const handleRetail = async (cachedData, data) => {
    if (isStepAnItemCount(cachedData.nextStep)) {
        // This will handle all item selection count.

        const chat_id = data.message.chat.id;
        if (!validationUtils.integer(data.message.text)) {
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_number,
            })
            return
        }

        const count = parseInt(data.message.text);
        const parts = cachedData.nextStep.split('&&');
        let itemUniqueId = "";
        for (let i = 1; i < parts.length; i++) {
            itemUniqueId += parts[i];
        }

        cachedData['nextStep'] = retailSteps.itemSelect;
        let selectedItems = []
        if (cachedData['selectedItems']) {
            selectedItems = [...cachedData['selectedItems']];
        }

        selectedItems.push({
            item_unique_id: itemUniqueId,
            count: count
        });
        cachedData['selectedItems'] = selectedItems;
        console.log(cachedData)

        const reply_markup = JSON.stringify({
            inline_keyboard: [
                [
                    {
                        text: btnTxts(cachedData.language).checkout,
                        callback_data: callbackUtils.encrypt({
                            type: 'retail',
                            commandType: retailCallBackTypes.checkout,
                            id: cachedData.transaction_id
                        })
                    }
                ]
            ],
            "resize_keyboard": true,
            "one_time_keyboard": true
        })
        redis.set(chat_id, JSON.stringify(cachedData));
        replySender({
            chat_id: chat_id,
            text: retailMsgs(cachedData.language).items_added_to_cart,
            reply_markup: reply_markup
        })

        return;
    }

    switch (cachedData.nextStep) {
        case retailSteps.language: {
            const chat_id = data.message.chat.id;
            if (validationUtils.integer(data.message.text)) {
                let languageNumber = parseInt(data.message.text);
                if ((languageNumber == 1) || (languageNumber == 2)) {
                    if (languageNumber == 1) {
                        cachedData['language'] = retailLanguages.english;
                    }
                    else if (languageNumber == 2) {
                        cachedData['language'] = retailLanguages.kannada;
                    }

                    cachedData['nextStep'] = retailSteps.location;
                    redis.set(data.message.chat.id, JSON.stringify(cachedData));
                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs(cachedData.language).location
                    });

                    console.log(cachedData)
                }
                else {
                    replySender({
                        chat_id: chat_id,
                        text: retailMsgs(retailLanguages.english).invalid_choice
                    });
                }
            }
            else {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(retailLanguages.english).invalid_number
                });
            }
        }
            break;
        case retailSteps.location:
            if (data.message.location) {
                let updateCachedData = cachedData;
                updateCachedData['nextStep'] = retailSteps.itemName;
                // TODO: TEMP Make it ORG in prod.
                // ORG Code.
                updateCachedData['location'] = `${data.message.location.latitude},${data.message.location.longitude}`;

                // // Temp Code 1
                // updateCachedData['location'] = "12.9063433,77.5856825";

                // // Temp Code 2
                // updateCachedData['location'] = "28.528328,77.202714";


                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).itemName
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_location
                });
            }
            break;
        case retailSteps.itemName:
            if (data.message.text) {
                let updateCachedData = cachedData;
                updateCachedData['nextStep'] = retailSteps.itemSelect;
                updateCachedData[retailSteps.itemName] = data.message.text;

                const transactionId = updateCachedData['transaction_id'];
                const retailSearchResp = await searchForItemsAPI(updateCachedData[retailSteps.itemName], updateCachedData[retailSteps.location], transactionId);
                if (retailSearchResp) {
                    updateCachedData['transaction_id'] = retailSearchResp.context.transaction_id;
                    updateCachedData['message_id'] = retailSearchResp.context.message_id;
                    updateCachedData['callingTime'] = retailSearchResp.context.timestamp;
                    redis.set(data.message.chat.id, JSON.stringify(updateCachedData));

                    updateCachedData['onSearchTrigger'] = retailSearchResp;
                    updateCachedData['isResolved'] = false;

                    const tempData = await db.getDB().collection('ongoing').insertOne(updateCachedData);
                    console.log(tempData)

                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs(cachedData.language).itemSelect
                    });
                }
                else {
                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs(cachedData.language).something_went_wrong
                    });
                }
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_item_name
                });
            }
            break;
        case retailSteps.itemSelect: {
            const chat_id = data.message.chat.id;
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_call
            })
        }
            break;
        case retailSteps.proceedCheckout: {
            const chat_id = data.message.chat.id;
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_call
            })
        }
            break;
        case retailSteps.waitForQouteCallback: {
            const chat_id = data.message.chat.id;
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_call
            })
        }
            break;

        case retailSteps.waitForInitCallback: {
            const chat_id = data.message.chat.id;
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_call
            })
        }
            break;

        case retailSteps.stateOrderConfirmation: {
            const chat_id = data.message.chat.id;
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_call
            })
        }
            break;

        case retailSteps.waitForConfirmCallback: {
            const chat_id = data.message.chat.id;
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).invalid_call
            })
        }
            break;
        case retailSteps.billing_name:
            if (validationUtils.name(data.message.text)) {
                const billingInfo = {};
                billingInfo['name'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_phone;
                redis.set(data.message.chat.id, JSON.stringify(cachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_phone,
                    reply_markup: {
                        keyboard: [
                            [{
                                "text": "Send Contact",
                                "request_contact": true
                            }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_name
                });
            }
            break;
        case retailSteps.billing_phone: {
            if ((data.message.contact != undefined) && (data.message.contact != null) && (data.message.contact.phone_number != undefined) && (data.message.contact.phone_number != null)) {
                const phoneNumber = data.message.contact.phone_number;
                const billingInfo = cachedData['billing'];
                billingInfo['phone'] = phoneNumber;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_address_flat_no
                redis.set(data.message.chat.id, JSON.stringify(cachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_address_flat_no,
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_contact_number,
                    reply_markup: {
                        keyboard: [
                            [{
                                "text": "Send Contact",
                                "request_contact": true
                            }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });

            }
        }
            break;

        case retailSteps.billing_address_flat_no:
            if (data.message.text) {
                const billingInfo = cachedData['billing'];
                billingInfo['address'] = {
                    "door": data.message.text,
                    "country": "IND"
                };

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_address_building;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_address_building,
                });
            }
            break;

        case retailSteps.billing_address_building:
            if (data.message.text) {
                const billingInfo = cachedData['billing'];
                billingInfo['address']['building'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_address_street;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_address_street,
                });
            }
            break;

        case retailSteps.billing_address_street:
            if (data.message.text) {
                const billingInfo = cachedData['billing'];
                billingInfo['address']['street'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_address_city;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_address_city,
                });
            }
            break;

        case retailSteps.billing_address_city:
            if (data.message.text) {
                const billingInfo = cachedData['billing'];
                billingInfo['address']['city'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_address_state;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_address_state,
                });
            }
            break;

        case retailSteps.billing_address_state:
            if (data.message.text) {
                const billingInfo = cachedData['billing'];
                billingInfo['address']['state'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_address_area_code;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_address_area_code,
                });
            }
            break;

        case retailSteps.billing_address_area_code:
            if (validationUtils.integer(data.message.text)) {
                const billingInfo = cachedData['billing'];
                billingInfo['address']['area_code'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.billing_email;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).billing_email,
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_number,
                });
            }
            break;

        case retailSteps.billing_email: {
            let isEmailThere = false;
            if (typeof (data.message.entities) != 'undefined') {
                data.message.entities.forEach(entity => {
                    if (entity.type == 'email') {
                        isEmailThere = true;
                    }
                });
            }

            if (isEmailThere) {
                const billingInfo = cachedData['billing'];
                billingInfo['email'] = data.message.text;

                cachedData['billing'] = billingInfo;
                cachedData['nextStep'] = retailSteps.shipping_same_as_billing_info;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_same_as_billing_info,
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_email
                })
            }
        }
            break;

        case retailSteps.shipping_same_as_billing_info:
            if (data.message.text) {
                if ((data.message.text.trim().toLowerCase() == 'y') || (data.message.text.trim().toLowerCase() == "y")) {
                    // Create a copy of data.
                    const fulfillment = {
                        "type": "HOME-DELIVERY",
                        "tracking": true,

                        "end": {
                            "location": {
                                "gps": cachedData['location'],
                                "address": cachedData['billing']['address']
                            },
                            "contact": {
                                "phone": cachedData['billing']["phone"],
                                "email": cachedData["billing"]["email"]
                            }
                        }
                    }
                    cachedData['fulfillment'] = fulfillment;

                    const reqItemProvidersInfo = await createInitAPIInfo(cachedData)
                    try {
                        Object.keys(reqItemProvidersInfo).forEach(async (providerUniqueId) => {
                            const initOrderResp = await initOrderAPI(reqItemProvidersInfo[providerUniqueId]);
                            console.log(initOrderResp)
                        });
                    } catch (error) {
                        console.log(error)
                    }

                    cachedData['nextStep'] = retailSteps.waitForInitCallback;
                    redis.set(data.message.chat.id, JSON.stringify(cachedData))
                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs(cachedData.language).waitForInitCallback,
                    });
                }
                else if ((data.message.text.trim().toLowerCase() == 'n') || (data.message.text.trim().toLowerCase() == "n")) {
                    const fulfillment = {
                        "type": "HOME-DELIVERY",
                        "tracking": true,

                        "end": {
                            "location": {
                                "gps": cachedData['location'],
                                "address": {
                                    "country": "IND"
                                }
                            },
                            "contact": {}
                        }
                    }
                    cachedData['fulfillment'] = fulfillment;
                    cachedData['nextStep'] = retailSteps.shipping_email;
                    redis.set(data.message.chat.id, JSON.stringify(cachedData))
                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs(cachedData.language).shipping_email,
                    });
                }
                else {
                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs(cachedData.language).invalid_choice,
                    })
                }
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_choice,
                })
            }
            break;

        case retailSteps.shipping_email: {
            let isEmailThere = false;
            if (typeof (data.message.entities) != 'undefined') {
                data.message.entities.forEach(entity => {
                    if (entity.type == 'email') {
                        isEmailThere = true;
                    }
                });
            }
            if (isEmailThere) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']['contact']['email'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_phone;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_phone,
                    reply_markup: {
                        keyboard: [
                            [{
                                "text": "Send Contact",
                                "request_contact": true
                            }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_email
                });
            }
        }
            break;

        case retailSteps.shipping_phone:
            if ((data.message.contact != undefined) && (data.message.contact != null) && (data.message.contact.phone_number != undefined) && (data.message.contact.phone_number != null)) {
                const phoneNumber = data.message.contact.phone_number;
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']['contact']['phone'] = phoneNumber;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_address_flat_no;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_address_flat_no,
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_contact_number,
                    reply_markup: {
                        keyboard: [
                            [{
                                "text": "Send Contact",
                                "request_contact": true
                            }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
            }
            break;

        case retailSteps.shipping_address_flat_no:
            if (data.message.text) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']["location"]['address']['door'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_address_building;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_address_building,
                });
            }
            break;

        case retailSteps.shipping_address_building:
            if (data.message.text) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']["location"]['address']['building'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_address_street;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_address_street,
                });
            }
            break;

        case retailSteps.shipping_address_street:
            if (data.message.text) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']["location"]['address']['street'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_address_city;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_address_city,
                });
            }
            break;

        case retailSteps.shipping_address_city:
            if (data.message.text) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']["location"]['address']['city'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_address_state;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_address_state,
                });
            }
            break;

        case retailSteps.shipping_address_state:
            if (data.message.text) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']["location"]['address']['state'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                cachedData['nextStep'] = retailSteps.shipping_address_area_code;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).shipping_address_area_code,
                });
            }
            break;

        case retailSteps.shipping_address_area_code:
            if (validationUtils.integer(data.message.text)) {
                const fulfillmentInfo = cachedData['fulfillment'];
                fulfillmentInfo['end']["location"]['address']['area_code'] = data.message.text;

                cachedData['fulfillment'] = fulfillmentInfo;
                const reqItemProvidersInfo = await createInitAPIInfo(cachedData)
                try {
                    Object.keys(reqItemProvidersInfo).forEach(async (providerUniqueId) => {
                        const initOrderResp = await initOrderAPI(reqItemProvidersInfo[providerUniqueId]);
                        console.log(initOrderResp)
                    });
                } catch (error) {
                    console.log(error)
                }

                cachedData['nextStep'] = retailSteps.waitForInitCallback;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).waitForInitCallback,
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs(cachedData.language).invalid_number,
                });
            }
            break;
    }
}

const nextItemsCallback = async (chat_id, transactionId) => {
    try {
        // TODO: get cache data.
        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(retailLanguages.english).something_went_wrong
                });
                console.log(err)
            } else {
                if (await ioredis.llen("chat_id" + chat_id) > 0) {
                    await sendItemMessage(chat_id, transactionId)
                }
                else{
                    const cachedData=JSON.parse(reply)
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language)(cachedData.language).no_matching_items_available,
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [
                                {
                                    text: btnTxts(cachedData.language).search,
                                    callback_data: callbackUtils.encrypt({
                                        type: 'retail',
                                        commandType: retailCallBackTypes.anotherSearch,
                                        id: transactionId
                                    })
                                }
                            ]
                        ],
                        "resize_keyboard": true,
                        "one_time_keyboard": true
                    })
                });
                }
                
            }
        });
    } catch (error) {
        console.log(error)
        replySender({
            chat_id: chat_id,
            text: retailMsgs(retailLanguages.english).something_went_wrong
        });
    }
}

const sendItemMessage = async (chat_id, transactionId, language) => {
    console.log(transactionId)
    // console.log(await ioredis.llen("chat_id" + chat_id));

    let itemCount = 0;
    while ((itemCount < displayItemCount) && (await ioredis.llen("chat_id" + chat_id))) {
        const itemData = JSON.parse(await ioredis.lpop("chat_id" + chat_id));
        const displayText = getRetailItemText({
            mrp: "Rs. " + itemData.price.value,
            name: itemData.descriptor.name,
            soldBy: itemData.retail_decriptor.name
        });

        const reply_markup = JSON.stringify({
            inline_keyboard: [
                [
                    {
                        text: btnTxts(language).addToCart,
                        callback_data: callbackUtils.encrypt({
                            type: 'retail',
                            commandType: retailCallBackTypes.addToCart,
                            id: itemData.item_unique_id
                        })
                    }
                ]
            ],
            "resize_keyboard": true,
            "one_time_keyboard": true
        })

        let imgURL;
        if ((itemData.descriptor.images) && (itemData.descriptor.images.length > 0)) {
            imgURL = itemData.descriptor.images[0];
        }

        if (imgURL) {
            await replySenderWithImage({
                chat_id: chat_id,
                text: displayText,
                reply_markup: reply_markup
            }, imgURL, false);
        }
        else {
            await replySender({
                chat_id: chat_id,
                text: displayText,
                reply_markup: reply_markup
            });
        }

        itemCount++;
    }

    const reply_markup = {
        inline_keyboard: [
            [
                {
                    text: btnTxts(language).search,
                    callback_data: callbackUtils.encrypt({
                        type: 'retail',
                        commandType: retailCallBackTypes.anotherSearch,
                        id: transactionId
                    })
                }
            ]
        ],
        "resize_keyboard": true,
        "one_time_keyboard": true
    };
    if (await ioredis.llen("chat_id" + chat_id) > 0) {
        reply_markup.inline_keyboard[0].push({
            text: btnTxts(language).next,
            callback_data: callbackUtils.encrypt({
                type: 'retail',
                commandType: retailCallBackTypes.next,
                id: transactionId
            })
        });
    }

    // replySender({
    //     chat_id: chat_id,
    //     text: "To view More Items",
    //     reply_markup: JSON.stringify(reply_markup)
    // });

    await sleep(250 * displayItemCount)

    redis.get(chat_id, async (err, reply) => {
        if (err) {
            replySender({
                chat_id: chat_id,
                text: retailMsgs(retailLanguages.english).something_went_wrong
            });
            console.log(err)
        } else {

            const cachedData = JSON.parse(reply)
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).to_view_more_items,
                reply_markup: JSON.stringify(reply_markup)
            });
        }
    });

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const displayItemCount = 10;

const anotherSearchCallback = async (chat_id, transactionId) => {
    try {
        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(retailLanguages.english).something_went_wrong
                });
                console.log(err)
            } else {

                await ioredis.del("chat_id" + chat_id);

                const cachedData = JSON.parse(reply)
                if (cachedData.nextStep != retailSteps.itemSelect) {
                    replySender({
                        chat_id: chat_id,
                        text: retailMsgs(cachedData.language).invalid_call
                    });
                    return;
                }

                cachedData['nextStep'] = retailSteps.itemName;
                redis.set(chat_id, JSON.stringify(cachedData));

                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).itemName
                });
            }
        });
    } catch (error) {
        console.log(error)
    }
}

const addToCartCallback = async (chat_id, itemUniqueId) => {
    try {
        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(retailLanguages.english).something_went_wrong
                });
                console.log(err)
            } else {
                const cachedData = JSON.parse(reply)
                if (cachedData.nextStep != retailSteps.itemSelect) {
                    replySender({
                        chat_id: chat_id,
                        text: retailMsgs(cachedData.language).invalid_call
                    });
                    return;
                }

                cachedData['nextStep'] = retailSteps.itemCountStep(itemUniqueId);
                redis.set(chat_id, JSON.stringify(cachedData));
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).itemCountStep
                });
            }
        });
    } catch (error) {
        console.log(error)
    }
}

const checkoutCallback = async (chat_id, transactionId) => {
    try {
        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(retailLanguages.english).something_went_wrong
                });
                console.log(err)
            } else {
                const cachedData = JSON.parse(reply)
                if (cachedData.nextStep != retailSteps.itemSelect) {
                    replySender({
                        chat_id: chat_id,
                        text: retailMsgs(cachedData.language).invalid_call
                    });
                    return;
                }

                const savedData = await db.getDB().collection('ongoing').findOne({
                    transaction_id: transactionId
                });

                if (!cachedData.selectedItems) {
                    replySender({
                        chat_id: chat_id,
                        text: retailMsgs(cachedData.language).invalid_call
                    });
                    return;
                }

                const selectItemDetails = getSelectItemDetails(savedData.items, cachedData.selectedItems);

                // Add button for proceed and cancel.
                let cartText = "Your Cart.\n";
                let currItemCount = 1;
                selectItemDetails.forEach((itemData) => {
                    cartText += "\n*" + currItemCount + ".*\n" + getRetailItemText({
                        name: itemData.descriptor.name,
                        mrp: "Rs. " + itemData.price.value,
                        soldBy: itemData.retail_decriptor.name,
                        count: itemData.count
                    }) + "\n";
                    currItemCount++;
                });
                cartText += "\n\nClick on Proceed to place an order.\nClick on Cancel to add further items to cart.";

                const reply_markup = {
                    inline_keyboard: [
                        [
                            {
                                text: btnTxts(cachedData.language).cancel,
                                callback_data: callbackUtils.encrypt({
                                    type: 'retail',
                                    commandType: retailCallBackTypes.cancelCheckout,
                                    id: savedData.transaction_id
                                })
                            },
                            {
                                text: btnTxts(cachedData.language).proceed,
                                callback_data: callbackUtils.encrypt({
                                    type: 'retail',
                                    commandType: retailCallBackTypes.proceedCheckout,
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
                    text: cartText,
                    reply_markup: reply_markup
                });

                cachedData['nextStep'] = retailSteps.proceedCheckout;
                redis.set(chat_id, JSON.stringify(cachedData));
            }
        });

    } catch (error) {
        console.log(error)
    }
}


const cancelCheckoutCallback = async (chat_id, transactionId) => {
    try {

        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(retailLanguages.english).something_went_wrong
                });
                console.log(err)
            } else {
                const cachedData = JSON.parse(reply)
                if (cachedData.nextStep != retailSteps.proceedCheckout) {
                    replySender({
                        chat_id: chat_id,
                        text: retailMsgs(cachedData.language).invalid_call
                    });
                    return;
                }

                cachedData['nextStep'] = retailSteps.itemSelect;
                redis.set(chat_id, JSON.stringify(cachedData));
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).still_can_add_items
                });
            }
        });
    } catch (error) {
        console.log(error)
    }
}

const proceedCheckoutCallback = async (chat_id, transactionId) => {

    redis.get(chat_id, async (err, reply) => {
        if (err) {
            replySender({
                chat_id: chat_id,
                text: retailMsgs(retailLanguages.english).something_went_wrong
            });
            console.log(err)
        } else {
            const cachedData = JSON.parse(reply)
            if (cachedData.nextStep != retailSteps.proceedCheckout) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).invalid_call
                });
                return;
            }

            const savedData = await db.getDB().collection('ongoing').findOne({
                transaction_id: transactionId
            });

            if (!cachedData.selectedItems) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).invalid_call
                });
                return;
            }


            // Dividing them according to the provider and bpp_id the object 
            const messageId = savedData.message_id;
            const selectedItemDetails = getSelectItemDetails(savedData.items, cachedData.selectedItems);

            const itemsOnProviders = seperateItemsOnProvider(selectedItemDetails);
            await db.getDB().collection('ongoing').updateOne({
                transaction_id: transactionId
            }, {
                $set: {
                    selecteditemsOnProviders: itemsOnProviders
                }
            });

            try {
                Object.keys(itemsOnProviders).forEach(async (providerUniqueId) => {
                    const itemProvider = itemsOnProviders[providerUniqueId];
                    console.log(itemProvider)
                    const addToCartResp = await selectAddToCartAPI({
                        ...itemProvider,
                        transactionId: transactionId,
                        messageId: messageId,
                    });

                    if (addToCartResp) {
                        console.log(addToCartResp)
                    }
                    else {
                        throw {
                            "Error": "Api call failed."
                        }
                    }
                });

                cachedData['nextStep'] = retailSteps.waitForQouteCallback;
                redis.set(chat_id, JSON.stringify(cachedData));
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).waitForQouteCallback
                });
            } catch (error) {
                console.log(error);
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).something_went_wrong
                })
            }
        }
    });
}

const cancelConfirmCallback = async (chat_id, transaction_id) => {

    redis.get(chat_id, async (err, reply) => {
        if (err) {
            replySender({
                chat_id: chat_id,
                text: retailMsgs(retailLanguages.english).something_went_wrong
            });
            console.log(err)
        } else {
            const cachedData = JSON.parse(reply)
            if (cachedData.nextStep != retailSteps.stateOrderConfirmation) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).invalid_call
                });
                return;
            }

            cachedData['nextStep'] = retailSteps.itemSelect;
            redis.set(chat_id, JSON.stringify(cachedData));
            replySender({
                chat_id: chat_id,
                text: retailMsgs(cachedData.language).still_can_add_items
            });
        }
    });
}
const confirmOrderCallback = async (chat_id, transactionId) => {

    redis.get(chat_id, async (err, reply) => {
        if (err) {
            replySender({
                chat_id: chat_id,
                text: retailMsgs(retailLanguages.english).something_went_wrong
            });
            console.log(err)
        } else {
            const cachedData = JSON.parse(reply)
            if (cachedData.nextStep != retailSteps.stateOrderConfirmation) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).invalid_call
                });
                return;
            }

            const savedData = await db.getDB().collection('ongoing').findOne({
                transaction_id: transactionId
            });

            if (!cachedData.selectedItems) {
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).invalid_call
                });
                return;
            }

            const messageId = savedData.message_id;
            const selectedItemDetails = getSelectItemDetails(savedData.items, cachedData.selectedItems);
            const itemsOnProviders = seperateItemsOnProvider(selectedItemDetails);
            const paymentsInfo = savedData.payments;
            try {
                // Add Payment data to itemsOnProviders.
                paymentsInfo.forEach((paymentInfo) => {
                    if (itemsOnProviders[paymentInfo.provider_unique_id]) {
                        itemsOnProviders[paymentInfo.provider_unique_id]['paymentInfo'] = paymentInfo;
                    }
                });

                Object.keys(itemsOnProviders).forEach(async (providerUniqueId) => {
                    const itemProvider = itemsOnProviders[providerUniqueId];
                    const confirmOrderResp = await confirmOrderAPI({
                        ...itemProvider,
                        messageId: messageId,
                        transactionId: transactionId,
                        billingInfo: cachedData['billing'],
                        fulfillmentInfo: cachedData['fulfillment'],
                    });
                })

                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).waitForConfirmCallback
                });

                cachedData['nextStep'] = retailSteps.waitForConfirmCallback;
                redis.set(chat_id, JSON.stringify(cachedData));

            } catch (error) {
                console.log(error)
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs(cachedData.language).something_went_wrong
                });
            }
        }
    });
}

const trackOrderCallback = async (chat_id, shortOrderId) => {
    const savedData = await db.getDB().collection('confirmed_orders').findOne({
        short_order_id: ObjectId(shortOrderId),
    });

    const orderId = savedData.message.order.id;
    const bppId = savedData.context.bpp_id;
    const bppUri = savedData.context.bpp_uri;

    const reqBody = {
        "context": {
            "domain": retailDomain,
            "core_version": "0.9.3",
            "city": "std:080",
            "country": "IND",
            "bpp_id": bppId,
            "bpp_uri": bppUri
        },
        "message": {
            "order_id": orderId
        }
    }

    // console.log(reqBody)

    try {
        const response = await axios.post(
            `${process.env.becknService}/trigger/track`,
            reqBody
        );

        // Update the transaction id that you will get from API call.
        const transactionId = response.data.context.transaction_id;
        await db.getDB().collection('confirmed_orders').updateOne({
            _id: savedData._id
        }, {
            $set: {
                transaction_id: transactionId
            }
        })
        console.log(response.data);
    } catch (error) {
        console.log(error);
    }
}
const orderStatusCallback = async (chat_id, shortOrderId) => {
    const savedData = await db.getDB().collection('confirmed_orders').findOne({
        short_order_id: ObjectId(shortOrderId),
    });

    const orderId = savedData.message.order.id;
    const bppId = savedData.context.bpp_id;
    const bppUri = savedData.context.bpp_uri;

    const reqBody = {
        "context": {
            "domain": retailDomain,
            "core_version": "0.9.3",
            "city": "std:080",
            "country": "IND",
            "bpp_id": bppId,
            "bpp_uri": bppUri
        },
        "message": {
            "order_id": orderId
        }
    }

    try {
        const response = await axios.post(
            `${process.env.becknService}/trigger/status`,
            reqBody
        );

        // Update the transaction id that you will get from API call.
        const transactionId = response.data.context.transaction_id;
        await db.getDB().collection('confirmed_orders').updateOne({
            _id: savedData._id
        }, {
            $set: {
                transaction_id: transactionId
            }
        })
        console.log(response.data);
    } catch (error) {
        console.log(error);
    }
}

const getSelectItemDetails = (items, selectedItems) => {
    const selectItemDetails = [];
    items.forEach((itemData) => {
        let itemCount = 0;
        selectedItems.forEach(({ item_unique_id, count }) => {
            if (itemData.item_unique_id == item_unique_id) {
                itemCount = count;
            }
        });

        if (itemCount > 0) {
            selectItemDetails.push({
                ...itemData, count: itemCount
            })
        }
    });

    return selectItemDetails;
}

// All API Calls.
const searchForItemsAPI = async (itemName, location, transactionId) => {
    console.log(transactionId);
    let reqBody = {
        "context": {
            "domain": retailDomain,
            "core_version": "0.9.3",
            "city": "std:080",
            "country": "IND",
            "transaction_id": transactionId,

            // // TODO: TEMP Remove in prod.
            // "bpp_id": "bpp1.beckn.org",
            // "bpp_uri": "https://bpp1.beckn.org/rest/V1/beckn/"

            // "bpp_id": "venky.succinct.in",
            // "bpp_uri": "https://beckn-one.succinct.in/bg/"
        },
        "message": {
            "intent": {
                "item": {
                    "descriptor": {
                        "name": itemName
                    }
                },
                "fulfillment": {
                    "end": {
                        "location": {
                            "gps": location
                        }
                    }
                }
            }
        }
    };

    try {
        const response = await axios.post(
            `${process.env.becknService}/trigger/search`,
            reqBody
        );

        // console.log(response.data);
        return response.data;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const selectAddToCartAPI = async ({
    transactionId, messageId, providerId, providerLocations, items, bppUri, bppId
}) => {
    console.log("Provider ID : ", providerId)
    let reqBody = {
        "context": {
            "domain": retailDomain,
            "country": "IND",
            "city": "std:080",
            "core_version": "0.9.3",
            "transaction_id": transactionId,
            "message_id": messageId,
            "bpp_id": bppId,
            "bpp_uri": bppUri,
        },
        "message": {
            "order": {
                "provider": {
                    "id": providerId,
                    "locations": providerLocations,

                    // Dummy Data.
                    // "locations": [
                    //     {
                    //         "id": "el"
                    //     }
                    // ]
                },
                // Dummy Data.
                // "items": [
                //     {
                //         "id": "G-0007",
                //         "quantity": {
                //             "count": 1
                //         }
                //     }
                // ],

                items: items
            }
        }
    }

    // console.log(JSON.stringify(reqBody))

    try {
        const response = await axios.post(
            `${process.env.becknService}/trigger/select`,
            reqBody
        );

        // console.log("Message ID:", messageId, response.data.context.message_id);
        // console.log("Txn ID:", transactionId, response.data.context.transaction_id);
        // console.log(JSON.stringify(response.data))
        return response.data;
    } catch (error) {
        console.log(error)
        return null;
    }
}

const createInitAPIInfo = async (cachedData) => {
    const transactionId = cachedData.transaction_id;
    const savedData = await db.getDB().collection('ongoing').findOne({
        transaction_id: transactionId
    });

    if (!savedData) {
        return {};
    }

    const messageId = cachedData.message_id;
    const selectedItemDetails = getSelectItemDetails(savedData.items, cachedData.selectedItems);
    const itemsOnProviders = seperateItemsOnProvider(selectedItemDetails);
    Object.keys(itemsOnProviders).forEach((providerUniqueId) => {
        itemsOnProviders[providerUniqueId] = {
            ...itemsOnProviders[providerUniqueId],
            transactionId: transactionId,
            messageId: messageId,
            billingInfo: cachedData['billing'],
            fulfillmentInfo: cachedData['fulfillment'],
        }
    })

    return itemsOnProviders;
}

const initOrderAPI = async ({
    transactionId,
    messageId,
    providerId,
    providerLocations,
    billingInfo,
    fulfillmentInfo,
    items,
    bppUri, bppId
}) => {
    fulfillmentInfo.customer = {}
    fulfillmentInfo.customer.person = {}
    fulfillmentInfo.customer.person.name = billingInfo.name;
    let reqBody = {
        "context": {
            "domain": retailDomain,
            "core_version": "0.9.3",
            "country": "IND",
            "city": "std:080",
            "transaction_id": transactionId,
            "message_id": messageId,
            "bpp_id": bppId,
            "bpp_uri": bppUri,
        },
        "message": {
            "order": {
                "provider": {
                    "id": providerId,
                    "locations": providerLocations
                },
                // // Dummy Data.
                // "items": [
                //     {
                //         "id": "G-0007",
                //         "quantity": {
                //             "count": 1
                //         }
                //     }
                // ],
                "items": items,
                "billing": billingInfo,
                "fulfillment": fulfillmentInfo
            }
        }
    };

    try {
        const response = await axios.post(
            `${process.env.becknService}/trigger/init`,
            reqBody
        );
        return response.data;
    } catch (error) {
        console.log(error)
        return null;
    }
}

const confirmOrderAPI = async ({
    transactionId,
    messageId,
    providerId,
    providerLocations,
    billingInfo,
    fulfillmentInfo,
    items,
    paymentInfo,
    bppUri, bppId
}) => {
    fulfillmentInfo.customer = {}
    fulfillmentInfo.customer.person = {}
    fulfillmentInfo.customer.person.name = billingInfo.name;
    const reqBody = {
        "context": {
            "domain": retailDomain,
            "country": "IND",
            "city": "std:080",
            "core_version": "0.9.3",
            "transaction_id": transactionId,
            "message_id": messageId,
            "bpp_id": bppId,
            "bpp_uri": bppUri,
        },
        "message": {
            "order": {
                "provider": {
                    "id": providerId,
                    "locations": providerLocations
                },
                // Dummy Data.
                // "items": [
                //     {
                //         "id": "H-0013",
                //         "quantity": {
                //             "count": 1
                //         }
                //     }
                // ],

                "items": items,
                "billing": billingInfo,
                "fulfillment": fulfillmentInfo,
                "payment": paymentInfo
            }
        }
    };

    // console.log(JSON.stringify(reqBody))

    try {
        const response = await axios.post(
            `${process.env.becknService}/trigger/confirm`,
            reqBody
        );
        return response.data;
    } catch (error) {
        console.log(error)
        return null;
    }
}

const retailDomain = "nic2004:52110";

// Util Functions.
const isStepAnItemCount = (stepValue) => {
    const parts = stepValue.split("&&");
    if (parts.length <= 1) {
        return false;
    }

    return (parts[0] == "itemCount")
}

const createProviderId = ({
    bpp_id, providerId
}) => {
    return bpp_id + " " + providerId;
}

const getRetailItemText = ({
    name, mrp, soldBy, count
}) => {
    let text = "*" + name + "*\n" + "MRP : " + mrp + "\n" + "Sold By : " + soldBy;
    if (count) {
        text += "\nQuantity : " + count;
    }
    return text;
}

const seperateItemsOnProvider = (selectedItemDetails) => {
    const itemsOnProviders = {};
    selectedItemDetails.forEach((itemData) => {
        if (!itemsOnProviders[itemData.provider_unique_id]) {
            itemsOnProviders[itemData.provider_unique_id] = {
                provider_unique_id: itemData.provider_unique_id,
                providerId: itemData.provider_id,
                providerLocations: {
                    'id': itemData.location_id
                },
                items: [],
                bppId: itemData.bpp_id,
                bppUri: itemData.bpp_uri
            }
        }

        itemsOnProviders[itemData.provider_unique_id].items.push({
            "id": itemData.id,
            "quantity": {
                "count": itemData.count
            }
        });
    });

    return itemsOnProviders;
}

const retailSteps = {
    language: "language",
    location: "location",
    itemName: "itemName",
    itemSelect: "itemSelect",
    itemCountStep: (itemUniqueId) => {
        return "itemCount&&" + itemUniqueId
    },
    proceedCheckout: "proceedCheckout",
    waitForQouteCallback: "waitForQouteCallback",

    // Billing Info.
    billing_name: "billing_name",
    billing_phone: "billing_phone",

    // Billing address Info.
    billing_address_flat_no: "billing_address_flat_no",
    billing_address_building: "billing_address_building",
    billing_address_street: "billing_address_street",
    billing_address_city: "billing_address_city",
    billing_address_state: "billing_address_state",
    billing_address_country: "billing_address_country",
    billing_address_area_code: "billing_address_area_code",

    billing_email: "billing_email",

    // Ask isShipping.
    shipping_same_as_billing_info: "shipping_same_as_billing_info",

    // Shipping Info.
    shipping_email: "shipping_email",
    shipping_phone: "shipping_phone",

    shipping_address_flat_no: "shipping_address_flat_no",
    shipping_address_building: "shipping_address_building",
    shipping_address_street: "shipping_address_street",
    shipping_address_city: "shipping_address_city",
    shipping_address_state: "shipping_address_state",
    shipping_address_country: "shipping_address_country",
    shipping_address_area_code: "shipping_address_area_code",

    waitForInitCallback: 'waitForInitCallback',

    stateOrderConfirmation: 'stateOrderConfirmation',
    waitForConfirmCallback: 'waitForConfirmCallback',

}

const retailCallBackTypes = {
    next: "Next",
    anotherSearch: "anotherSearch",
    addToCart: "AddToCart",
    checkout: "CheckOut",
    cancelCheckout: "CancelCheckout",
    proceedCheckout: "ProceedCheckout",
    cancelConfirm: "CancelConfirm",
    confirmOrder: "ConfirmOrder",
    trackOrder: "TrackOrder",
    orderStatus: "OrderStatus"
}

const retailMsgs = (language) => {
    if (language == retailLanguages.kannada) {
        return { ...kannadaOtherMsgs, ...kannadaStepsMsgs }
    }
    else {
        return { ...englishOtherMsgs, ...englishStepsMsgs }
    }
};

const btnTxts=(language)=>{
    if(language==retailLanguages.kannada){
        return kannadaBtnTxts;
    }
    else{
        return englishBtnTxts;
    }
}

const retailLanguages = {
    "english": "english",
    "kannada": "kannada"
}

module.exports = {
    handleRetail,
    callbackTypes: retailCallBackTypes,
    steps: retailSteps,
    
    msgs: retailMsgs,
    languages: retailLanguages,
    btnTxts,
    
    getRetailItemText,
    getSelectItemDetails,
    seperateItemsOnProvider,

    // Callbacks
    nextItemsCallback,
    anotherSearchCallback,
    addToCartCallback,
    checkoutCallback,
    cancelCheckoutCallback,
    proceedCheckoutCallback,
    cancelConfirmCallback,
    confirmOrderCallback,
    trackOrderCallback,
    orderStatusCallback,

    displayItemCount,
    sendItemMessage,
    createProviderId
};