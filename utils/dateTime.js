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

const formatWithSpaces=(dateString)=>{
    let parts=dateString.split('.');
    let res="";
    parts.forEach(element => {
       res+=element;
       res+=" "; 
    });

    return res;
}

module.exports={
    validate,
    formatWithSpaces
}

