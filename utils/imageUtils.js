const nodeHtmlToImage = require('node-html-to-image');
const fs=require('fs');
<<<<<<< HEAD

async function createImageFromHtml(imagePath, tableHtmlCode){
    await nodeHtmlToImage({
        output:imagePath, html: tableHtmlCode
=======
const path=require('path');

async function createImageFromHtml(imagePath, tableHtmlCode){
    await nodeHtmlToImage({
        output:path.resolve(imagePath), html: tableHtmlCode
>>>>>>> 847dfac799f801a64d1a1f5f40412b5358c8330f
    });
}

async function deleteImage(imagePath){
<<<<<<< HEAD
    fs.unlinkSync(imagePath);
=======
    fs.unlinkSync(path.resolve(imagePath));
>>>>>>> 847dfac799f801a64d1a1f5f40412b5358c8330f
}

module.exports={
    createImageFromHtml, deleteImage
}