const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const url = 'https://www.crunchyroll.com/ar/series/GY8DWQN5Y/golden-kamuy';
    console.error(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise(r => setTimeout(r, 10000));

    const result = await page.evaluate(() => {
        // Look for the initial state script
        const scripts = Array.from(document.querySelectorAll('script'));
        const initialStateScript = scripts.find(s => s.innerText.includes('__INITIAL_STATE__'));
        
        // Find ALL images on the page
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            dataT: img.getAttribute('data-t'),
            classes: img.className
        })).filter(i => i.src.includes('imgsrv.crunchyroll.com'));

        return { 
            hasInitialState: !!initialStateScript,
            images,
            // Try to extract some state data safely
            title: document.querySelector('h1')?.innerText
        };
    });

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})();
