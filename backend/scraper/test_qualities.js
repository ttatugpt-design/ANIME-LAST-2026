const puppeteer = require('puppeteer');

(async () => {
    const url = 'https://anime3rb.com/episode/beastars-final-season-part-2/1';
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    console.log(`Analyzing: ${url}`);
    
    const mediaUrls = [];
    await page.setRequestInterception(true);
    page.on('request', req => {
        const rUrl = req.url();
        const type = req.resourceType();
        if (type === 'media' || rUrl.includes('.mp4') || rUrl.includes('.m3u8')) {
            mediaUrls.push(rUrl);
            console.log(`[MEDIA] ${rUrl}`);
        }
        req.continue();
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));
        
        // Try to click play
        await page.evaluate(() => {
            const btn = document.querySelector('.vjs-big-play-button, .play-button, [class*="play"]');
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 5000));

        // Look for quality buttons
        const qualities = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('button, li, a'))
                .filter(el => el.textContent.includes('720') || el.textContent.includes('1080') || el.textContent.includes('480'))
                .map(el => ({ text: el.textContent.trim(), tag: el.tagName }));
        });
        console.log('Qualities found in DOM:', qualities);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
