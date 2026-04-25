const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    
    const seriesUrl = "https://www.crunchyroll.com/ar/series/G6VEX91P6/jujutsu-kaisen";

    try {
        console.log(`Navigating to ${seriesUrl}...`);
        await page.goto(seriesUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, 5000));

        const data = await page.evaluate(() => {
            const getSrc = (sel) => {
                const el = document.querySelector(sel);
                return el ? (el.src || el.srcset || el.getAttribute('data-src')) : 'N/A';
            };

            return {
                title: document.querySelector('h1')?.textContent?.trim() || 'N/A',
                poster: getSrc('img[class*="poster"]'),
                banner: getSrc('img[class*="hero-image"]'),
                episodes: Array.from(document.querySelectorAll('div[class*="episode-card"] img')).map(img => img.src || img.srcset).slice(0, 5)
            };
        });

        console.log("Series Data:");
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
})();
