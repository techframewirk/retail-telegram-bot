const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const FormData=require('form-data')
const fs=require('fs')
const tableUtils=require('./../utils/tableUtils');
const replySender=require('./replySender');
const replySenderWithImage=require('./replySenderWithImage');

const handleMetros=async(cachedData, data)=>{
    switch (cachedData.nextStep) {
        case metrosSteps.startLocation:
            if(data.message.location!=undefined){
                let updateCachedData=cachedData;
                cachedData['nextStep']=metrosSteps.endLocation;
                cachedData[metrosSteps.startLocation]=`${data.message.location.latitude}, ${data.message.location.longitude}`;
                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Thanks for that! Similarly, please send me the end location."
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a location! Please try again!"
                });
            }
            break;
        case metrosSteps.endLocation:
            if(data.message.location!=undefined){
                let updateCachedData=cachedData;
                cachedData['nextStep']=metrosSteps.sendSearchResults;
                cachedData[metrosSteps.endLocation]=`${data.message.location.latitude}, ${data.message.location.longitude}`;
                redis.set(data.message.chat.id, JSON.stringify(updateCachedData));
                
                //TEMP Code.
                // let imagePath=await tableUtils.createMetroTimeTable([], data.message.chat.id);     
                // replySenderWithImage({
                //     "chat_id":data.message.chat.id,
                //     "text":"Metro Time Table."
                // }, imagePath);
            
                // ORG Code.
                const searchResponse=await searchForMetros(updateCachedData[metrosSteps.startLocation], updateCachedData[metrosSteps.endLocation]);
                if(searchResponse!=null){
                    // Take the transaction_id and message_id store the whole data in db.
                    updateCachedData['onSearchTrigger']=searchResponse;
                    updateCachedData['isResolved']=false;
                    updateCachedData['transaction_id']=searchResponse.context.transaction_id;
                    updateCachedData['message_id']=searchResponse.context.message_id;

                    await db.getDB().collection('ongoing').insertOne(updateCachedData);

                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Please Hang on while we are searching for metros for you."
                    });
                }
                else{
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Something went wrong."
                    });
                }
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "That does not seem like a location! Please try again!"
                });
            }
        break;
    }
}

const searchForMetros=async (startLocation, endLocation)=>{
    // TODO: must change the coordinates.
    let reqBody = {
        "context": {
            "domain": "nic2004:60212",
            "country": "IND",
            "action": "search",
            "core_version": "0.9.1"
        },
        "message": {
            "intent" : {
                "fulfillment": {
                    "start" : {
                        "location" : {
                            // // ORG Code.
                            // "gps" : startLocation
                            
                            // // TEMP Code 1.
                            // "gps" : "10.109289, 76.349601"
                            
                            // TEMP Code 2.
                            "gps":"10.054072, 76.312286"
                        }
                    },
                    "end" : {
                        "location" : {
                            // // ORG Code.
                            // "gps" : endLocation
                            
                            // // TEMP Code.
                            // "gps" : "10.087307, 76.342809",

                            "gps":"9.853153, 76.272083"
                        }
                    }
                }
            }
        } 
    };

    try {
        const response=await axios.post(
            `${process.env.becknService}/trigger/search`,
            reqBody
        );

        return response.data;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const metrosSteps={
    "startLocation":"startLocation",
    "endLocation":"endLocation",
    "metrosSearch":"metrosSearch",
    "sendSearchResults":"sendSearchResults"
}

module.exports={
    handleMetros
}