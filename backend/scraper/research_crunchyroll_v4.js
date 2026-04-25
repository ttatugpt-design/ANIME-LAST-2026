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
        const results = {};
        
        // 1. Banner Image (Hero Background)
        const bannerEls = [
            '.erc-series-hero__background img',
            '[data-t="hero-image"]',
            '.erc-series-hero__background',
            '[class*="hero__background"]'
        ];
        results.bannerCandidates = bannerEls.map(sel => {
            const el = document.querySelector(sel);
            return {
                selector: sel,
                found: !!el,
                tagName: el?.tagName,
                src: el?.src || el?.style?.backgroundImage || el?.getAttribute('srcset') || null
            };
        });

        // 2. Poster Image
        const posterEls = [
            '[data-t="poster-image"] img',
            '.erc-series-hero__poster img',
            '.poster-image img'
        ];
        results.posterCandidates = posterEls.map(sel => {
            const el = document.querySelector(sel);
            return {
                selector: sel,
                found: !!el,
                src: el?.src || el?.getAttribute('srcset') || null
            };
        });

        // 3. Description
        const descEls = [
            '[data-t="series-description"]',
            '.erc-series-hero__description',
            '.series-description',
            '[class*="description"]'
        ];
        results.descriptionCandidates = descEls.map(sel => {
            const el = document.querySelector(sel);
            return {
                selector: sel,
                found: !!el,
                text: el?.innerText?.trim()?.substring(0, 200)
            };
        });

        // 4. Hero Content (Start Watching area)
        const heroSection = document.querySelector('.erc-series-hero, [class*="series-hero"]');
        results.heroHtml = heroSection?.innerHTML?.substring(0, 2000);

        return results;
    });

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})();
