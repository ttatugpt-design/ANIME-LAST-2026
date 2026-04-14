const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        await page.goto('https://witanime.life/episode/acca-13-ku-kansatsu-ka-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/', {waitUntil: 'networkidle2'});
        const content = await page.content();
        
        // Find all script tags
        const scripts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script'))
                .map(s => s.textContent)
                .filter(t => t.includes('server_url') || t.includes('loadIframe') || t.includes('ep_id'));
        });
        
        console.log('--- SCRIPTS ---');
        console.log(scripts.join('\n\n'));
        
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
