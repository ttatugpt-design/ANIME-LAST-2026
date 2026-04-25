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
        const hero = document.querySelector('[data-t="series-hero-container"]') || document.querySelector('.series-container--WKpOU');
        if (!hero) return "Hero not found";
        
        // Find all images in hero
        const images = Array.from(hero.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            dataT: img.getAttribute('data-t'),
            parentDataT: img.parentElement?.getAttribute('data-t'),
            classes: img.className
        }));

        // Find all text in hero
        const texts = Array.from(hero.querySelectorAll('h1, h2, h3, h4, p, span')).map(el => ({
            tag: el.tagName,
            text: el.innerText.trim(),
            classes: el.className,
            dataT: el.getAttribute('data-t')
        })).filter(t => t.text.length > 5);

        return { images, texts, htmlSnippet: hero.innerHTML.substring(0, 3000) };
    });

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})();
