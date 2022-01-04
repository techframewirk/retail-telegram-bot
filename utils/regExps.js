const regExpForLettersAndSpaces=/^[a-zA-Z\s]*$/;
const regExpForLettersDotsAndSpaces=/^[a-zA-Z\s\.]*$/;
const isName=(name)=>{
    return regExpForLettersDotsAndSpaces.test(name);
}

const regExpsUtil={
    isName
}
module.exports=regExpsUtil;