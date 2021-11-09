const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const FormData=require('form-data')
const fs=require('fs')

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
                //TEMP Code.
                replySenderWithImage({
                    "chat_id":data.message.chat.id,
                    "text":"I am glad to find metros for you!\nPlease help me by sending start location."
                }, "D:/Coding/Flutter_Internship/T_Vast/Telegram_Bot/beckn_telegram_v2/testImages/image.png");
            
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

const replySenderWithImage= async (data, photoUri)=>{
    const url=`${process.env.telegramURL}/bot${process.env.telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', data.chat_id);
    formData.append('caption', data.text);
    formData.append("photo", fs.createReadStream(photoUri));
    await formData.submit(url);
}

const metrosSteps={
    "startLocation":"startLocation",
    "endLocation":"endLocation",
    "metrosSearch":"metrosSearch"
}

module.exports={
    handleMetros
}