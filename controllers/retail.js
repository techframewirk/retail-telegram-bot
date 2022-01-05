const axios = require('axios').default
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender = require('./replySender');
const replySenderWithImage=require('./replySenderWithImage')
const {ObjectId}=require('mongodb')
const callbackUtils=require('../utils/callback')

const handleRetail = async (cachedData, data) => {
    switch (cachedData.nextStep) {
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
                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));

                // TODO: call the API.
                const retailSearchResp = await searchForRetail(updateCachedData[retailSteps.itemName], updateCachedData[retailSteps.location]);
                if (retailSearchResp) {
                    updateCachedData['onSearchTrigger'] = retailSearchResp;
                    updateCachedData['isResolved'] = false;
                    updateCachedData['transaction_id'] = retailSearchResp.context.transaction_id;
                    updateCachedData['message_id'] = retailSearchResp.context.message_id;
                    updateCachedData['callingTime'] = retailSearchResp.context.timestamp;

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
    }
}

const nextRetailItems = async (data, callbackData) => {
    try {
        const savedDataId=callbackData.id;
        const savedData=await db.getDB().collection('ongoing').findOne({
            _id: ObjectId(savedDataId)
        })

        let itemsToDisplay=[];
        let itemDetails=[...savedData.itemDetails];
        if(itemDetails.length>displayItemCount){
            itemsToDisplay = itemDetails.slice(0, displayItemCount);
            itemDetails = itemDetails.slice(displayItemCount);
        }
        else {
            itemsToDisplay = itemDetails;
            itemDetails = [];
        }
        
        if(itemsToDisplay.length>0){
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
                                    type:'retail',
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
        else{
            replySender({
                chat_id:savedData.chat_id,
                text:"Currently No more matching items available."
            });
        }
        
        // Saving the rest of items in DB.
        await db.getDB().collection('ongoing').updateOne({
            _id:savedData._id
        }, {
            $set:{
                itemDetails:itemDetails
            }
        });

    } catch (error) {
        console.log(error)
    }
}

const retailSteps = {
    location: "location",
    itemName: "itemName",
    itemSelect: "itemSelect",
    checkout: "checkout"
}

const retailCallBackTypes={
    next:"Next",
    addToCart:"AddToCart"
}

// These are the text messages for each step.
// Like when asking for location use location msg.
const retailMsgs = {
    location: "Hi! Where do you want to get your items delivered to today?",
    itemName: "Thanks! What would you like to buy?",
    itemSelect: "Here’s what I found near you: "
}

const searchForRetail = async (itemName, location) => {
    let reqBody = {
        "context": {
            "domain": "nic2004:52110",
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

const sendItemMessage=async(itemsToDisplay, chat_id)=>{
    const promises=[];
    itemsToDisplay.forEach(async (itemData) => {
        const displayText = getRetailItemText({
            mrp: "Rs " + itemData.price.value,
            short_desc: itemData.descriptor.name,
            soldBy: itemData.retail_decriptor.name
        });

        const reply_markup = JSON.stringify({
            inline_keyboard: [
                [
                    {
                        text: "Add to cart",
                        callback_data: callbackUtils.encrypt({
                            type:'retail',
                            commandType: retailCallBackTypes.addToCart,
                            id: itemData.id
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
            promises.push(new Promise(async (resolve, reject)=> {
                await replySenderWithImage({
                    chat_id: chat_id,
                    text: displayText,
                    reply_markup: reply_markup
                }, imgURL, false);
                resolve("Success");
            }));
        }
        else {
            promises.push(new Promise(async (resolve, reject)=> {
                await replySender({
                    chat_id: chat_id,
                    text: displayText,
                    reply_markup: reply_markup
                });
                resolve("Success")
            }))
        }
    });

    const res=await Promise.all(promises);
}

const displayItemCount=1;

const getRetailItemText = ({
    short_desc, mrp, soldBy
}) => {
    return short_desc + "\n" + "MRP: " + mrp + "\n" + "Slod By: " + soldBy;
}

module.exports = {
    handleRetail,
    steps: retailSteps,
    msgs: retailMsgs,
    callbackTypes: retailCallBackTypes,
    getRetailItemText,
    nextRetailItems,
    displayItemCount,
    sendItemMessage
};