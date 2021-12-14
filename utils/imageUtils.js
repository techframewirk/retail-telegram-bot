const nodeHtmlToImage = require('node-html-to-image');
const htmlToImage=require('html-to-image');
const fs=require('fs');
const path=require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function createImageFromHtml(imagePath, htmlCode){
    try {
        await nodeHtmlToImage({
            output:path.resolve(imagePath), html: htmlCode
        });
    } catch (error) {
        console.log(error);
    }

    // const dom = new JSDOM(htmlCode);

    // htmlToImage.toPng(htmlObj)
    // .then(function (dataUrl) {
    //     console.log(dataUrl);
    // //   download(dataUrl, path.resolve(imagePath));
    // }).catch((err)=>{
    //     console.log(err);
    // });
}

async function deleteImage(imagePath){
    fs.unlinkSync(path.resolve(imagePath));
}

module.exports={
    createImageFromHtml, deleteImage
}