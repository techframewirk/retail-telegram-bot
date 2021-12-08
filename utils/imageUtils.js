const nodeHtmlToImage = require('node-html-to-image');
const fs=require('fs');

async function createImageFromHtml(imagePath, tableHtmlCode){
    await nodeHtmlToImage({
        output:imagePath, html: tableHtmlCode
    });
}

async function deleteImage(imagePath){
    fs.unlinkSync(imagePath);
}

module.exports={
    createImageFromHtml, deleteImage
}