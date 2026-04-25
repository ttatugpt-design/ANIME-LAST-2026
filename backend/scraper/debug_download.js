const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('Navigating to download link...');
        // Using the user's provided link (it might be expired, but let's see the page it leads to)
        const url = 'https://anime3rb.com/download/9ae80755-307c-4600-898a-3e5b8db03f79?expires=1776964039&signature=d11b7cdf1709600159a881af32ecdb1ef730a4d6f1882a79c9c5c6fe2816f9e4';
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('Page loaded. Waiting for 5s for any dynamic content...');
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        fs.writeFileSync('download_page.html', html);
        await page.screenshot({ path: 'download_page.png' });
        
        console.log('Screenshot saved to download_page.png');
        console.log('Current URL:', page.url());

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
