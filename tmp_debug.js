const puppeteer = require('puppeteer');

(async () => {
    let browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://w1.anime4up.rest/episode/sousou-no-frieren-2nd-season-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/', { waitUntil: 'networkidle2' });
    
    const htmlSnippet = await page.evaluate(() => {
        // Find the player area or servers list and return outerHTML
        // Actually, just dump classes of anything containing "server" or "watch" or "episode" list
        const servers = document.querySelectorAll('[class*=server], [class*=watch], [id*=server], ul.nav-tabs, div.tab-content');
        let res = [];
        servers.forEach(s => res.push({ tag: s.tagName, className: s.className, innerHTML: s.innerHTML.substring(0, 300) }));
        
        return res;
    });
    
    console.log(JSON.stringify(htmlSnippet, null, 2));
    await browser.close();
})();
