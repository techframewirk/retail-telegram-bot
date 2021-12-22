const FormData=require('form-data')
const imageUtils=require('./../utils/imageUtils');
const fs=require('fs');

const replySenderWithImage= async (data, photoUri)=>{
    const url=`${process.env.telegramURL}/bot${process.env.telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', data.chat_id);
    formData.append('caption', data.text);
    formData.append("photo", fs.createReadStream(photoUri));
    await formData.submit(url);

    // Code to delet image.
    // imageUtils.deleteImage(photoUri);
}

const replySenderWithBufferImage=async(data, imageBuffer)=>{
    try {
        
        const url=`${process.env.telegramURL}/bot${process.env.telegramToken}/sendPhoto`;
        const formData = new FormData();
        formData.append('chat_id', data.chat_id);
        formData.append('caption', data.text);
        formData.append("photo", imageBuffer, {
            filename:'image.png'
        });
        await formData.submit(url);
    } catch (error) {
        console.log(error);        
    }

}

module.exports=replySenderWithBufferImage
