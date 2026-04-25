const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    
    // Arabic as requested
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    });

    try {
        console.log("Navigating to Crunchyroll New Videos...");
        await page.goto("https://www.crunchyroll.com/ar/videos/new", { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        await new Promise(r => setTimeout(r, 8000)); // wait for hydration

        // Dump titles and links for analysis
        const structure = await page.evaluate(() => {
            const results = [];
            // Common crunchyroll card selectors
            const cards = document.querySelectorAll('div[class*="browse-card"], div[class*="playable-card"], .erc-browse-card, .erc-playable-card');
            
            cards.forEach(card => {
                const title = card.querySelector('h4, span[class*="title"], a[class*="title"]')?.textContent?.trim() || 'N/A';
                const link = card.querySelector('a')?.href || 'N/A';
                const img = card.querySelector('img')?.src || card.querySelector('img')?.srcset || 'N/A';
                
                results.push({ title, link, img });
            });

            return {
                cardCount: cards.length,
                samples: results.slice(0, 10),
                bodyClasses: document.body.className
            };
        });

        console.log("Research Result:");
        console.log(JSON.stringify(structure, null, 2));

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
})();
