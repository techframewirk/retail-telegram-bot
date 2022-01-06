const axios = require('axios').default
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender = require('./replySender');
const replySenderWithImage = require('./replySenderWithImage')
const { ObjectId } = require('mongodb')
const callbackUtils = require('../utils/callback')

const handleRetail = async (cachedData, data) => {
    if (isStepAnItemCount(cachedData.nextStep)) {
        // This will handle all item selection count.
        // TODO: apply validation on integer.

        // TODO: apply validation on providerId,
        // all items should be from same provider.
        const count = parseInt(data.message.text);
        if (data.message.text) {
            const chat_id = data.message.chat.id;
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
                            text: "Checkout",
                            callback_data: callbackUtils.encrypt({
                                type: 'retail',
                                commandType: retailCallBackTypes.checkout,
                                id: cachedData.message_id
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
                text: "Items Added to the Cart.\nFurther select more items.\nClick on checkout to proceed.",
                reply_markup: reply_markup
            })
        }

        return;
    }

    switch (cachedData.nextStep) {
        // TODO: check whether its one of the steps mention in json or not.
        // or Item Count.
        case retailSteps.location:
            if (data.message.location) {
                let updateCachedData = cachedData;
                updateCachedData['nextStep'] = retailSteps.itemName;
                updateCachedData[retailSteps.location] = `${data.message.location.latitude}, ${data.message.location.longitude}`;
                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs.itemName
                });
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a location! Please try again!"
                });
            }
            break;
        case retailSteps.itemName:
            if (data.message.text) {
                let updateCachedData = cachedData;
                updateCachedData['nextStep'] = retailSteps.itemSelect;
                updateCachedData[retailSteps.itemName] = data.message.text;

                const retailSearchResp = await searchForItemsAPI(updateCachedData[retailSteps.itemName], updateCachedData[retailSteps.location]);
                if (retailSearchResp) {
                    updateCachedData['transaction_id'] = retailSearchResp.context.transaction_id;
                    updateCachedData['message_id'] = retailSearchResp.context.message_id;
                    updateCachedData['callingTime'] = retailSearchResp.context.timestamp;
                    redis.set(data.message.chat.id, JSON.stringify(updateCachedData));

                    updateCachedData['onSearchTrigger'] = retailSearchResp;
                    updateCachedData['isResolved'] = false;

                    await db.getDB().collection('ongoing').insertOne(updateCachedData);

                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs.itemSelect
                    });
                }
                else {
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Something went wrong."
                    });
                }
            }
            else {
                replySender({
                    chat_id: data.message.chat.id,
                    text: "This does not look like an item name."
                });
            }
            break;
        case retailSteps.itemSelect: {
            // TODO: add some text msg.
        }
            break;
        case retailSteps.proceedCheckout: {
            // TODO: add some text msg.
        }
            break;
        case retailSteps.waitForQouteCallback:{
            // TODO: add some text msg.
        }
        break;

        case retailSteps.billing_name:
            if(data.message.text){
                // TODO: apply validation.
                const billingInfo={};
                billingInfo['name']=data.message.text;

                cachedData['billing']=billingInfo;
                cachedData['nextStep']=retailSteps.billing_phone;
                redis.set(data.message.chat.id, JSON.stringify(cachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs.billing_phone,
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
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a billing name! Please try again!"
                });
            }
            break;
        case retailSteps.billing_phone:{
            if((data.message.contact!=undefined)&&(data.message.contact!=null)&&(data.message.contact.phone_number!=undefined)&&(data.message.contact.phone_number!=null)){
                const phoneNumber=data.message.contact.phone_number;
                const billingInfo=cachedData['billing'];
                billingInfo['phone']=phoneNumber;

                cachedData['billing']=billingInfo;
                cachedData['nextStep']=retailSteps.billing_address_flat_no
                redis.set(data.message.chat.id, JSON.stringify(cachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs.billing_address_flat_no,
                });
            }
            else{
                replySender({
                    chat_id:data.message.chat.id,
                    text:"It doesn't look like your contact. \nTry once again.",
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
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']={
                "door":data.message.text
            };

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_address_building;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_address_building,
            });
        }
        break;

        case retailSteps.billing_address_building:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']['building']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_address_street;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_address_street,
            });
        }
        break;

        case retailSteps.billing_address_street:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']['street']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_address_city;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_address_city,
            });
        }
        break;

        case retailSteps.billing_address_city:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']['city']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_address_state;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_address_state,
            });
        }
        break;

        case retailSteps.billing_address_state:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']['state']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_address_country;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_address_country,
            });
        }
        break;

        case retailSteps.billing_address_country:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']['country']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_address_area_code;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_address_area_code,
            });
        }
        break;

        case retailSteps.billing_address_area_code:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['address']['area_code']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.billing_email;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.billing_email,
            });
        }
        break;

        case retailSteps.billing_email:
        if(data.message.text){
            // TODO: apply validation.
            const billingInfo=cachedData['billing'];
            billingInfo['email']=data.message.text;

            cachedData['billing']=billingInfo;
            cachedData['nextStep']=retailSteps.shipping_same_as_billing_info;
            redis.set(data.message.chat.id, JSON.stringify(cachedData))
            replySender({
                chat_id: data.message.chat.id,
                text: retailMsgs.shipping_same_as_billing_info,
            });
        }
        break;

        case retailSteps.shipping_same_as_billing_info:
        if(data.message.text){
            let isSame=((data.message.text.trim().toLowerCase()=='y')||(data.message.text.trim().toLowerCase()=="y"))
            if(isSame){
                // Create a copy of data.
                const fulfillment={
                    "type": "HOME-DELIVERY",
                    "tracking": true,
                    
                    "end":{
                        "location":{
                            "gps":"Place location here.",
                            "address":cachedData['billing']['address']
                        },
                        "contact":{
                            "phone":cachedData['billing']["phone"],
                            "email":cachedData["billing"]["email"]
                        }
                    }
                }
                cachedData['fulfillment']=fulfillment;
                cachedData['nextStep']=retailSteps.shipping_location;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs.shipping_location,
                });
            }
            else{
                const fulfillment={
                    "type": "HOME-DELIVERY",
                    "tracking": true,
                    
                    "end":{
                        "location":{
                            "gps":"Place location here.",
                            "address":{}
                        },
                        "contact":{}
                    }
                }
                cachedData['fulfillment']=fulfillment;
                cachedData['nextStep']=retailSteps.shipping_email;
                redis.set(data.message.chat.id, JSON.stringify(cachedData))
                replySender({
                    chat_id: data.message.chat.id,
                    text: retailMsgs.shipping_email,
                });
            }
        }
        break;

        // Follow from email till location.
    }
}

const nextRetailItems = async (data, savedDataId) => {
    try {
        const savedData = await db.getDB().collection('ongoing').findOne({
            _id: ObjectId(savedDataId)
        })

        let itemsToDisplay = [];
        let itemDetails = [...savedData.itemDetails];
        if (itemDetails.length > displayItemCount) {
            itemsToDisplay = itemDetails.slice(0, displayItemCount);
            itemDetails = itemDetails.slice(displayItemCount);
        }
        else {
            itemsToDisplay = itemDetails;
            itemDetails = [];
        }

        if (itemsToDisplay.length > 0) {
            // Sending the message.
            await sendItemMessage(itemsToDisplay, savedData.chat_id)

            // TODO: Take a look at its position.
            // Next button.
            replySender({
                chat_id: savedData.chat_id,
                text: "To view More Items",
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [
                            {
                                text: "Next",
                                callback_data: callbackUtils.encrypt({
                                    type: 'retail',
                                    commandType: retailCallBackTypes.next,
                                    id: savedData._id
                                })
                            }
                        ]
                    ],
                    "resize_keyboard": true,
                    "one_time_keyboard": true
                })
            });
        }
        else {
            replySender({
                chat_id: savedData.chat_id,
                text: "Currently No more matching items available."
            });
        }

        // Saving the rest of items in DB.
        await db.getDB().collection('ongoing').updateOne({
            _id: savedData._id
        }, {
            $set: {
                itemDetails: itemDetails
            }
        });

    } catch (error) {
        console.log(error)
    }
}

const sendItemMessage = async (itemsToDisplay, chat_id) => {
    const promises = [];
    itemsToDisplay.forEach(async (itemData) => {
        const displayText = getRetailItemText({
            mrp: "Rs. " + itemData.price.value,
            name: itemData.descriptor.name,
            soldBy: itemData.retail_decriptor.name
        });

        const reply_markup = JSON.stringify({
            inline_keyboard: [
                [
                    {
                        text: "Add to cart",
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
            promises.push(new Promise(async (resolve, reject) => {
                await replySenderWithImage({
                    chat_id: chat_id,
                    text: displayText,
                    reply_markup: reply_markup
                }, imgURL, false);
                resolve("Success");
            }));
        }
        else {
            promises.push(new Promise(async (resolve, reject) => {
                await replySender({
                    chat_id: chat_id,
                    text: displayText,
                    reply_markup: reply_markup
                });
                resolve("Success")
            }))
        }
    });

    const res = await Promise.all(promises);
}

const displayItemCount = 1;

const addToCartCallback = async (chat_id, itemUniqueId) => {
    try {
        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: "Something went Wrong"
                });
                console.log(err)
            } else {
                // TODO: check the next step.
                // If its item select then only allow.

                const cachedData = JSON.parse(reply)
                cachedData['nextStep'] = retailSteps.itemCountStep(itemUniqueId);
                redis.set(chat_id, JSON.stringify(cachedData));
                replySender({
                    chat_id: chat_id,
                    text: retailMsgs.itemCountStep
                });
            }
        });
    } catch (error) {
        console.log(error)
    }
}

const checkoutCallback = async (chat_id, messageId) => {
    try {
        redis.get(chat_id, async (err, reply) => {
            if (err) {
                replySender({
                    chat_id: chat_id,
                    text: "Something went Wrong"
                });
                console.log(err)
            } else {
                // TODO: check the next step.
                // if it is select item, then only allow.
                const cachedData = JSON.parse(reply)

                const savedData = await db.getDB().collection('ongoing').findOne({
                    message_id: messageId
                });

                if (!cachedData.selectedItems) {
                    replySender({
                        chat_id: chat_id,
                        text: "Invalid Call..."
                    });
                    return;
                }

                const selectItemDetails = getSelectItemDetails(savedData.allItemDetails, cachedData.selectedItems);

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
                                text: "Cancel",
                                callback_data: callbackUtils.encrypt({
                                    type: 'retail',
                                    commandType: retailCallBackTypes.cancelCheckout,
                                    id: savedData.message_id
                                })
                            },
                            {
                                text: "Proceed",
                                callback_data: callbackUtils.encrypt({
                                    type: 'retail',
                                    commandType: retailCallBackTypes.proceedCheckout,
                                    id: savedData.message_id
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

                // Set the next step.
                cachedData['nextStep'] = retailSteps.proceedCheckout;
                redis.set(chat_id, JSON.stringify(cachedData));
            }
        });

    } catch (error) {
        console.log(error)
    }
}


const cancelCheckoutCallback = async (chat_id, message_id) => {
    console.log(chat_id, message_id)
    // TODO: Change the nextStep from proceed checkout to item select.
}

const proceedCheckoutCallback = async (chat_id, messageId) => {

    redis.get(chat_id, async (err, reply) => {
        if (err) {
            replySender({
                chat_id: chat_id,
                text: "Something went Wrong"
            });
            console.log(err)
        } else {
            // TODO: check the next step.
            // if it is proceed checkout, then only allow.
            const cachedData = JSON.parse(reply)

            const savedData = await db.getDB().collection('ongoing').findOne({
                message_id: messageId
            });

            if (!cachedData.selectedItems) {
                replySender({
                    chat_id: chat_id,
                    text: "Invalid Call..."
                });
                return;
            }

            const transactionId = savedData.transaction_id;
            const selectedItemDetails = getSelectItemDetails(savedData.allItemDetails, cachedData.selectedItems);
            const itemsForAPICall = [];
            let provderId;
            let providerLocations;
            let bppId, bppUri;
            selectedItemDetails.forEach((itemData) => {
                itemsForAPICall.push({
                    "id": itemData.id,
                    "quantity": {
                        "count": itemData.count
                    }
                });
                provderId = itemData.provder_id
                providerLocations = {
                    "id": itemData.location_id
                }
                bppId = itemData.bpp_id
                bppUri = itemData.bpp_uri
            });

            const addToCartResp = await selectAddToCartAPI({
                transactionId: transactionId,
                messageId: messageId,
                providerId: provderId,
                providerLocations: providerLocations,
                items: itemsForAPICall,
                bppUri: bppUri, bppId: bppId
            });

            if (addToCartResp) {
                // TODO: change the next step in cache.
                // Send message regarding the order.

                cachedData['nextStep'] = retailSteps.waitForQouteCallback;
                redis.set(chat_id, JSON.stringify(cachedData));

                // TODO: Implement this in prod.
                // await db.getDB().collection('ongoing').updateOne({
                //     _id: savedData._id
                // }, {
                //     $set: {
                //         message_id:addToCartResp.context.message_id
                //     }
                // });

                replySender({
                    chat_id:chat_id,
                    text:retailMsgs.proceedCheckout
                });
            }
            else {
                replySender({
                    chat_id: chat_id,
                    text: "Something went wrong."
                });
            }
        }
    });
}

const getSelectItemDetails = (allItemDetails, selectedItems) => {
    const selectItemDetails = [];
    allItemDetails.forEach((itemData) => {
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
const searchForItemsAPI = async (itemName, location) => {
    let reqBody = {
        "context": {
            "domain": retailDomain,
            "core_version": "0.9.3",
            "city": "std:080",
            "country": "IND",
            "bpp_id": "bpp1.beckn.org",
            "bpp_uri": "https://bpp1.beckn.org/rest/V1/beckn/"
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
                            // TODO: make it correct in production.
                            // // ORG Code.
                            // "gps": location

                            // Temp Code 1
                            "gps": "12.4535445,77.9283792"
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
            //TODO: Try removing it.
            "timestamp": (new Date()).toISOString()
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

    // console.log(reqBody)

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

const retailDomain = "nic2004:52110";

const isStepAnItemCount = (stepValue) => {
    const parts = stepValue.split("&&");
    if (parts.length <= 1) {
        return false;
    }

    return (parts[0] == "itemCount")
}

// Util Functions.
const createProviderId = ({
    bpp_id, providerId
}) => {
    return bpp_id + " " + providerId;
}

const createItemId = ({
    bpp_id, providerId, itemId
}) => {
    return bpp_id + " " + providerId + " " + itemId;
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

const retailSteps = {
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
    shipping_same_as_billing_info:"shipping_same_as_billing_info",

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

    shipping_location: "shipping_location"
}

const retailCallBackTypes = {
    next: "Next",
    addToCart: "AddToCart",
    checkout: "CheckOut",
    cancelCheckout: "CancelCheckout",
    proceedCheckout: "Proceed"
}

// These are the text messages for each step.
// Like when asking for location use location msg.
const retailMsgs = {
    location: "Hi! Where do you want to get your items delivered to today?",
    itemName: "Thanks! What would you like to buy?",
    itemSelect: "Here’s what I found near you: ",
    itemCountStep: "Please enter the quantity.",
    proceedCheckout: "Please hang on while we preceeding with your order.",

    billing_name:"Please Enter your billing name.",
    billing_phone:"Please Enter your billing contact number.",

    billing_address_flat_no:"Please enter your  Flat number.",
    billing_address_building:"Please enter your Building Name.",
    billing_address_street:"Please enter your Street Name.",
    billing_address_city:"Please enter your City.",
    billing_address_state: "Please enter your State.",
    billing_address_country:"Please enter your Country.",
    billing_address_area_code:"Please enter your Area Code or Pin Code.",

    billing_email:"Please enter your billing email.",

    shipping_same_as_billing_info:"Is Your billing details same as shipping details.\nEnter *y* for yes.\nEnter *n* for no.",
    
    shipping_email: "Please enter your shipping email.",
    shipping_phone: "Please Enter your shipping contact number.",

    shipping_address_flat_no: "Please enter your Flat number.",
    shipping_address_building: "Please enter your Building Name.",
    shipping_address_street: "Please enter your Street Name.",
    shipping_address_city: "Please enter your City.",
    shipping_address_state: "Please enter your State.",
    shipping_address_country: "Please enter your Country.",
    shipping_address_area_code: "Please enter your Area Code or Pin Code.",

    shipping_location:"Please share your shipping location."
}

module.exports = {
    handleRetail,
    steps: retailSteps,
    msgs: retailMsgs,
    callbackTypes: retailCallBackTypes,
    getRetailItemText,

    // Callbacks
    nextRetailItems,
    addToCartCallback,
    checkoutCallback,
    cancelCheckoutCallback,
    proceedCheckoutCallback,

    displayItemCount,
    sendItemMessage,
    createProviderId,
    createItemId
};