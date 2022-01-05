const axios = require('axios').default
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender = require('./replySender');

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
                updateCachedData['nextStep'] = retailSteps.itemDisplay;
                updateCachedData[retailSteps.itemName] = data.message.text;
                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));


                // TODO: call the API.
                const retailSearchResp=await searchForRetail(updateCachedData[retailSteps.itemName], updateCachedData[retailSteps.location]);
                if(retailSearchResp){
                    updateCachedData['onSearchTrigger']=retailSearchResp;
                    updateCachedData['isResolved']=false;
                    updateCachedData['transaction_id']=retailSearchResp.context.transaction_id;
                    updateCachedData['message_id']=retailSearchResp.context.message_id;
                    updateCachedData['callingTime']=retailSearchResp.context.timestamp;
                    
                    await db.getDB().collection('ongoing').insertOne(updateCachedData);
                    
                    replySender({
                        chat_id: data.message.chat.id,
                        text: retailMsgs.itemDisplay
                    });
                }
                else{
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

const retailSteps = {
    location: "location",
    itemName: "itemName",
    itemDisplay: "itemDisplay",
    checkout: "checkout"
}

// These are the text messages for each step.
// Like when asking for location use location msg.
const retailMsgs = {
    location: "Hi! Where do you want to get your items delivered to today?",
    itemName: "Thanks! What would you like to buy?",
    itemDisplay: "Here’s what I found near you: "
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

module.exports = {
    handleRetail, retailSteps, retailMsgs
};