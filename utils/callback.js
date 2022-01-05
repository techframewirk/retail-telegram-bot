const decryptCallbackData=(callbackId)=>{
    const parts=callbackId.split('&&');
    const type=parts[0];
    const commandType=parts[1];
    let id="";
    for(let i=2; i<parts.length; i++){
        id+=parts[i];
    }

    return {
        type,
        commandType,
        id
    }
}


const encryptCallbackData=({
    type, commandType, id
})=>{
    return type+"&&"+commandType+"&&"+id
}


module.exports={
    decrypt: decryptCallbackData,
    encrypt: encryptCallbackData
}