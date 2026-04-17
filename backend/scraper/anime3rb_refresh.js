const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const episodeUrl = process.argv[2];
    if (!episodeUrl) {
        process.stderr.write('Error: No URL provided\n');
        process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    console.error(`[Scraper] Starting stealth scraper for: ${episodeUrl}`);
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
                '--disable-software-rasterizer',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions',
                '--hide-scrollbars',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 900 });

        // Step 1: Network interception
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
            
            if (['image', 'font', 'media'].includes(type) || url.includes('google-analytics') || url.includes('ads')) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Step 2: Navigate
        console.error(`[Scraper] Navigating to page...`);
        try {
            // Using 'domcontentloaded' is faster and more reliable on Railway than 'networkidle'
            await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(5000); 
        } catch (e) {
            console.error(`[Scraper] Navigation warning: ${e.message}`);
        }

        // Step 3: Check frames
        if (!capturedUrl) {
            console.error(`[Scraper] Checking frames...`);
            for (const frame of page.frames()) {
                try {
                    const src = frame.url();
                    if (src && src.includes('vid3rb.com')) {
                        capturedUrl = src;
                        console.error(`[Scraper] Found URL in frame: ${src}`);
                        break;
                    }
                } catch (e) {}
            }
        }

        // Step 4: Click Trigger
        if (!capturedUrl) {
            console.error(`[Scraper] Checking server buttons...`);
            const clicked = await page.evaluate(() => {
                const btn = document.querySelector('.servers-list li, .servers button, [class*="server"]');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }).catch(() => false);

            if (clicked) {
                await sleep(5000);
                // Final scan
                const player = await page.evaluate(() => {
                    const iframe = document.querySelector('iframe[src*="vid3rb"]');
                    return iframe ? iframe.src : null;
                }).catch(() => null);
                if (player) capturedUrl = player;
            }
        }

        // Final Fallback: Search all iframes
        if (!capturedUrl) {
            const allIframes = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('iframe'))
                    .map(f => f.src || f.dataset.src || '')
                    .filter(src => src && (src.includes('vid3rb') || src.includes('dood') || src.includes('streamtape')));
            }).catch(() => []);
            if (allIframes.length > 0) capturedUrl = allIframes[0];
        }

        await browser.close();

        if (!capturedUrl) {
            console.error(`[Scraper] FAILED: URL not found`);
            process.stdout.write(JSON.stringify({ success: false, error: 'لم يتم العثور على رابط السيرفر. تأكد من أن الموقع يعمل.' }));
            process.exit(1);
        }

        console.error(`[Scraper] SUCCESS: Captured URL`);
        process.stdout.write(JSON.stringify({ success: true, url: capturedUrl }));

    } catch (err) {
        if (browser) await browser.close().catch(() => {});
        console.error(`[Scraper] FATAL: ${err.message}`);
        process.stdout.write(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    }
})();

