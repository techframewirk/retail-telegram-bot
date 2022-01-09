const regExpForLettersAndSpaces=/^[a-zA-Z\s]*$/;
const regExpForLettersDotsAndSpaces=/^[a-zA-Z\s\.]*$/;
const checkName=(name)=>{
    if(!name){
        return false;
    }
    return regExpForLettersDotsAndSpaces.test(name);
}

const checkInteger=(text)=>{
    const toIntValue=parseInt(text);
    if(!toIntValue){
        return false;
    }

    if(Number.isNaN(toIntValue)){
        return false;
    }

    let pattern = /^\d+$/;
    return pattern.test(toIntValue)
}

module.exports={
    integer:checkInteger,
    name:checkName
}