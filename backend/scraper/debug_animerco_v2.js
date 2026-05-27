const puppeteer = require('puppeteer');

(async () => {
    const url = 'https://eta.animerco.org/animes/dr-stone/';
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    try {
        console.error(`Navigating to ${url}...`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait a bit for dynamic content
        await new Promise(r => setTimeout(r, 5000));

        const data = await page.evaluate(() => {
            const getText = (el) => el ? el.innerText.trim() : '';
            return {
                title: getText(document.querySelector('h1')),
                seasonsListExists: !!document.querySelector('.seasons-list'),
                seasonsCount: document.querySelectorAll('.seasons-list a').length,
                allLinks: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href })).filter(l => l.href.includes('/animes/')),
                htmlSnippet: document.body.innerHTML.substring(0, 1000)
            };
        });

        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
})();
