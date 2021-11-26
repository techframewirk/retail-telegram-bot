const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')

const handleBooking = async (cachedData, data) => {
    switch (cachedData.nextStep) {
        case steps.selectLocation:
            const locationNumber=parseInt(data.message.text);
            if((locationNumber!=undefined)&&(locationNumber<=locations.length)){
                console.log(locations[locationNumber-1]);
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
        console.log("Code for booking date selection.");    
        break;
    }
}

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

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
    "selectDate":"Please select the date for tickets.",
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