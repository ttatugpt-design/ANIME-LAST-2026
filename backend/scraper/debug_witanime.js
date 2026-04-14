const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    console.log('Navigating to witanime.life...');
    await page.goto('https://witanime.life/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    const data = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('img').forEach(img => {
            results.push({
                src: img.src,
                dataSrc: img.getAttribute('data-src'),
                srcset: img.getAttribute('srcset'),
                class: img.className
            });
        });
        return results;
    });

    console.log(JSON.stringify(data, null, 2));
    await browser.close();
})();
