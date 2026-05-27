const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Resolves a host page URL (forafile, sfile, bowfile, etc.) to a final direct .mp4 link.
 * Uses network request interception to catch the download URL after the countdown timer.
 */
async function resolveHostPage(browser, hostUrl) {
    const page = await browser.newPage();
    const capturedUrls = [];

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Intercept network requests to find the real .mp4 URL
        await page.setRequestInterception(true);
        page.on('request', req => {
            const url = req.url();
            // We want file CDN URLs, not the host page itself
            if ((url.includes('.mp4') || url.includes('.mkv') || url.includes('/files/')) && !url.includes(new URL(hostUrl).hostname)) {
                capturedUrls.push(url);
                console.error(`[Resolver] Network captured: ${url}`);
            }
            if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        page.on('response', resp => {
            const url = resp.url();
            if ((url.includes('.mp4') || url.includes('/files/')) && !url.includes(new URL(hostUrl).hostname)) {
                if (!capturedUrls.includes(url)) {
                    capturedUrls.push(url);
                    console.error(`[Resolver] Response captured: ${url}`);
                }
            }
        });

        console.error(`[Resolver] Visiting host page: ${hostUrl}`);
        await page.goto(hostUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2000);

        // Click the download button (forafile uses id="downloadbtn")
        await page.evaluate(() => {
            const btn = document.getElementById('downloadbtn') ||
                Array.from(document.querySelectorAll('button, a, input[type="submit"]')).find(b => {
                    const t = (b.textContent || b.value || '').trim().toLowerCase();
                    return t.includes('download') || t.includes('تحميل');
                });
            if (btn) btn.click();
        });

        console.error('[Resolver] Download button clicked. Waiting 15s for countdown...');
        await sleep(15000);

        // Return best captured URL
        const mp4Url = capturedUrls.find(u => u.includes('.mp4') || u.includes('.mkv'));
        if (mp4Url) return mp4Url;

        const filesUrl = capturedUrls.find(u => u.includes('/files/'));
        if (filesUrl) return filesUrl;

        // Fallback: scan the page DOM for direct links
        const domLink = await page.evaluate(() => {
            for (const a of Array.from(document.querySelectorAll('a'))) {
                if (a.href && (a.href.match(/\.(mp4|mkv)$/i) || a.href.includes('/files/'))) return a.href;
            }
            // Check page source for CDN URLs
            const match = document.body.innerHTML.match(/https?:\/\/fs\d*\.[^\s"'<>]+\.mp4/);
            return match ? match[0] : null;
        });
        return domLink;

    } catch (err) {
        console.error(`[Resolver] Error: ${err.message}`);
        return null;
    } finally {
        await page.close().catch(() => {});
    }
}

/**
 * Scrapes a single EgyDead episode page to get the direct download link.
 * Flow: Load page -> click watchNow (POST) -> find "تحميل مباشر" server -> resolve host page
 */
async function scrapeEpisode(browser, episodeUrl) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        console.error(`[Scraper] Loading episode: ${episodeUrl}`);
        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(1000);

        // The "watchNow" button submits a POST form — must wait for navigation
        const watchBtn = await page.$('.watchNow button');
        if (!watchBtn) {
            console.error(`[Scraper] No .watchNow button found on: ${episodeUrl}`);
            return null;
        }

        console.error(`[Scraper] Clicking watchNow (POST form navigation)...`);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
            watchBtn.click()
        ]);
        await sleep(1000);

        // Find servers using the correct EgyDead HTML structure:
        // <li><span class="ser-name">تحميل مباشر</span> ... <a class="ser-link" href="...">
        const servers = await page.evaluate(() => {
            const results = [];
            for (const li of Array.from(document.querySelectorAll('li'))) {
                const nameEl = li.querySelector('span.ser-name');
                const linkEl = li.querySelector('a.ser-link');
                if (nameEl && linkEl && linkEl.href) {
                    results.push({ name: nameEl.textContent.trim(), href: linkEl.href });
                }
            }
            return results;
        });

        console.error(`[Scraper] Found ${servers.length} download servers.`);

        if (servers.length === 0) {
            console.error(`[Scraper] No servers found for: ${episodeUrl}`);
            return null;
        }

        // Priority 1: "تحميل مباشر" (Direct Download)
        let target = servers.find(s => s.name.includes('مباشر') || s.name.toLowerCase().includes('direct'));

        // Priority 2: forafile or sfile (known direct file hosts)
        if (!target) target = servers.find(s => s.href.includes('forafile') || s.href.includes('sfile'));

        // Priority 3: Avoid known streaming-only hosts
        if (!target) target = servers.find(s =>
            !s.href.includes('dood') &&
            !s.href.includes('streamrub') &&
            !s.href.includes('mixdrop') &&
            !s.href.includes('voe') &&
            !s.href.includes('streamhg') &&
            !s.href.includes('vidhide')
        );

        // Fallback: first available
        if (!target) target = servers[0];

        if (!target) {
            console.error(`[Scraper] No usable server found for: ${episodeUrl}`);
            return null;
        }

        console.error(`[Scraper] Using server: "${target.name}" -> ${target.href}`);
        const finalLink = await resolveHostPage(browser, target.href);

        if (finalLink) {
            console.error(`[Scraper] Resolved: ${finalLink}`);
            return {
                episode: episodeUrl.split('/').filter(Boolean).pop(),
                quality: '1080p',
                link: finalLink
            };
        }

        console.error(`[Scraper] Failed to resolve link for: ${episodeUrl}`);
        return null;

    } catch (err) {
        console.error(`[Scraper] Error for ${episodeUrl}: ${err.message}`);
        return null;
    } finally {
        await page.close().catch(() => {});
    }
}

// ─── Main entry point ────────────────────────────────────────────────────────
(async () => {
    const targetUrl = process.argv[2];
    if (!targetUrl) {
        console.log(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

        const mainPage = await browser.newPage();
        await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await mainPage.setRequestInterception(true);
        mainPage.on('request', req => {
            if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        console.error(`[Main] Loading: ${targetUrl}`);
        await mainPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(1500);

        const metadata = await mainPage.evaluate(() => {
            // Try multiple selectors for title
            const title = document.querySelector('.singleTitle em')?.textContent.trim() ||
                document.querySelector('.single-header h1')?.textContent.trim() ||
                document.querySelector('h1')?.textContent.trim() ||
                document.title || '';
            // Try multiple selectors for poster
            const poster = document.querySelector('.single-thumbnail img')?.src ||
                document.querySelector('.singleCover')?.style.backgroundImage.replace(/url\(["']?|["']?\)/g, '') ||
                document.querySelector('meta[property="og:image"]')?.content || '';
            return { title, poster };
        });

        let episodeUrls = [];
        if (targetUrl.includes('/episode/')) {
            episodeUrls = [targetUrl];
        } else {
            episodeUrls = await mainPage.evaluate(() =>
                Array.from(new Set(
                    Array.from(document.querySelectorAll('a[href*="/episode/"]')).map(a => a.href)
                ))
            );
        }

        episodeUrls.sort((a, b) => {
            const aNum = parseInt(a.match(/e(\d+)/i)?.[1] || 0);
            const bNum = parseInt(b.match(/e(\d+)/i)?.[1] || 0);
            return aNum - bNum;
        });

        if (episodeUrls.length > 50) {
            console.error(`[Main] Capping at 50 episodes (found ${episodeUrls.length})`);
            episodeUrls = episodeUrls.slice(0, 50);
        }

        console.error(`[Main] Processing ${episodeUrls.length} episode(s)...`);

        const directLinks = [];
        // Process 3 at a time to be respectful and avoid blocks
        const CONCURRENCY = 3;
        for (let i = 0; i < episodeUrls.length; i += CONCURRENCY) {
            const chunk = episodeUrls.slice(i, i + CONCURRENCY);
            console.error(`[Main] Chunk ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(episodeUrls.length / CONCURRENCY)}`);
            const results = await Promise.all(chunk.map(url => scrapeEpisode(browser, url)));
            results.forEach(r => { if (r) directLinks.push(r); });
        }

        console.log(JSON.stringify({
            success: true,
            title: metadata.title,
            poster: metadata.poster,
            links: directLinks
        }));

        await browser.close();
        process.exit(0);
    } catch (err) {
        if (browser) await browser.close().catch(() => {});
        console.log(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    }
})();
