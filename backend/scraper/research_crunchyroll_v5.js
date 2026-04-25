const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getDetails(url, lang) {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': lang + ',en-US;q=0.9,en;q=0.8' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    console.error(`Visiting (${lang}): ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise(r => setTimeout(r, 10000));

    const result = await page.evaluate(() => {
        const getSrc = (el) => el ? (el.src || el.getAttribute('data-src') || el.srcset || el.getAttribute('data-thumbnails')) : null;
        
        // Description
        // Looking for the specific description location mentioned: "above the cover and below the 'Start Watching' ح1 button"
        // In the hero section, it's often a p tag or div with a specific class.
        const descEl = document.querySelector('[data-t="series-description"]') || 
                       document.querySelector('.series-description') ||
                       document.querySelector('.description--98r20') || // New class observed in some pages
                       document.querySelector('[class*="description"] p') ||
                       document.querySelector('[class*="description"]');
        
        // Images
        const heroBgImg = document.querySelector('[data-t="series-hero-background"] img')?.src || 
                          document.querySelector('.hero-background--4cfse img')?.src;
        
        const posterImg = document.querySelector('[data-t="series-hero-poster"] img')?.src ||
                          document.querySelector('.hero-poster--1c2R0 img')?.src;

        return {
            title: document.querySelector('h1')?.innerText?.trim(),
            description: descEl?.innerText?.trim(),
            heroBgImg,
            posterImg,
            allHtml: document.body.innerHTML.substring(0, 1000) // just for context
        };
    });

    await browser.close();
    return result;
}

(async () => {
    const seriesId = 'GY8DWQN5Y'; // Golden Kamuy
    const arUrl = `https://www.crunchyroll.com/ar/series/${seriesId}`;
    const enUrl = `https://www.crunchyroll.com/en/series/${seriesId}`;

    const arData = await getDetails(arUrl, 'ar');
    const enData = await getDetails(enUrl, 'en');

    console.log(JSON.stringify({ ar: arData, en: enData }, null, 2));
})();
