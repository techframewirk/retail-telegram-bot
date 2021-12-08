const nodeHtmlToImage = require('node-html-to-image');
const fs=require('fs');
const path=require('path');

async function createImageFromHtml(imagePath, tableHtmlCode){
    await nodeHtmlToImage({
        output:path.resolve(imagePath), html: tableHtmlCode
    });
}

async function deleteImage(imagePath){
    fs.unlinkSync(path.resolve(imagePath));
}

module.exports={
    createImageFromHtml, deleteImage
}