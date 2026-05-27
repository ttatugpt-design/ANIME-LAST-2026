const puppeteer = require('puppeteer');
const fs = require('fs');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getForafileDirectLink(browser, foraUrl) {
    const page = await browser.newPage();
    const capturedRequests = [];

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Intercept ALL requests to find the .mp4 URL
        await page.setRequestInterception(true);
        page.on('request', req => {
            const url = req.url();
            if (url.includes('.mp4') || url.includes('.mkv') || url.includes('/files/')) {
                capturedRequests.push(url);
                console.log(`  [Network] Captured: ${url}`);
            }
            if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        // Also listen to responses for redirects to .mp4
        page.on('response', resp => {
            const url = resp.url();
            if (url.includes('.mp4') || url.includes('/files/') || url.includes('sfile')) {
                capturedRequests.push(url);
                console.log(`  [Response] Captured: ${url}`);
            }
        });

        console.log(`  [Forafile] Visiting: ${foraUrl}`);
        await page.goto(foraUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2000);
        await page.screenshot({ path: 'step4_forafile.png' });

        // Get all links BEFORE clicking to see what's there
        const linksBefore = await page.evaluate(() =>
            Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent.trim(), href: a.href || a.getAttribute('data-href') || a.getAttribute('data-url') })).filter(l => l.href)
        );
        console.log(`  [Forafile] Links before click:`, JSON.stringify(linksBefore.slice(0, 10)));

        // Click download button
        const clicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('a, button, input[type="submit"]'));
            for (const btn of btns) {
                const text = (btn.textContent || btn.value || '').trim().toLowerCase();
                if (text.includes('download') || text.includes('تحميل')) {
                    const info = { text: btn.textContent.trim(), href: btn.href || '', id: btn.id, className: btn.className };
                    btn.click();
                    return info;
                }
            }
            return null;
        });
        console.log(`  [Forafile] Clicked:`, clicked);

        // Wait longer - forafile may have a countdown
        console.log(`  [Forafile] Waiting 15s for countdown/timer...`);
        await sleep(15000);
        await page.screenshot({ path: 'step5_forafile_after_wait.png' });
        console.log('  [Forafile] Current URL:', page.url());

        // Check captured network requests first
        const mp4Requests = capturedRequests.filter(u => u.includes('.mp4') || u.includes('/files/'));
        if (mp4Requests.length > 0) {
            console.log('  [Forafile] Found via network:', mp4Requests[0]);
            return mp4Requests[0];
        }

        // Check all links after waiting
        const linksAfter = await page.evaluate(() => {
            const all = Array.from(document.querySelectorAll('a, [href], [data-href], [data-url], [data-file]'));
            return all.map(el => ({
                text: el.textContent?.trim(),
                href: el.href || el.getAttribute('href') || el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('data-file')
            })).filter(l => l.href && l.href.startsWith('http'));
        });

        // Find .mp4 or /files/ links
        const mp4Link = linksAfter.find(l => l.href.includes('.mp4') || l.href.includes('.mkv'));
        if (mp4Link) return mp4Link.href;

        const filesLink = linksAfter.find(l => l.href.includes('/files/'));
        if (filesLink) return filesLink.href;

        const sfileLink = linksAfter.find(l => l.href.includes('sfile') || l.href.includes('fs1') || l.href.includes('fs2'));
        if (sfileLink) return sfileLink.href;

        // Check page source for hidden links
        const pageSource = await page.content();
        const mp4Match = pageSource.match(/https?:\/\/[^\s"'<>]+\.mp4/);
        if (mp4Match) {
            console.log('  [Forafile] Found in source:', mp4Match[0]);
            return mp4Match[0];
        }

        // Dump for debug
        console.log('  [Forafile] Links after wait:', JSON.stringify(linksAfter.slice(0, 20)));
        fs.writeFileSync('debug_forafile.html', pageSource);
        return null;

    } finally {
        await page.close().catch(() => {});
    }
}

async function runTest(url) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        console.log(`Step 1: Visiting ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Step 1: Loaded');

        const watchBtn = await page.$('.watchNow button');
        if (!watchBtn) { console.log('ERROR: .watchNow button not found!'); return; }

        console.log(`Step 2: Clicking Watch Now (POST form)`);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            watchBtn.click()
        ]);
        console.log('Step 2: POST navigation done.');
        await sleep(1000);

        const servers = await page.evaluate(() => {
            const results = [];
            for (const li of Array.from(document.querySelectorAll('li'))) {
                const nameEl = li.querySelector('span.ser-name');
                const linkEl = li.querySelector('a.ser-link');
                if (nameEl && linkEl) results.push({ name: nameEl.textContent.trim(), href: linkEl.href });
            }
            return results;
        });

        console.log(`Step 3: Found ${servers.length} servers:`);
        servers.forEach((s, i) => console.log(`  [${i}] "${s.name}" -> ${s.href}`));

        let target = servers.find(s => s.name.includes('مباشر') || s.name.toLowerCase().includes('direct'));
        if (!target) target = servers.find(s => s.href.includes('forafile') || s.href.includes('sfile'));
        if (!target) target = servers.find(s => !s.href.includes('dood') && !s.href.includes('streamrub') && !s.href.includes('mixdrop'));

        if (!target) { console.log('ERROR: No suitable server found!'); return; }

        console.log(`\nStep 4: Targeting: "${target.name}" -> ${target.href}`);
        const finalLink = await getForafileDirectLink(browser, target.href);

        console.log('\n========== FINAL RESULT ==========');
        console.log(finalLink || 'NOT FOUND');
        console.log('===================================');

    } finally {
        await browser.close();
    }
}

runTest('https://tv8.egydead.live/episode/one-piece-e1159/');
