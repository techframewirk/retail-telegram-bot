const FormData=require('form-data')
const imageUtils=require('./imageUtils');
const fs=require('fs');

const replySenderWithImage= async (data, photoUri)=>{
    const url=`${process.env.telegramURL}/bot${process.env.telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', data.chat_id);
    formData.append('caption', data.text);
    formData.append("photo", fs.createReadStream(photoUri));
    await formData.submit(url);
    imageUtils.deleteImage(photoUri);
}

module.exports={
    replySenderWithImage
}