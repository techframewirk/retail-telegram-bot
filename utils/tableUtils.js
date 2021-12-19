const imageUtils=require('./imageUtils');

// This function will return the image path.
async function createMetroTimeTable(data){
    let timingRows="";
    data.rows.forEach(rowData => {
        timingRows+=createTimingRows(rowData);
    });

    let tableHtmlCode=htmlWrap(data.route_name, data.price, 5, timingRows)
    const imageBuffer=await imageUtils.getImageBuffer(tableHtmlCode);
    return imageBuffer;
}

function createTimingRows({
    departure_time,
    arrival_time
}){
    return '<div class="contain">'+
        '<div class="box-time-new">'+
            '<div class="box left-box">'+
                '<div class="top">'+
                    'Departs at'+
                '</div>'+
                '<div class="bottom">'+
                    departure_time+
                '</div>'+
            '</div>'+
            '<div class="center">'+
                '<i class="fas fa-long-arrow-alt-right"></i>'+
            '</div>'+
            '<div class="box right-box">'+
                '<div class="top">'+
                    'Arrival at'+
                '</div>'+
                '<div class="bottom">'+
                    arrival_time+
                '</div>'+
            '</div>'+
        '</div>'+
    '</div>';
}

function htmlWrap(title, price, time, rows){
    return '<!DOCTYPE html>'+
    '<html>'+
    
    '<head>'+
        '<script src="https://kit.fontawesome.com/db287357b6.js" crossorigin="anonymous"></script>'+
        '<link rel="preconnect" href="https://fonts.googleapis.com">'+
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
        '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">'+
        '<title>'+
            'table'+
        '</title>'+
        '<style>'+
            'html {'+
                'width: 450px;'+
                'position: absolute;'+
            '}'+
    
            'body {'+
                'margin: 0;'+
                'padding-top: 15px;'+
                'padding-bottom: 25px;'+
            '}'+
    
            '.container {'+
                'padding-left: 25px;'+
                'padding-right: 25px;'+
                'font-family: "Roboto", sans-serif;'+
            '}'+
    
            '.box-destination {'+
                'margin-top: 10px;'+
                'margin-bottom: 15px;'+
                'margin-left: 15px;'+
                'margin-right: 15px;'+
            '}'+
    
            '.destination {'+
                'text-align: left;'+
                'padding: 10px 0px;'+
                'margin: 5px;'+
                'font-size: 25px;'+
                'font-weight: 500;'+
                'color: rgb(35, 35, 35);'+
            '}'+
    
            '.flex-box {'+
                'display: flex;'+
                'justify-content: space-between;'+
                'margin: 0px 0px;'+
                'width: 100%;'+
            '}'+
    
            '.flex-child {'+
                'border: 2.5px solid rgb(240, 240, 240);'+
                'border-radius: 10px;'+
                'padding: 6px 10px;'+
                'margin: 0px;'+
                'text-align: center;'+
            '}'+
    
            '.flex-child span{'+
                'font-weight: 500;'+
            '}'+
    
            '.flex-mid {'+
                'padding: 6px;'+
                'margin: 3px;'+
            '}'+
    
            '.divider {'+
                'width: 100%;'+
                'border-bottom: 2.5px rgb(223, 223, 223) solid;'+
                'margin: 10px 0px;'+
            '}'+
    
            '.contain {'+
                'display: flex;'+
                'justify-content: center;'+
                'margin: 5px 15px;'+
                'color: rgb(35, 35, 35);'+
            '}'+
    
            '.box-time-new {'+
                'width: 100%;'+
                'border: 2.5px solid rgb(223, 223, 223);'+
                'margin-top: 2px;'+
                'margin-bottom: 2px;'+
                'padding: 10px;'+
                'display: flex;'+
                'justify-content: space-evenly;'+
                'border-radius: 10px;'+
            '}'+
    
            '.center {'+
                'display: flex;'+
                'align-items: center;'+
                'font-size: 25px;'+
                'color: rgb(75, 75, 75);'+
                'justify-content: center;'+
                'padding: 0px 2.5px;'+
            '}'+
    
            '.box {'+
                'padding: 5px 7.5px;'+
                'display: flex;'+
                'justify-content: center;'+
                'align-items: center;'+
            '}'+
    
            '.left-box {'+
                'text-align: right;'+
            '}'+
    
            '.right-box {'+
                'text-align: left;'+
            '}'+
    
            '.top {'+
                'font-size: 12.5px;'+
                'color: rgb(75, 75, 75);'+
                'padding: 2.5px;'+
            '}'+
    
            '.bottom {'+
                'font-size: 14px;'+
                'font-weight: 500;'+
                'padding: 2.5px;'+
            '}'+
        '</style>'+
    '</head>'+
    
    '<body>'+
        '<div class="container">'+
            
            '<div class="box-destination">'+
                '<div class="destination">'+title+'</div>'+
                '<div class="flex-box">'+
                    '<div class="flex-child"><span>Fair:</span> '+price+'</div>'+
                    '<div class="flex-mid"></div>'+
                    '<div class="flex-child"><span>Time:</span> '+time+' mins</div>'+
                '</div>'+
            '</div>'+
            '<div class="divider"></div>'+

            rows+

        '</div>'+
    '</body>'+
    '</html>';
}

const timeTablesFolderPath="D:/Coding/Flutter_Internship/T_Vast/Telegram_Bot/beckn_telegram_v2/public/metroTimeTables";
module.exports={
    createMetroTimeTable,
}