const replySender=require('./replySender')

const wonderlaTicketCallBackController=async(req, res, next)=>{
    try {
        replySender(req.body);
        res.statusCode=200;
        res.json({
            message:"Successfullly"
        });
    } catch (error) {
        console.log(error);
        res.statusCode=400;
        res.json({
            message:"Falied",
            error:error
        });
    }
}

module.exports=wonderlaTicketCallBackController;