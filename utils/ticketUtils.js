const nodeHtmlToImage = require('node-html-to-image');
const imageUtils=require('./imageUtils');
const path=require('path');

async function createWonderlaTicketsInfo(pricesInfo, chat_id, locationName){

    let rowsHtml="";

    rowsHtml+=ticketPriceDiv("Adult", pricesInfo["adultRegularTickets"]["amount"]);
    rowsHtml+=ticketPriceDiv("Child", pricesInfo["childRegularTickets"]["amount"]);
    rowsHtml+=ticketPriceDiv("Senior Citizen", pricesInfo["seniorCitizenTickets"]["amount"]);
    rowsHtml+=ticketPriceDiv("Fast Track Adult", pricesInfo["adultFastrackTickets"]["amount"]);
    rowsHtml+=ticketPriceDiv("Fast Track Child", pricesInfo["childFastrackTickets"]["amount"]);

    // Adjust the size of it.
    let imageFileName=chat_id+"_"+Date.now().toString()+".png";
    let imagePath=path.resolve('public/wonderlaTicketPricing/'+imageFileName);
    // ORG Code.
    let htmlCode=htmlWrap(rowsHtml, locationName);
    
    await imageUtils.createImageFromHtml(imagePath, htmlCode);
    return imagePath;
}

function ticketPriceDiv(ticketTitle, amount){
    return  "<div class='bill-item'>"+
                "<div class='bill-heading'>"+ticketTitle+"</div>"+
                "<div class='bill-price'>Rs. "+amount+" per ticket</div>"+
            "</div>";
}

function htmlWrap(htmlCode, locationName){
    return "<!DOCTYPE html>"+
    "<html>"+
        "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">"+
        "<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>"+
        "<link href=\"https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap\" rel=\"stylesheet\">"+
        "<head>"+
            "<title>image</title>"+
            "<style>"+
                "html{"+
                    "position:absolute;"+
                "}"+
                "body{"+
                    "margin:0;"+
                "}"+
                "h1{"+
                    "margin:0;"+
                    "padding:0;"+
                "}"+
                ".container{"+
                    "background-color: whitesmoke;"+
                    "font-family: 'Roboto', sans-serif;"+
                    "font-weight: 500;"+
                    "padding: 53.76px;"+
                    "padding-bottom: 76.800px;"+
                "}"+
                ".heading1{"+
                    "margin:15.36px;"+
                    "padding:15.36px;"+
                    "margin-top:3px;"+
                    "margin-bottom:3px;"+
                    "padding-top:3px;"+
                    "padding-bottom:3px;"+
                    "font-size:35.72px;"+
                "}"+
                ".heading2{"+
                    "margin:15.36px;"+
                    "padding:15.36px;"+
                    "margin-top:3px;"+
                    "margin-bottom:3px;"+
                    "padding-top:3px;"+
                    "padding-bottom:3px;"+
                    "font-size:30.72px;"+
                    "border-bottom:0.5px solid rgb(204, 203, 203);"+
                "}"+
                ".bill-item{"+
                    "padding:15.36px;"+
                    "display:flex;"+
                    "justify-content: space-between;"+
                "}"+
                ".bill-heading{"+
                    "font-size: 26.11px;"+
                    "padding:15.36px;"+
                    "padding-top:7.68px;"+
                    "padding-bottom:7.68px;"+
                "}"+
                ".bill-price{"+
                    "font-size: 26.11px;"+
                    "font-weight:300;"+
                    "padding:15.36px;"+
                    "padding-top:7.68px;"+
                    "padding-bottom:7.68px;"+
                "}"+
            "</style>"+
        "</head>"+
        "<body>"+
            '<div class="container">'+
                "<div class='heading1'>Wonderla "+locationName+"</div>"+
                "<div class='heading2'>Ticket Prices</div>"+
                
                htmlCode+
            "</div>"+
        "</body>"+
    "</html>";
}

module.exports={
    createWonderlaTicketsInfo
}