const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    try {
        console.log('Navigating to Beastars ...');
        await page.goto('https://anime3rb.com/titles/beastars-final-season-part-2', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        const info = await page.evaluate(() => {
            // Find episode links
            const episodeLinks = Array.from(document.querySelectorAll('a[href*="/episode/"]')).map(a => {
                return {
                    href: a.href,
                    text: a.textContent.trim(),
                    cls: a.className,
                    parent: a.parentElement ? a.parentElement.className : ''
                };
            });

            return { title: document.title, episodes: episodeLinks };
        });

        console.log('--- Episodes Found ---');
        console.log(`Count: ${info.episodes.length}`);
        info.episodes.forEach((ep, i) => {
            console.log(`${i+1}. Text: "${ep.text}" | URL: ${ep.href}`);
        });

        if (info.episodes.length > 0) {
            console.log(`\nNavigating to first episode: ${info.episodes[0].href} ...`);
            await page.goto(info.episodes[0].href, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 4000));

            const watchInfo = await page.evaluate(() => {
                const servers = Array.from(document.querySelectorAll('ul.servers-list li, .servers-container a, .episodes-list a, .servers a, button, li')).filter(el => {
                    const txt = el.textContent.trim();
                    return el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'LI' || txt.includes('سيرفر');
                }).map(el => {
                    let href = el.href || el.getAttribute('data-url') || el.getAttribute('data-src') || '';
                    if (!href && el.querySelector('a')) {
                        href = el.querySelector('a').href;
                    }
                    return { tagName: el.tagName, text: el.textContent.trim().substring(0, 30), href: href };
                });

                const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);

                return { servers: servers.slice(0, 20), iframes };
            });

            console.log('\n--- Watch Page Info ---');
            console.log('Iframes:');
            watchInfo.iframes.forEach(s => console.log(' ->', s));
            console.log('Servers/Buttons:');
            watchInfo.servers.filter(s => s.text).forEach(s => console.log(`[${s.tagName}] ${s.text} => ${s.href}`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
