const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    try {
        console.log('Navigating to watch page ...');
        await page.goto('https://anime3rb.com/episode/beastars-final-season-part-2/1', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        // Find server list
        const watchInfo = await page.evaluate(() => {
            // Find any buttons or list items that might be servers
            const serverBtns = Array.from(document.querySelectorAll('ul.servers-list li, .servers li, .episodes-list a, button.server, .dropdown-item, li[data-server]')).map(el => {
                let href = el.href || el.getAttribute('data-url') || el.getAttribute('data-src') || el.getAttribute('data-server') || '';
                return { text: el.textContent.trim().substring(0, 30), href: href, cls: el.className };
            });

            // Is there a <select> for servers?
            const selects = Array.from(document.querySelectorAll('select')).map(s => {
                return Array.from(s.options).map(o => o.text + ': ' + o.value);
            });

            // Find all links that look like external servers
            const externalLinks = Array.from(document.querySelectorAll('a')).filter(a => {
                return a.href.includes('uqload') || a.href.includes('mp4upload') || a.href.includes('dood') || a.href.includes('ok.ru') || a.href.includes('voe');
            }).map(a => a.href);

            return { serverBtns, selects, externalLinks };
        });

        console.log('\n--- Alternative Servers Found ---');
        console.log(JSON.stringify(watchInfo, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
