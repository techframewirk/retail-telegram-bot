const FormData=require('form-data')
const imageUtils=require('./../utils/imageUtils');
const fs=require('fs');

const replySenderWithImage=async(data, photoURI, isBuffer=true)=>{
    try {
        const url=`${process.env.telegramURL}/bot${process.env.telegramToken}/sendPhoto`;
        const formData = new FormData();
        formData.append('chat_id', data.chat_id);
        formData.append('caption', data.text);
        formData.append('parse_mode', 'markdown')
        if(isBuffer){
            // If the provided photo URI is actaully a Buffer.
            formData.append("photo", photoURI, {
                filename:'image.png'
            });    
        }
        else{
            // If it's a URL.
            formData.append("photo", photoURI);
        }

        if(data.reply_markup){
            formData.append('reply_markup', data.reply_markup)
        }

        await formData.submit(url);
    } catch (error) {
        console.log(error);        
    }

}

module.exports=replySenderWithImage
