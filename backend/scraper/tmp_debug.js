const puppeteer = require('puppeteer');

(async () => {
    let browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://w1.anime4up.rest/episode/sousou-no-frieren-2nd-season-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    const htmlSnippet = await page.evaluate(() => {
        const servers = document.querySelectorAll('li, div.nav-tabs, a.download-link, iframe');
        let res = [];
        servers.forEach(s => {
            if(s.tagName === 'IFRAME') res.push({tag: 'IFRAME', src: s.src});
            else if(s.className || s.id) {
                 if (s.className.includes('server') || s.textContent.includes('سيرفر') || s.className.includes('tab'))
                    res.push({ tag: s.tagName, className: s.className, innerText: s.innerText?.substring(0, 50), text: s.textContent.trim().substring(0, 20) });
            }
        });
        
        return res;
    });
    
    console.log(JSON.stringify(htmlSnippet, null, 2));
    await browser.close();
})();
