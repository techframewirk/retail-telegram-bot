const db = require('../utils/mongo')
const axios = require('axios').default
const redis = require('../utils/redis')

const callBackController = async (req, res, next) => {
    try{
        const data = req.body
        await db.getDB().collection('callbacks').insertOne(data)
        switch(data.context.action) {
            case 'on_search':
                const savedData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id,
                    isResolved: false
                })
                if(savedData != null) {
                    await db.getDB().collection('ongoing').updateOne({
                        _id: savedData._id
                    }, {
                        $set: {
                            onSearchTriggerResult: savedData.onSearchTriggerResult === undefined ? [data] : [...savedData.onSearchTriggerResult, data]
                        }
                    })
                
                    if(getProviders(data, 'pinpark').length>0){
                        const resultDocument = getProviders(data, 'pinpark');
                        let parkingSpaces = resultDocument.items.map(item => {
                            return {
                                chat_id: savedData.chat_id,
                                text: `Name => ${item.descriptor.name}\nPrice => Rs.${item.price.value}\nQuantity Available:${item.quantity.available.count}`,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{
                                            text: "Book",
                                            callback_data: `bookparking-selectparkingslot-${item.location_id}-${item.id}`
                                        }]
                                    ],
                                    "resize_keyboard": true,
                                    "one_time_keyboard": true
                                }
                            }
                        })
                        parkingSpaces.forEach(parkingSpace => {
                            replySender(parkingSpace)
                        })
                        await db.getDB().collection('ongoing').updateOne({
                            _id: savedData._id
                        }, {
                            $set: {
                                parkingResponse: data,
                                parkingLocations: data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark').locations,
                                parkingLocations: data.message.catalog['bpp/providers'].find(provider => provider.id === 'pinpark').items
                            }
                        })
                    }
                    else if(getProviders(data, 'KMRL').length>0){
                        const kmrlProviders=getProviders(data, 'KMRL');
                        kmrlProviders.forEach((providerData)=>{
                            // TODO pass the got from saved data.
                            createDataFroKMRL(providerData, Date.now());
                        });
                        
                        // TODO: use the savedData for extraction and table creation.

                        // TEMP Code for testing.
                        replySender({
                            chat_id:savedData.chat_id,
                            text:JSON.stringify(data.message.catalog['bpp/providers'][0].locations)
                        });


                        // let lstTimeValue;
                        // data.message.catalog['bpp/providers'].forEach((info) => {
                        //     info.items.forEach((item) => {
                        //         item.stops.forEach((stopInfo)=>{
                        //             stopInfo.time.schedule.times.forEach((timeValue)=>{
                        //                 let currTime=new Date(timeValue);
                        //                 if(lstTimeValue!=currTime){
                        //                     console.log(currTime.toString());
                        //                     lstTimeValue=currTime;
                        //                 }
                        //             });
                        //         });
                        //     });
                        // });

                        // data.message.catalog['bpp/providers'].forEach((info)=>{
                        //     console.log(info.items[0].stops[0]);
                        //     console.log(info.items[0].stops[0].time);
                        // });
                    }
                    else {
                        let cabs = []
                        data.message.catalog.items.forEach(cabData => {
                            cabs.push({
                                chat_id: savedData.chat_id,
                                text: `Name => ${cabData.descriptor.code}\nPrice => Rs.${cabData.price.value.integral}`,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{
                                            text: "Book",
                                            callback_data: `bookCab-${cabData.id}`
                                        }]
                                    ],
                                    "resize_keyboard": true,
                                    "one_time_keyboard": true
                                }
                            })
                        })
                        await cabs.forEach(async cab => {
                            await replySender(cab)
                        })
                    }
                } else {
                    if(getProviders(data, 'KMRL').length>0){
                        // TEMP for data creation.
                        let ticketTables=[];
                        const kmrlProviders=getProviders(data, 'KMRL');
                        kmrlProviders.forEach((providerData)=>{
                            ticketTables=[
                                ...ticketTables,
                                ...createDataFroKMRL(providerData, Date.now())
                            ];
                        });
                    }
                    else{
                        console.log('Cab Already Booked!')
                    }
                }
                break
            case 'on_confirm':
                const bookingData = await db.getDB().collection('ongoing').findOne({
                    message_id: data.context.message_id,
                    awaitingConfirmation: true
                })
                if(bookingData != null) {
                    const message = {
                        chat_id: bookingData.chat_id,
                        text: `Payment Amount:${data.message.order.payment.params.amount}\n\nPlease pay using the below link to confirm Parking Spot!\n\n\n${data.message.order.payment.uri}`
                    }
                    await replySender(message)
                    await db.getDB().collection('ongoing').updateOne({
                        _id: bookingData._id
                    }, {
                        $set: {
                            awaitingConfirmation: false,
                            paymentConfirmation: data
                        }
                    })
                }
                break
            case 'on_update':
                const savedData1 = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id
                })
                await db.getDB().collection('booked').insertOne({
                    ...savedData1, updateDriver: data, inProgress: true
                })
                db.getDB().collection('ongoing').deleteOne({
                    _id: savedData1._id
                })
                replySender({
                    chat_id: savedData1.chat_id,
                    text: `The driver has been allocated!\nName: ${data.message.order.trip.driver.name.given_name} ${data.message.order.trip.driver.name.family_name}\nPhone:${data.message.order.trip.driver.phones[0]}\nPrice: Rs.${data.message.order.trip.fare.value.integral}\n\nFind the Tracking link below:\n${data.context.bpp_uri}v1/location?caseId=${data.message.order.trip.id}`
                })
                break
            case 'on_cancel':
                const savedData2 = await db.getDB().collection('ongoing').findOne({
                    transaction_id: data.context.transaction_id
                })
                await db.getDB().collection('booked').updateOne({
                    _id: savedData2._id
                }, { $set: {
                    onCancelTriggerResult: data,
                    inProgress: false
                }})
                replySender({
                    chat_id: savedData2.chat_id,
                    text: `Your booking has been cancelled!\nReason: ${data.message.order.cancellation_reason_id}`
                })
                break
        }
        res.status(200).json({
            'status': 'ok'
        })
    } catch (err) {
        console.log(err)
        next(err)
    }
}

const replySender = async (data) => {
    const response = await axios.post(
        `${process.env.telegramURL}/bot${process.env.telegramToken}/sendMessage`,
        data
    )
}

const createDataFroKMRL=(data, timeStamp)=>{
    const locationsMap={};
    data.locations.forEach(locationData => {
        locationsMap[locationData.id]=locationData;
    });

    // Each item will provide a ticket.
    const ticketTables=[];
    data.items.forEach(itemData => {
        // Each Row Will consist of 
        // Name, price, start, end, departure time, arrival time.
        const ticketTable={
            ticket_id:itemData.id,
            rows:[]
        };
        
        const tableRows=[];
        let start_IndexForTimeStamp=0;
        const startStopData=itemData.stops[0];
        const endStopData=itemData.stops[itemData.stops.length-1];

        for(let i=0; i<startStopData.time.schedule.times.length; i++){
            const timeValue=new Date(startStopData.time.schedule.times[i]);
            if(timeValue>timeStamp){
                start_IndexForTimeStamp=i;
                break;
            }
        }

        for(let i=start_IndexForTimeStamp; i<Math.min(startStopData.time.schedule.times.length, start_IndexForTimeStamp+20); i++){
            tableRows.push({
                name:itemData.descriptor.name,
                start: locationsMap[startStopData.id].descriptor.name,
                end: locationsMap[endStopData.id].descriptor.name,
                departure_time:startStopData.time.schedule.times[i],
                arrival_time:endStopData.time.schedule.times[i],
                price: ((itemData.price.currency=="INR") ? "Rs.": "$") +" "+itemData.price.value
            });
        }

        ticketTable.rows=tableRows;
        ticketTables.push(ticketTable);
    });

    return ticketTables;
}

const getProviders=(data, typeName)=>{
    if(data.message.catalog['bpp/providers']==undefined){
        return [];
    }

    let providersData=[];
    data.message.catalog['bpp/providers'].forEach(providerData => {
        if(providerData.id==typeName){
            providersData.push(providerData);
        }
    });

    return providersData;
}

module.exports = callBackController