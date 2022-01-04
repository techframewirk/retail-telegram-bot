const axios = require('axios').default
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender=require('./replySender');

const handleRetail = async (cachedData, data) => {
    switch(cachedData.nextStep){
        case retailSteps.location:
            if(data.message.location!=undefined){
                let updateCachedData=cachedData;
                cachedData['nextStep']=retailSteps.itemName;
                cachedData[retailSteps.location]=`${data.message.location.latitude}, ${data.message.location.longitude}`;
                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text:  retailMsgs.itemName
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a location! Please try again!"
                });
            }
            break;
        case retailSteps.itemName:
            // Call the API but save this data with response in mongoDb as well after API call
            break;
    }
}

const retailSteps={
    location:"location",
    itemName:"itemName"
}

// These are the text messages for each step.
// Like when asking for location use location msg.
const retailMsgs={
    location:"Hi! Where do you want to get your items delivered to today?",
    itemName:"Thanks! What would you like to buy?",
    itemDisplay:"Here’s what I found near you: "
}

module.exports={
    handleRetail, retailSteps, retailMsgs
};