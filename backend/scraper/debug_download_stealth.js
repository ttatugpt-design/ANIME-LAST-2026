const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });

    try {
        console.log('Navigating to download link with stealth...');
        const url = 'https://anime3rb.com/download/9ae80755-307c-4600-898a-3e5b8db03f79?expires=1776964039&signature=d11b7cdf1709600159a881af32ecdb1ef730a4d6f1882a79c9c5c6fe2816f9e4';
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('Initial page loaded. Current URL:', page.url());
        await page.screenshot({ path: 'debug_step1.png' });

        // Wait for Cloudflare to pass. We look for something that is NOT the Cloudflare challenge.
        // Usually, the redirect page has a specific class or text.
        console.log('Waiting for verification to pass...');
        await new Promise(r => setTimeout(r, 10000));
        
        await page.screenshot({ path: 'debug_step2.png' });
        
        const html = await page.content();
        fs.writeFileSync('debug_download.html', html);

        // Find the button
        const buttonInfo = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('a, button'));
            return btns.map(b => ({
                text: b.innerText || b.textContent,
                tag: b.tagName,
                href: b.href || '',
                id: b.id,
                class: b.className
            })).filter(b => b.text.includes('تحميل') || b.text.includes('Download'));
        });

        console.log('Found buttons:', JSON.stringify(buttonInfo, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
