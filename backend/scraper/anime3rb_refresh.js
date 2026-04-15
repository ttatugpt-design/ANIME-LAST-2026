/**
 * anime3rb_refresh.js
 * -------------------
 * Dedicated lightweight scraper to refresh a SINGLE anime3rb episode link.
 * Strategy:
 *  1. Intercept ALL network requests — capture any vid3rb.com URL (player, mp4, m3u8)
 *  2. Navigate to the episode page and wait for networkidle2 (full SPA render)
 *  3. Scan all frames for vid3rb src
 *  4. If still not found — click all server buttons and wait again
 *  5. Return the best URL found
 *
 * Usage: node anime3rb_refresh.js <episode_url>
 * Output: JSON { success: bool, url: string?, error: string? }
 */

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const episodeUrl = process.argv[2];
    if (!episodeUrl) {
        process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 900 });

        // ─── Step 1: Intercept all requests to capture vid3rb URLs ──────────────
        let capturedUrl = null;
        await page.setRequestInterception(true);

        page.on('request', req => {
            const url = req.url();
            // Capture player page URL or direct media URLs
            if (!capturedUrl && url.includes('vid3rb.com')) {
                // Prefer the player URL with token (highest priority)
                if (url.includes('/player/')) {
                    capturedUrl = url;
                } else if (url.includes('.mp4') || url.includes('.m3u8')) {
                    capturedUrl = url;
                }
            }
            // Block heavy resources to speed up loading
            if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // ─── Step 2: Navigate and wait for full render ───────────────────────────
        try {
            await page.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        } catch (e) {
            // Timeout is OK — network may never fully idle on SPAs, proceed anyway
        }
        await sleep(3000);

        // ─── Step 3: Check all frame URLs ────────────────────────────────────────
        if (!capturedUrl) {
            for (const frame of page.frames()) {
                try {
                    const src = frame.url();
                    if (src && src.includes('vid3rb.com') && src.startsWith('http')) {
                        capturedUrl = src;
                        break;
                    }
                } catch (e) {}
            }
        }

        // ─── Step 4: Check iframe elements in the DOM ────────────────────────────
        if (!capturedUrl) {
            const iframes = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('iframe'))
                    .map(f => f.src || f.getAttribute('data-src') || '')
                    .filter(src => src && src.includes('vid3rb'));
            }).catch(() => []);

            if (iframes.length > 0) capturedUrl = iframes[0];
        }

        // ─── Step 5: Click server buttons and wait (for dynamic loading) ─────────
        if (!capturedUrl) {
            await page.evaluate(() => {
                // Try standard server button selectors on anime3rb
                const selectors = [
                    '[class*="server"] button',
                    '[class*="server"] a',
                    'button[class*="server"]',
                    '.servers button',
                    '.server-list li',
                    // Generic play trigger
                    '[class*="play-btn"]',
                    '.vjs-big-play-button',
                    'button[class*="play"]',
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.click();
                        return true;
                    }
                }
                return false;
            }).catch(() => {});

            await sleep(5000);

            // Re-check frames after click
            for (const frame of page.frames()) {
                try {
                    const src = frame.url();
                    if (src && src.includes('vid3rb.com') && src.startsWith('http')) {
                        capturedUrl = src;
                        break;
                    }
                } catch (e) {}
            }

            // Re-check DOM iframes
            if (!capturedUrl) {
                const iframes2 = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('iframe'))
                        .map(f => f.src || f.getAttribute('data-src') || '')
                        .filter(src => src && src.includes('vid3rb'));
                }).catch(() => []);
                if (iframes2.length > 0) capturedUrl = iframes2[0];
            }
        }

        // ─── Step 6: Fallback — any embed/player link in the page ────────────────
        if (!capturedUrl) {
            const anyLink = await page.evaluate(() => {
                // Grab any anchor or iframe pointing to known video hosts
                const hosts = ['vid3rb', 'dood', 'streamtape', 'mixdrop', 'filemoon', 'streamruby', 'uqload'];
                const allLinks = [
                    ...Array.from(document.querySelectorAll('iframe')).map(f => f.src),
                    ...Array.from(document.querySelectorAll('a[href]')).map(a => a.href),
                ];
                return allLinks.find(url => url && hosts.some(h => url.includes(h))) || null;
            }).catch(() => null);

            if (anyLink) capturedUrl = anyLink;
        }

        await browser.close();

        if (!capturedUrl) {
            process.stdout.write(JSON.stringify({
                success: false,
                error: 'لم يتم العثور على رابط المشغل في الصفحة. تأكد من صحة رابط الحلقة.'
            }));
            process.exit(1);
        }

        process.stdout.write(JSON.stringify({
            success: true,
            url: capturedUrl
        }));

    } catch (err) {
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    }
})();
