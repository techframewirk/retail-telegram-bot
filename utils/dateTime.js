// TODO: change the pattern for date matching.
// Make it exact same.

const { off } = require("./redis");

// https://pretagteam.com/question/js-check-invalid-date
function validatedate(dateString){      
    let dateformat = /^(0?[1-9]|1[0-2])[\.](0?[1-9]|[1-2][0-9]|3[01])[\.]\d{4}$/;      
            
    // Match the date format through regular expression      
    if(dateString.match(dateformat)){      
        let operator = dateString.split('/');      
        
        // Extract the string into month, date and year      
        let datepart = [];      
        if (operator.length>1){      
            pdatepart = dateString.split('/');      
        }      
        let month= parseInt(datepart[0]);      
        let day = parseInt(datepart[1]);      
        let year = parseInt(datepart[2]);      
                
        // Create list of days of a month      
        let ListofDays = [31,28,31,30,31,30,31,31,30,31,30,31];      
        if (month==1 || month>2){      
            if (day>ListofDays[month-1]){      
                ///This check is for Confirming that the date is not out of its range      
                return false;      
            }      
        }else if (month==2){      
            let leapYear = false;      
            if ( (!(year % 4) && year % 100) || !(year % 400)) {      
                leapYear = true;      
            }      
            if ((leapYear == false) && (day>=29)){      
                return false;      
            }else      
            if ((leapYear==true) && (day>29)){      
                console.log('Invalid date format!');      
                return false;      
            }      
        }      
    }else{      
        console.log("Invalid date format!");      
        return false;      
    }      
    return true;      
}   

function isNumber(text){
    let val=parseInt(text);
    if((val==undefined)||(val==null)){
        return false;
    }
    if(Number.isNaN(val)){
        return false;
    }
    return true;
}

function createDateString({
    month, date, year
}){
    date=parseInt(date.toString());
    month=parseInt(month.toString());
    year=parseInt(year.toString());

    let dateText=date.toString();
    if(date<10){
        dateText="0"+dateText;
    }

    let monthText=month.toString();
    if(month<10){
        monthText="0"+monthText;
    }

    let yearText=year.toString();

    return monthText+"."+dateText+"."+yearText;
}

function validate(dateText){
    let parts=dateText.split('.');
    if(parts.length<3){
        return false;
    }
    
    let monthText=parts[0], dayText=parts[1], yearText=parts[2];
    // All should be numbers.
    if(!isNumber(monthText)){
        return false;
    }
    if(!isNumber(dayText)){
        return false;
    }
    if(!isNumber(yearText)){
        return false;
    }
    
    let month=parseInt(monthText)
    let day=parseInt(dayText)
    let year=parseInt(yearText)

    let curr=new Date();
    let todayText=createDateString({
        month: curr.getMonth()+1, date: curr.getDate(), year: curr.getFullYear()
    })
    let todayDate=new Date(todayText);
    let dateTime=new Date(dateText)

    // Date should be atleast today.
    if(dateTime<todayDate){
        return false;
    }

    let dateTestText=createDateString({
        month: dateTime.getMonth()+1, date: dateTime.getDate(), year: dateTime.getFullYear()
    });

    return dateText===dateTestText;
}

module.exports={
    validate,
}

