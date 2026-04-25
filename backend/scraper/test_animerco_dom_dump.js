const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox','--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    console.log("Visiting homepage: https://zeta.animerco.org/");
    await page.goto("https://zeta.animerco.org/", { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const episodeUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/episodes/"]'));
        for(let a of links) {
            if(a.href.match(/-\d+\/?$/) && a.href !== 'https://zeta.animerco.org/episodes/') return a.href;
        }
        return null;
    });
    
    if (!episodeUrl) {
        console.log("No episode found.");
        await browser.close();
        return;
    }
    
    console.log("Found episode: ", episodeUrl);
    await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 6000));
    
    const pageHtml = await page.content();
    require('fs').writeFileSync('animerco_dom.html', pageHtml);
    console.log("Saved DOM");
    await browser.close();
})();
