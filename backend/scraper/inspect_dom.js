// Diagnostic extended: inspect episode card DOM (not hero buttons)
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.goto('https://www.crunchyroll.com/ar/series/GP5HJ84P7/gachiakuta', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise(r => setTimeout(r, 15000));

    const result = await page.evaluate(() => {
        // Try to find any element that looks like a playable card for episodes
        const cardSelectors = [
            '.erc-playable-card',
            '.playable-card',
            '.playable-card-static',
            '[data-t="episode-card"]',
            '[class*="playable-card"]',
            '[class*="episode-card"]',
        ];
        
        let foundCards = [];
        for (const sel of cardSelectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
                foundCards.push({ selector: sel, count: els.length, firstHtml: els[0].outerHTML.substring(0, 800) });
            }
        }
        
        // Also check: what class is on the parent of the SECOND /watch/ link (first one is hero)
        const watchLinks = Array.from(document.querySelectorAll('a[href*="/watch/"]'));
        const secondLink = watchLinks[1];
        let secondLinkParents = [];
        if (secondLink) {
            let el = secondLink;
            for (let i = 0; i < 8; i++) {
                el = el.parentElement;
                if (!el) break;
                secondLinkParents.push({ tag: el.tagName, classes: (el.className || "").substring(0, 80), text: (el.innerText || "").substring(0, 100) });
            }
        }

        return { foundCards, secondLinkParents, totalLinks: watchLinks.length };
    });

    process.stderr.write(JSON.stringify(result, null, 2));
    await browser.close();
})();
