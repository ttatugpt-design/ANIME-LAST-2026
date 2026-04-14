const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // We will monitor network requests
    const urls = [];
    page.on('request', req => {
        const url = req.url();
        if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('/server')) {
            urls.push(url);
        }
    });

    try {
        console.log('Navigating to Anime3rb player IFRAME directly...');
        // Let's use the URL we found earlier
        await page.goto('https://video.vid3rb.com/player/a1797bba-fe2d-4c57-bf0c-f65157d324c2?token=21a6fb83644dd7c279625906d9819ac6dead3cc3af4e0b71bf36ffaf4e3c591f&expires=1776001269&cinema=760', { waitUntil: 'networkidle2', timeout: 60000 });
        
        await new Promise(r => setTimeout(r, 6000));
        
        console.log('\n--- Network Media URLs Captured ---');
        urls.forEach(u => console.log(u));

        // Is there a <video> element?
        const videoSrc = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.src || video.querySelector('source')?.src : 'null';
        });
        
        console.log('\n--- Video Src ---');
        console.log(videoSrc);

    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
