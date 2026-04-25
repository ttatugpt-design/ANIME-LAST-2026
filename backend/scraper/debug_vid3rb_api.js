const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Debug script: open an episode page and capture ALL network calls
// especially from the vid3rb player iframe
(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    const capturedLinks = [];
    
    await page.setRequestInterception(true);
    page.on('request', req => {
        const u = req.url();
        // Log vid3rb related requests
        if (u.includes('vid3rb') || u.includes('/files/') || u.includes('.mp4')) {
            console.log('[REQUEST]', req.resourceType(), u.substring(0, 200));
        }
        req.continue();
    });

    page.on('response', async resp => {
        const u = resp.url();
        if (u.includes('vid3rb') || u.includes('/source') || u.includes('/api/')) {
            const ct = resp.headers()['content-type'] || '';
            console.log('[RESPONSE]', resp.status(), u.substring(0, 200));
            if (ct.includes('json')) {
                const text = await resp.text().catch(() => '');
                if (text.includes('mp4') || text.includes('vid3rb')) {
                    console.log('[JSON]', text.substring(0, 500));
                }
            }
        }
    });

    // Listen on all frames
    browser.on('targetcreated', async target => {
        const newPage = await target.page();
        if (!newPage) return;
        await newPage.setRequestInterception(true).catch(() => {});
        newPage.on('request', req => {
            const u = req.url();
            if (u.includes('vid3rb') || (u.includes('.mp4') && u.includes('files-'))) {
                console.log('[NEW PAGE REQUEST]', u.substring(0, 300));
                capturedLinks.push(u);
            }
            req.continue().catch(() => {});
        });
        newPage.on('response', async resp => {
            const u = resp.url();
            if (u.includes('vid3rb')) {
                const ct = resp.headers()['content-type'] || '';
                console.log('[NEW PAGE RESPONSE]', resp.status(), u.substring(0, 200));
                if (ct.includes('json')) {
                    const text = await resp.text().catch(() => '');
                    if (text.length < 2000) console.log('[JSON DATA]', text);
                }
            }
        });
    });

    try {
        console.log('Loading episode page...');
        await page.goto('https://anime3rb.com/episode/mashle/1', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('Waiting 10s to capture player requests...');
        await new Promise(r => setTimeout(r, 10000));
        
        // Get all iframes
        const frames = page.frames();
        console.log('Total frames:', frames.length);
        for (const f of frames) {
            console.log('Frame URL:', f.url().substring(0, 200));
        }

        console.log('\nCaptured vid3rb links:', capturedLinks);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
})();
