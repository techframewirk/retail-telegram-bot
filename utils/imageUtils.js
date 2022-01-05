const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function createImageBuffer(htmlCode) {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
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

async function deleteImage(imagePath) {
    try {
        fs.unlinkSync(path.resolve(imagePath));
    } catch (error) {
        console.log(error);
    }
}

async function getBufferFromImage(imagePath) {
    let readStream = fs.createReadStream(path.resolve(imagePath));
    console.log(readStream)
    return readStream;
}

module.exports = {
    deleteImage, createImageBuffer, getBufferFromImage
}