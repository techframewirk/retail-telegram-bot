const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender=require('./replySender');
const replySenderWithImage=require('./replySenderWithImage');
const tableUtils=require('./../utils/tableUtils');
const imageUtils=require('./../utils/imageUtils');

const handleBooking = async (cachedData, data) => {
    switch (cachedData.nextStep) {
        case steps.selectLocation:
            const locationNumber=parseInt(data.message.text);
            if((locationNumber!=undefined)&&(!Number.isNaN(locationNumber))&&(locationNumber<=locations.length)){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.selectDate,
                    location:locations[locationNumber-1]
                }));

                replySender({
                    chat_id:data.message.chat.id,
                    text:messages.selectDate
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Invalid Choice. Please try again!"
                });
            }
        break;

        case steps.selectDate:
            const bookingDate=Date.parse(data.message.text);
            if((bookingDate!=undefined)&&(bookingDate!=NaN)){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.adultRegularTickets,
                    bookingDate:bookingDate
                }));

                // Reply sender with this image and then delete it.
                let imagePath=await tableUtils.createWonderlaTicketsInfo([], data.message.chat.id);
                await replySenderWithImage({
                    chat_id:data.message.chat.id,
                    text:messages.adultRegularTickets
                }, imagePath);
                await imageUtils.deleteImage(imagePath);
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Invalid Date Format. Please try again!"
                });
            }
        break;

        case steps.adultRegularTickets:
            {
                const ticketCount=parseInt(data.message.text);
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))){
                    redis.set(data.message.chat.id, JSON.stringify({ 
                        ...cachedData, 
                        nextStep: steps.adultFastrackTickets,
                        adultRegularTickets:ticketCount
                    }));
                    
                    replySender({
                        chat_id:data.message.chat.id,
                        text:messages.adultFastrackTickets
                    });
                }
                else{
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Invalid Number. Please try again!"
                    });
                }
            }
        break;

        case steps.adultFastrackTickets:
            {
                const ticketCount=parseInt(data.message.text);
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))){
                    redis.set(data.message.chat.id, JSON.stringify({ 
                        ...cachedData, 
                        nextStep: steps.childRegularTickets,
                        adultFastrackTickets:ticketCount
                    }));

                    replySender({
                        chat_id:data.message.chat.id,
                        text:messages.childRegularTickets
                    });
                }
                else{
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Invalid Number. Please try again!"
                    });
                }
            }
        break;
        case steps.childRegularTickets:
            {
                const ticketCount=parseInt(data.message.text);
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))){
                    redis.set(data.message.chat.id, JSON.stringify({ 
                        ...cachedData, 
                        nextStep: steps.childFastrackTickets,
                        childRegularTickets:ticketCount
                    }));

                    replySender({
                        chat_id:data.message.chat.id,
                        text:messages.childFastrackTickets
                    });
                }
                else{
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Invalid Number. Please try again!"
                    });
                }
            }
        break;

        case steps.childFastrackTickets:
            {
                const ticketCount=parseInt(data.message.text);
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))){
                    redis.set(data.message.chat.id, JSON.stringify({ 
                        ...cachedData, 
                        nextStep: steps.seniorCitizenTickets,
                        childFastrackTickets:ticketCount
                    }));

                    replySender({
                        chat_id:data.message.chat.id,
                        text:messages.seniorCitizenTickets
                    });
                }
                else{
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Invalid Number. Please try again!"
                    });
                }
            }
        break;
        case steps.seniorCitizenTickets:
            {
                const ticketCount=parseInt(data.message.text);
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))){
                    redis.set(data.message.chat.id, JSON.stringify({ 
                        ...cachedData, 
                        nextStep: steps.firstName,
                        seniorCitizenTickets:ticketCount
                    }));

                    replySender({
                        chat_id:data.message.chat.id,
                        text:messages.firstName
                    });
                }
                else{
                    replySender({
                        chat_id: data.message.chat.id,
                        text: "Invalid Number. Please try again!"
                    });
                }
            }
        break;
        case steps.firstName:{
            const firstNameValue=data.message.text;
            if(firstNameValue!=undefined){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.lastName,
                    firstName:firstNameValue
                }));
                
                replySender({
                    chat_id:data.message.chat.id,
                    text:messages.lastName
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Doesn't look like first name.\nPlease enter your name."
                });
            }
        }
        break;
        case steps.lastName:{
            const lastNameValue=data.message.text;
            if(lastNameValue!=undefined){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.contactInfo,
                    lastName:lastNameValue
                }));
                
                replySender({
                    chat_id:data.message.chat.id,
                    text:messages.contactInfo
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Doesn't look like first name.\nPlease enter your name."
                });
            }
        }
        break;
        case steps.contactInfo:
        {
            //TODO: add the regular expression logic.
            const phoneNumber=data.message.text;
            if(phoneNumber!=undefined){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.emailID,
                    contactInfo:phoneNumber
                }));
                
                console.log({ 
                    ...cachedData, 
                    nextStep: steps.emailID,
                    contactInfo:phoneNumber
                });
                replySender({
                    chat_id:data.message.chat.id,
                    text:messages.emailID
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Doesn't look like your phone number.\nPlease enter your name."
                });
            }
        }
        break;
        case steps.emailID:
        {
            //TODO: add the regular expression logic.
            const emailId=data.message.text;
            if(emailId!=undefined){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.paymentLink,
                    emailId:emailId
                }));
                
                console.log({ 
                    ...cachedData, 
                    nextStep: steps.paymentLink,
                    emailId:emailId
                });
                replySender({
                    chat_id:data.message.chat.id,
                    text:messages.paymentLink("5000", "http://www.google.com")
                });
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Doesn't look like your email address.\nPlease enter your name."
                });
            }
        }
        break;
    }
}

// const replySender = async (data) => {
//     const response = await axios.post(
//         `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
//         data
//     )
// }

const locations=['Kochi', 'Bangalore', 'Hyderabad'];

const steps={
    "wonderlaTicket":"wonderlaticket",
    "selectLocation":"selectLocation",
    "selectDate":"selectDate",
    "adultRegularTickets":"adultRegularTickets",
    "adultFastrackTickets":"adultFastrackTickets",
    "childRegularTickets":"childRegularTickets",
    "childFastrackTickets":"childFastrackTickets",
    "seniorCitizenTickets":"seniorCitizenTickets",
    "firstName":"firstName",
    "lastName":"lastName",
    "contactInfo":"contactInfo",
    "emailID":"emailID",
    "paymentLink":"paymentLink"
};

const messages={
    "wonderlaTicket":"Some welcome message.",
    "selectLocation":"Select Location: \n1. Kochi\n2.Bangalore\n3.Hyderabad\nEnter the number assigned to your desired loction.",
    "selectDate":"Please enter the date for tickets in the given format.\nMM.DD.YYYY",
    "adultRegularTickets":"How many Adult - regular tickets would you like to book?",
    "adultFastrackTickets":"How many Adult - fastrack tickets would you like to book?",
    "childRegularTickets":"How many Child - regular tickets would you like to book?",
    "childFastrackTickets":"How many Child - fastrack tickets would you like to book?",
    "seniorCitizenTickets":"How many Senior Citizen tickets would you like to book?",
    "preOrderConfirmation":"Here is your pre-order confirmation",
    "firstName":"Please share your personal details. What’s your first name?",
    "lastName":"What’s your last name?",
    "contactInfo":"Please share your contact information",
    "emailID":"Please share your email ID",
    "paymentLink":(amount, linkForPayment)=>{
        return "Thank you for the information! Your total cost is: "+amount+" /- Please click on the link below to complete payment.\n\n"+linkForPayment+"\n\nPayment link to be wonderla.stayhalo.in/payment and once the user completes payment they need to be redirected to confirmation message of wonderla.stayhalo.in.\n\nFor any doubts, please refer the flow in https://bookings.wonderla.com/"
    }
}

module.exports={
    steps,
    messages, 
    handleBooking
}