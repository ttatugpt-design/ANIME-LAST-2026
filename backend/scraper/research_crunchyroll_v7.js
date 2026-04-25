const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const url = 'https://www.crunchyroll.com/ar/series/GP5HJ84P7/gachiakuta';
    console.error(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise(r => setTimeout(r, 15000));

    const result = await page.evaluate(() => {
        // Find ALL text nodes in the body and filter for long ones
        const allTexts = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while(node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text.length > 50) {
                const parent = node.parentElement;
                allTexts.push({
                    text: text.substring(0, 500),
                    tag: parent.tagName,
                    classes: parent.className,
                    id: parent.id
                });
            }
        }
        
        // Find ALL images and their srcsets
        const allImages = Array.from(document.querySelectorAll('img, source')).map(el => ({
            tag: el.tagName,
            src: el.src || el.getAttribute('srcset') || el.getAttribute('data-src'),
            dataT: el.getAttribute('data-t'),
            classes: el.className
        })).filter(img => img.src && img.src.includes('imgsrv.crunchyroll.com'));

        return { allTexts, allImages };
    });

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})();
