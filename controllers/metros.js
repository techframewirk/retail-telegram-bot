const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')

const handleMetros=async(cachedData, data)=>{
    switch (cachedData.nextStep) {
        case metrosSteps.startLocation:
            if(data.message.location!=undefined){
                let updateCachedData=cachedData;
                cachedData['nextStep']=metrosSteps.endLocation;
                cachedData[metrosSteps.startLocation]=`${data.message.location.latitude},${data.message.location.longitude}`;
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
                //TODO: make an api call 
                // and reply sender as well.
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

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

const metrosSteps={
    "startLocation":"startLocation",
    "endLocation":"endLocation",
    "metrosSearch":"metrosSearch"
}

module.exports={
    handleMetros
}