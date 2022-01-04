const axios = require('axios').default
const validations = require('./validations')
const redis = require('../utils/redis')
const db = require('../utils/mongo')
const replySender=require('./replySender');
const replySenderWithImage=require('./replySenderWithImage');
const ticketUtils=require('./../utils/ticketUtils');
const imageUtils=require('./../utils/imageUtils');
const dateTimeUtils=require('./../utils/dateTime');

const handleBooking = async (cachedData, data) => {
    switch (cachedData.nextStep) {
        case steps.selectLocation:
            const locationNumber=parseInt(data.message.text);
            if((locationNumber!=undefined)&&(!Number.isNaN(locationNumber))&&(isNumberValid(data.message.text))){
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
            let bookingDate=null; 
            try {
                if(dateTimeUtils.validate(data.message.text)){
                    bookingDate=Date.parse(dateTimeUtils.formatWithSpaces(data.message.text));
                }
            } catch (error) {
                console.log(error);
            }
            
            console.log(bookingDate);
            if((bookingDate!=null)&&(bookingDate!=NaN)){
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Hang on while we are searching."
                }); 

                let pricesInfo=await getTicketPricing(cachedData.location, data.message.text);
                console.log(pricesInfo);
                try {
                    if(Object.keys(pricesInfo).length>0){
                        console.log("Creating Image...");
                        let imageBuffer=await ticketUtils.createWonderlaTicketsInfo(pricesInfo, data.message.chat.id, cachedData.location);
                        if(imageBuffer!=null){
                            await replySenderWithImage({
                                chat_id:data.message.chat.id,
                                text:messages.adultRegularTickets
                            }, imageBuffer);

                            redis.set(data.message.chat.id, JSON.stringify({ 
                                ...cachedData, 
                                nextStep: steps.adultRegularTickets,
                                bookingDate:bookingDate,
                                pricesInfo:pricesInfo
                            }));
                        }
                        else{
                            await replySender({
                                chat_id: data.message.chat.id,
                                text: "Something went wrong."
                            });   
                        }
                    }
                    else{
                        await replySender({
                            chat_id: data.message.chat.id,
                            text: "No Information Currently Available.\nSelect another date."
                        });   
                    }
                } catch (error) {
                    await replySender({
                        chat_id: data.message.chat.id,
                        text: "Something went wrong."
                    });   
                }
            }
            else{
                replySender({
                    chat_id: data.message.chat.id,
                    text: "Invalid Date. Please try again!"
                });   
            }
        break;

        case steps.adultRegularTickets:
            {
                const ticketCount=parseInt(data.message.text);
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))&&(isNumberValid(data.message.text))){
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
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))&&(isNumberValid(data.message.text))){
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
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))&&(isNumberValid(data.message.text))){
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
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))&&(isNumberValid(data.message.text))){
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
                if((ticketCount!=undefined)&&(!Number.isNaN(ticketCount))&&(isNumberValid(data.message.text))){
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
                    text:messages.contactInfo,
                    reply_markup: {
                        keyboard: [
                            [{
                                "text": "Send Contact",
                                "request_contact": true
                            }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
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
            if((data.message.contact!=undefined)&&(data.message.contact!=null)&&(data.message.contact.phone_number!=undefined)&&(data.message.contact.phone_number!=null)){
                const phoneNumber=data.message.contact.phone_number;
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.emailID,
                    contactInfo:phoneNumber
                }));

                console.log(data.message.contact);

                replySender({
                    chat_id:data.message.chat.id,
                    text:messages.emailID
                });
            }
            else{
                replySender({
                    chat_id:data.message.chat.id,
                    text:"It doesn't look like your contact. \nTry once again.",
                    reply_markup: {
                        keyboard: [
                            [{
                                "text": "Send Contact",
                                "request_contact": true
                            }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
            }
        }
        break;
        case steps.emailID:
        {
            let isEmailThere=false;
            if(typeof (data.message.entities) != 'undefined'){
                data.message.entities.forEach(entity => {
                    if(entity.type=='email'){
                        isEmailThere=true;
                    }
                });
            }

            const emailId=data.message.text;
            if((emailId!=undefined)&&(isEmailThere)){
                redis.set(data.message.chat.id, JSON.stringify({ 
                    ...cachedData, 
                    nextStep: steps.paymentLink,
                    emailId:emailId
                }));

                const bookingResponse=await bookTicket({
                    ...cachedData, emailId:emailId
                });

                // Add link to response.
                if((bookingResponse!=null)&&(bookingResponse.success)){
                    console.log(bookingResponse);
                    replySender({
                        chat_id:data.message.chat.id,
                        text:messages.paymentLink(bookingResponse.paymentURL)
                    });
                }
                else{
                    replySender({
                        chat_id:data.message.chat.id,
                        text:"Something went wrong..."
                    });
                }

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

const getTicketPricing=async (currLocation, bookingDate) => {
    const bookingDateAsString=(new Date(bookingDate+" 08:00:00 AM")).toISOString();
    // const bookingDateAsString=(new Date()).toISOString();
    const response=await axios.get("https://wonderlaapi.stayhalo.in/prices?date="+bookingDateAsString);
    const pricesInfo={};
    if(response.status!=200){
        return null;
    }

    console.log(response.data);
    try {
        response.data.result.forEach((price)=>{
            if(price.product.location==currLocation){
                let key="";
                if(price.product.type=='Regular'){
                    if(price.type=='Adult'){
                        key=steps.adultRegularTickets;
                    }
                    else if(price.type=='Child'){
                        key=steps.childRegularTickets;
                    }
                    else if(price.type=='Senior Citizen'){
                        key=steps.seniorCitizenTickets;
                    }
                }
                else{
                    if(price.type=='Adult'){
                        key=steps.adultFastrackTickets;
                    }
                    else if(price.type=='Child'){
                        key=steps.childFastrackTickets;
                    }
                }
    
    
                pricesInfo[key]={
                    ticket_id:price._id,
                    amount: price.amount
                }
            }
        });
    
        return pricesInfo;
    
    } catch (error) {
        console.log(error);
        return null;        
    }
}

const bookTicket=async(bookingData)=>{
    const pricesInfo=bookingData.pricesInfo;
    const tickets=[];
    for(let ticketType in pricesInfo){
        if(bookingData[ticketType]>0){
            tickets.push({
                "ticket":pricesInfo[ticketType]["ticket_id"],
                "quantity":bookingData[ticketType]
            });   
        }
    }

    const customerData={
        "firstName":bookingData.firstName,
        "lastName":bookingData.lastName,
        "mobile":bookingData.contactInfo,
        "email":bookingData.emailId,
        "generateInvoice":true
    }

    const reqBody={
        "activityDate":(new Date()).toISOString(),
        "tickets":tickets,
        "customer":customerData
    }

    // console.log(reqBody);

    try {
        const bookingResponse=await axios.post("https://wonderlaapi.stayhalo.in/bookings", reqBody);
        if(bookingResponse.status==200){
            return bookingResponse.data;
        }  
        else{
            return null;
        }
    } catch (error) {
        return null;
    }
}

const locations=['Kochi', 'Bangalore', 'Hyderabad'];

function isNumberValid(val){
    let pattern = /^\d+$/;
    return pattern.test(val)
}

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
    "selectLocation":"Select Location: \n1. Kochi\n2. Bangalore\n3. Hyderabad\nEnter the number assigned to your desired location.",
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
    "paymentLink":(linkForPayment)=>{
        return "Thank you for the information! \nPlease click on the link below to complete payment.\n\n"+linkForPayment+"\n\nPayment link to be wonderla.stayhalo.in/payment and once the user completes payment they need to be redirected to confirmation message of wonderla.stayhalo.in.\n\nFor any doubts, please refer the flow in https://bookings.wonderla.com/"
    }
}

module.exports={
    steps,
    messages, 
    handleBooking
}