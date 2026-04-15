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
        process.stderr.write('Error: No URL provided\n');
        process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    console.error(`[Scraper] Starting for: ${episodeUrl}`);
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
            const type = req.resourceType();
            
            // Capture player page URL or direct media URLs
            if (!capturedUrl && url.includes('vid3rb.com')) {
                if (url.includes('/player/') || url.includes('.mp4') || url.includes('.m3u8')) {
                    capturedUrl = url;
                    console.error(`[Scraper] Captured URL from network: ${url}`);
                }
            }
            
            // BLOCKING: Allow 'stylesheet' as some SPAs need it for layout-based JS logic
            if (['image', 'font', 'media'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // ─── Step 2: Navigate and wait for full render ───────────────────────────
        console.error(`[Scraper] Navigating to page...`);
        try {
            await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(5000); // Give it time to load the player via JS
        } catch (e) {
            console.error(`[Scraper] Navigation warning: ${e.message}`);
        }

        // ─── Step 3: Check all frame URLs ────────────────────────────────────────
        if (!capturedUrl) {
            console.error(`[Scraper] Checking frames...`);
            for (const frame of page.frames()) {
                try {
                    const src = frame.url();
                    if (src && src.includes('vid3rb.com') && src.startsWith('http')) {
                        capturedUrl = src;
                        console.error(`[Scraper] Found URL in frame: ${src}`);
                        break;
                    }
                } catch (e) {}
            }
        }

        // ─── Step 4: Check iframe elements in the DOM ────────────────────────────
        if (!capturedUrl) {
            console.error(`[Scraper] Checking DOM iframes...`);
            const iframes = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('iframe'))
                    .map(f => f.src || f.getAttribute('data-src') || '')
                    .filter(src => src && src.includes('vid3rb'));
            }).catch(() => []);

            if (iframes.length > 0) {
                capturedUrl = iframes[0];
                console.error(`[Scraper] Found URL in DOM: ${capturedUrl}`);
            }
        }

        // ─── Step 5: Click server buttons and wait (for dynamic loading) ─────────
        if (!capturedUrl) {
            console.error(`[Scraper] URL still not found. Attempting to click server buttons...`);
            const clicked = await page.evaluate(() => {
                const selectors = [
                    '[class*="server"] button',
                    '[class*="server"] a',
                    'button[class*="server"]',
                    '.servers button',
                    '.server-list li',
                    '[class*="play-btn"]',
                    '.vjs-big-play-button',
                    'button[class*="play"]',
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent.toLowerCase().includes('anime3rb')) {
                        el.click();
                        return true;
                    }
                }
                // If specific not found, try any button/list item in servers container
                const anyServer = document.querySelector('.servers-list li, .servers a, .servers button');
                if (anyServer) {
                    anyServer.click();
                    return true;
                }
                return false;
            }).catch(() => false);

            if (clicked) {
                console.error(`[Scraper] Clicked server button, waiting...`);
                await sleep(5000);
                
                // Re-check frames after click
                for (const frame of page.frames()) {
                    try {
                        const src = frame.url();
                        if (src && src.includes('vid3rb.com') && src.startsWith('http')) {
                            capturedUrl = src;
                            console.error(`[Scraper] Found URL in frame after click: ${src}`);
                            break;
                        }
                    } catch (e) {}
                }
                
                if (!capturedUrl) {
                    const iframes2 = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('iframe'))
                            .map(f => f.src || f.getAttribute('data-src') || '')
                            .filter(src => src && src.includes('vid3rb'));
                    }).catch(() => []);
                    if (iframes2.length > 0) {
                        capturedUrl = iframes2[0];
                        console.error(`[Scraper] Found URL in DOM after click: ${capturedUrl}`);
                    }
                }
            }
        }

        // ─── Step 6: Fallback — any embed/player link in the page ────────────────
        if (!capturedUrl) {
            console.error(`[Scraper] Using final fallback (scanning all links)...`);
            const anyLink = await page.evaluate(() => {
                const hosts = ['vid3rb', 'dood', 'streamtape', 'mixdrop', 'filemoon', 'streamruby', 'uqload'];
                const allLinks = [
                    ...Array.from(document.querySelectorAll('iframe')).map(f => f.src),
                    ...Array.from(document.querySelectorAll('a[href]')).map(a => a.href),
                ];
                return allLinks.find(url => url && hosts.some(h => url.includes(h))) || null;
            }).catch(() => null);

            if (anyLink) {
                capturedUrl = anyLink;
                console.error(`[Scraper] Fallback matched: ${capturedUrl}`);
            }
        }

        await browser.close();

        if (!capturedUrl) {
            console.error(`[Scraper] FAILED: No player link found for ${episodeUrl}`);
            process.stdout.write(JSON.stringify({
                success: false,
                error: 'لم يتم العثور على رابط المشغل. قد يكون الموقع محجوباً أو تغير تصميمه.'
            }));
            process.exit(1);
        }

        console.error(`[Scraper] SUCCESS: Found ${capturedUrl}`);
        process.stdout.write(JSON.stringify({
            success: true,
            url: capturedUrl
        }));

    } catch (err) {
        console.error(`[Scraper] FATAL ERROR: ${err.message}`);
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    }
})();

