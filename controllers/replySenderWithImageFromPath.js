const FormData=require('form-data')
const imageUtils=require('./../utils/imageUtils');
const fs=require('fs');

const replySenderWithImageFromPath= async (data, photoUri)=>{
    const url=`${process.env.telegramURL}/bot${process.env.telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', data.chat_id);
    formData.append('caption', data.text);
    if(data.reply_markup){
        formData.append('reply_markup', data.reply_markup)
    }

    formData.append("photo", fs.createReadStream(photoUri));
    await formData.submit(url);
}

module.exports=replySenderWithImageFromPath;