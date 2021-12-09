const Razorpay= require('razorpay');

// TODO: change the key and secret in .env
const rzpInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// TODO: add callback url if required.
async function createPaymentLink(amount, name, email, contact, description){
    try {
        const response=await rzpInstance.paymentLink.create({
            amount: amount,
            currency: "INR",
            accept_partial: false,
            description: description,
            customer: {
              name: name,
              email: email,
              contact: contact
            },
            notify: {
              sms: true,
              email: true
            },
            reminder_enable: true,
            notes: {
              policy_name: "Jeevan Bima"
            },

            // TODO: change this as well.
            callback_url: "https://api.getparked.urownsite.xyz/",
            callback_method: "get"
          });

        return response;
    } catch (error) {
        console.log(error);
        return null;
    }
} 

module.exports={
    createPaymentLink
}