const imageUtils=require('./imageUtils');

// This function will return the image path.
async function createMetroTimeTable(data){
    
    let columns=[
        "Departure Time", "Arrival Time"
    ];
    let keys=[
        "departure_time", 'arrival_time'
    ];

    let tableHtmlCode=htmlWrap(createTable(data.rows, columns, keys), data.route_name, data.price);
    const imageBuffer=await imageUtils.getImageBuffer(tableHtmlCode);
    return imageBuffer;
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

function htmlWrap(htmlCode, routeName, price){
    // Use this for setting styles and all.
    return "<html>"+
        "<style>"+
            "html {"+
                "position: absolute;"+
            "}"+
            ".container{"+
                "padding:50px"+
            "}"+
        "</style>"+
        "<body>"+
            "<div class=\"container\">"+
                "<div>"+
                    "<h2>"+
                        routeName+
                    "</h2>"+
                    "<h3>"+
                        price+
                    "</h3>"+
                "</div>"+
                "<div>"+
                    htmlCode+
                "</div>"+
            "</div>"+
        "</body>"+
    "</html>";
}

const timeTablesFolderPath="D:/Coding/Flutter_Internship/T_Vast/Telegram_Bot/beckn_telegram_v2/public/metroTimeTables";
module.exports={
    createMetroTimeTable,
}