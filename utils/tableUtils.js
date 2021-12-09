const nodeHtmlToImage = require('node-html-to-image');
const imageUtils=require('./imageUtils');
const path=require('path');

// This function will return the image path.
async function createMetroTimeTable(data, chat_id){
    
    // TODO: replace it with data from API. 
    let tempData=[
        {
            "name":"Coachin Red Lines",
            "departsAt": "7:30 am", 
            "arrivesAt": "7:45 am",
            "fair":"Rs 20"
        },
        {
            "name":"Coachin Blue Lines",
            "departsAt": "8:30 am", 
            "arrivesAt": "8:45 am",
            "fair":"Rs 20"
        },
        {
            "name":"Coachin Green Line",
            "departsAt": "9:30 am", 
            "arrivesAt": "9:45 am",
            "fair":"Rs 20"
        },
        {
            "name":"Coachin Yellow Line",
            "departsAt": "10:30 am", 
            "arrivesAt": "10:45 am",
            "fair":"Rs 20"
        },
        {
            "name":"Coachin Purple Line",
            "departsAt": "11:30 am", 
            "arrivesAt": "11:45 am",
            "fair":"Rs 20"
        }
    ];

    let columns=[
        "Name", "Departure Time", "Arrival Time", "Fair"
    ];
    let keys=[
        "name", "departsAt", "arrivesAt", "fair"
    ];

    let imageFileName=chat_id+"_"+Date.now().toString()+".png";
    let imagePath=path.resolve('public/metroTimeTables/'+imageFileName);
    let tableHtmlCode=htmlWrap(createTable(tempData, columns, keys));
    await imageUtils.createImageFromHtml(imagePath, tableHtmlCode);
    return imagePath;
}

function createTable(data, columns, keys){
    let tableHeaders=createHeaders(columns);
    let rowsHtml="";
    rowsHtml+=tableHeaders;
    data.forEach((row) => {
        let rowValues=[];
        keys.forEach((key)=>{
            rowValues.push(row[key]);
        });

        rowsHtml+=createRow(rowValues);
    });

    let tableHtml="<table>"+rowsHtml+"</table>"
    return tableHtml;
}

function createHeaders(headings){
    let headerCols="";
    headings.forEach((heading)=>{
        headerCols+="<th>"+heading+"</th>";
    });

    let headerRow="<tr>"+headerCols+"</tr>"
    return headerRow;
}

function createRow(values){
    let rowCols="";
    values.forEach((value)=>{
        rowCols+="<td>"+value+"</td>";  
    });

    let row="<tr>"+rowCols+"</tr>";
    return row;
}

async function createWonderlaTicketsInfo(data, chat_id){
    // TODO: Replace it with actual pricing.

    let rowsHtml="";
    rowsHtml+=head3Text("Adult");
    rowsHtml+=normalText("Rs 846.61 Per Ticket.");
    rowsHtml+=head3Text("Child");
    rowsHtml+=normalText("Rs 761.61 Per Ticket.");
    rowsHtml+=head3Text("Senior Citizen");
    rowsHtml+=normalText("Rs 634.61 Per Ticket.");
    rowsHtml+=head3Text("Fast Track Adult");
    rowsHtml+=normalText("Rs 1269.61 Per Ticket.");
    rowsHtml+=head3Text("Fast Track Child");
    rowsHtml+=normalText("Rs 1142.61 Per Ticket.");

    rowsHtml="<div>"+rowsHtml+"</div>"

    let imageFileName=chat_id+"_"+Date.now().toString()+".png";
    let imagePath=path.resolve('public/wonderlaTicketPricing/'+imageFileName);
    let htmlCode=htmlWrap(rowsHtml);
    await imageUtils.createImageFromHtml(imagePath, htmlCode);
    return imagePath;
}

function head3Text(data){
    return "<h3>"+data+"</h3><br>";
}

function normalText(data){
    return "<div>"+data+"</div><br>";
}

function htmlWrap(htmlCode){
    // Use this for setting styles and all.
    return "<html>"
        +"<style>"+
            "html {"
                +"position: absolute;"
            +"}"
            +".container{"
                +"padding:50px"
            +"}"
        +"</style>"+
        "<body>"
            +"<div class=\"container\">"
                +htmlCode
            +"</div>"
        +"</body>"
    +"</html>";
}

// const timeTablesFolderPath="D:/Coding/Flutter_Internship/T_Vast/Telegram_Bot/beckn_telegram_v2/public/metroTimeTables";
module.exports={
    createMetroTimeTable,
    createWonderlaTicketsInfo
}