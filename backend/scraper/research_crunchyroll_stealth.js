const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    
    const seriesUrl = "https://www.crunchyroll.com/ar/series/G6VEX91P6/jujutsu-kaisen";

    try {
        console.log(`Navigating to ${seriesUrl} with Stealth...`);
        // Use a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await page.goto(seriesUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        // Wait for content (Crunchyroll is slow)
        await new Promise(r => setTimeout(r, 10000));

        const data = await page.evaluate(() => {
            const getSrc = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return 'N/A';
                return el.src || el.srcset || el.getAttribute('data-src') || el.getAttribute('srcset');
            };

            const title = document.querySelector('h1')?.textContent?.trim() || 
                          document.querySelector('.heading--MA77f')?.textContent?.trim() || 'N/A';
            
            // Try specific crunchyroll selectors
            const poster = getSrc('img[class*="poster"]');
            const banner = getSrc('img[class*="hero-image"]');
            const eps = Array.from(document.querySelectorAll('img[class*="episode-card"]')).map(img => img.src || img.srcset);

            return {
                title,
                poster,
                banner,
                episodeCount: eps.length,
                eps: eps.slice(0, 3)
            };
        });

        console.log("Stealth Result:");
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
})();
