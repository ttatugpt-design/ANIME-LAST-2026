const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const url = 'https://eta.animerco.org/seasons/dr_stone-season-1/';
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        const html = await page.content();
        fs.writeFileSync('dr_stone_s1_dump.html', html);
        console.log('Dumped HTML to dr_stone_s1_dump.html');
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
