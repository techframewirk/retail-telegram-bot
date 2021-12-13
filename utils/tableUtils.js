const nodeHtmlToImage = require('node-html-to-image');
const imageUtils=require('./imageUtils');

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
    let imagePath=timeTablesFolderPath+'/'+imageFileName;
    let tableHtmlCode=htmlWrap(createTable(tempData, columns, keys));
    await imageUtils.createImageFromHtml(imagePath, tableHtmlCode);
    return imagePath;
}

function createTable(data, columns, keys){
    console.log(columns);
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

const timeTablesFolderPath="D:/Coding/Flutter_Internship/T_Vast/Telegram_Bot/beckn_telegram_v2/public/metroTimeTables";
module.exports={
    createMetroTimeTable,
}