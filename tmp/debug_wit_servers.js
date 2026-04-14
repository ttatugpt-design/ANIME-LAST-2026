const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    try {
        console.log('Visiting ACCA-13 Ep 1...');
        await page.goto('https://witanime.life/episode/acca-13-ku-kansatsu-ka-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await page.waitForSelector('body');
        
        const data = await page.evaluate(() => {
            const results = [];
            // Check all <a> tags that might be servers
            document.querySelectorAll('a').forEach(a => {
                const text = a.textContent.trim();
                const href = a.href;
                const dataUrl = a.getAttribute('data-url');
                const dataId = a.getAttribute('data-id');
                const className = a.className;
                
                if (className.includes('server') || text.includes('سيرفر') || dataUrl) {
                    results.push({ text, href, dataUrl, dataId, className });
                }
            });
            return results;
        });
        
        console.log(JSON.stringify(data, null, 2));
        
        // Also take a screenshot for visual verification
        await page.screenshot({ path: 'acca13_debug.png', fullPage: true });
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
})();
