const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://w1.anime4up.rest/episode/sousou-no-frieren-2nd-season-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('anime4up_dom.html', html);
    await browser.close();
})();
