const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // An example series URL
    const url = "https://ristoanime.co/series/%d8%a7%d9%86%d9%85%d9%8a-%d9%88%d9%86-%d8%a8%d9%8a%d8%b3-one-piece/";
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const episodes = await page.evaluate(() => {
        const result = [];
        // Look for episode links
        document.querySelectorAll('a').forEach(a => {
            if (a.href && a.href.includes('ristoanime.co') && (a.innerText?.includes('الحلقة') || document.querySelector('.EpisodesList') && a.closest('.EpisodesList'))) {
                result.push({ text: a.innerText?.trim(), href: a.href });
            }
        });
        return result;
    });
    
    console.log(JSON.stringify(episodes, null, 2));
    await browser.close();
})();
