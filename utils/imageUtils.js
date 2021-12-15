const fs=require('fs');
const path=require('path');
const puppeteer=require('puppeteer');

// Old One
// async function createImageFromHtml(imagePath, htmlCode){
//     try {
//         await nodeHtmlToImage({
//             output:path.resolve(imagePath), html: htmlCode
//         });
//     } catch (error) {
//         console.log(error);
//     }

//     // const dom = new JSDOM(htmlCode);

//     // htmlToImage.toPng(htmlObj)
//     // .then(function (dataUrl) {
//     //     console.log(dataUrl);
//     // //   download(dataUrl, path.resolve(imagePath));
//     // }).catch((err)=>{
//     //     console.log(err);
//     // });
// }

async function getImageBuffer(htmlCode){
    try {
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        await page.setContent(htmlCode);

        const content = await page.$("html");
        const imageBuffer = await content.screenshot({ omitBackground: true });

        await page.close();
        await browser.close();

        return imageBuffer;
    } catch (error) {
        console.log(error)
        return null;
    }
}

async function deleteImage(imagePath){
    try {
        fs.unlinkSync(path.resolve(imagePath));
    } catch (error) {
        console.log(error);
    }
}

module.exports={
     deleteImage, getImageBuffer 
}