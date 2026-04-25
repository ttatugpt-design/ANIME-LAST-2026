const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    try {
        console.log("Navigating to Crunchyroll...");
        await page.goto("https://www.crunchyroll.com/ar/videos/new", { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Wait for potential dynamic content
        await new Promise(r => setTimeout(r, 10000));

        const htmlDump = await page.evaluate(() => {
            // Get a snippet of the page to see classes
            const main = document.querySelector('main') || document.querySelector('#app') || document.body;
            return main.innerHTML.substring(0, 5000); 
        });

        console.log("HTML Snippet:");
        console.log(htmlDump);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
})();
