const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isAnime3rb = (url) => url && url.includes('anime3rb.com');

/**
 * Scrape anime3rb.com smartly:
 * - Redirects homepage/list URLs to /titles/list and extracts data directly from the listing page
 *   (poster + title + link) without visiting individual detail pages.
 * - If a /titles/SLUG URL is provided, visits only that detail page.
 */
const scrapeAnime3rb = async (browser, url, maxImages) => {
    // Determine the correct listing URL
    let listUrl = url;
    if (
        url === 'https://anime3rb.com/' ||
        url === 'https://anime3rb.com' ||
        url === 'https://www.anime3rb.com/'
    ) {
        listUrl = 'https://anime3rb.com/titles/list';
    } 
    // Any other URL (including /search?q=...) will comfortably remain untouched.

    const isSingleTitle = url.includes('/titles/') && !url.includes('/titles/list');

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    const results = [];

    if (isSingleTitle) {
        // ── Single detail page ───────────────────────────────────────────────
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(2500);

        const meta = await page.evaluate(() => {
            const getText = (el) => el ? (el.textContent || el.innerText || '').trim() : '';

            const titleEl = document.querySelector('h1') ||
                            document.querySelector('[class*="title"] h1') ||
                            document.querySelector('[class*="title"]');
            const title = getText(titleEl) ||
                          document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';

            const poster = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                           Array.from(document.querySelectorAll('img[src*="images.anime3rb.com"]'))
                               .find(img => !img.src.includes('logo') && !img.src.includes('figure-square'))?.src || '';

            const story = getText(document.querySelector('.description, [class*="description"], .story, [class*="story"]')) ||
                          document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

            const genres = Array.from(document.querySelectorAll('a[href*="/genres/"], a[href*="/genre/"], a[href*="/tag/"]'))
                .map(a => getText(a)).filter(Boolean);

            return {
                title, poster, story, genres,
                episodes: '', status: '', season: '', type: '', malUrl: '',
                seriesUrl: window.location.href
            };
        });

        if (meta.poster || meta.title) {
            results.push({ url: meta.poster, detailUrl: meta.seriesUrl, ...meta });
        }

    } else {
        // ── Listing page: extract all anime cards directly ───────────────────
        await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(2500);

        let previousCount = 0;
        let stagnatedCycles = 0;

        while (results.length < maxImages && stagnatedCycles < 6) {
            const cards = await page.evaluate(() => {
                const data = [];
                const seen = new Set();

                // Each card: <a href="/titles/slug"><img src="CDN" alt="بوستر ..."></a>
                document.querySelectorAll('a[href*="/titles/"]').forEach(anchor => {
                    const href = anchor.href;
                    // Skip list/filter pages
                    if (!href || href.includes('/titles/list') || href.includes('/titles/filter') || seen.has(href)) return;

                    const img = anchor.querySelector('img[src*="images.anime3rb.com"]') ||
                                anchor.querySelector('img');

                    if (!img) return;

                    const src = img.getAttribute('data-src') || img.src;
                    if (!src || src.includes('logo') || src.includes('figure-square')) return;

                    // Extract title from alt text ("بوستر Kill Ao" -> "Kill Ao")
                    let title = (img.alt || '').replace(/^بوستر\s*/i, '').trim();
                    if (!title) {
                        // Fallback to any text inside the anchor
                        title = anchor.textContent.trim().split('\n')[0].trim();
                    }

                    seen.add(href);
                    data.push({ href, poster: src, title });
                });

                return data;
            });

            for (const card of cards) {
                if (results.length >= maxImages) break;
                if (!results.find(r => r.detailUrl === card.href)) {
                    results.push({
                        url: card.poster,
                        detailUrl: card.href,
                        title: card.title,
                        poster: card.poster,
                        story: '',
                        genres: [],
                        episodes: '',
                        status: '',
                        season: '',
                        type: '',
                        malUrl: '',
                        seriesUrl: card.href
                    });
                }
            }

            if (results.length === previousCount) {
                stagnatedCycles++;
            } else {
                stagnatedCycles = 0;
            }
            previousCount = results.length;

            if (results.length >= maxImages) break;

            // Scroll down to trigger lazy loading of more cards
            await page.evaluate(() => window.scrollBy(0, 1400));
            await sleep(1800);
        }
    }

    await page.close();
    return results;
};

/**
 * Generic scraper for non-anime3rb sites.
 * Visits listing pages to find detail URLs, then visits each detail page for metadata.
 */
const scrapeGeneric = async (browser, url, maxImages) => {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 1000 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);

    try {
        await page.evaluate(() => {
            const banner = document.querySelector('#onetrust-consent-sdk, .cookie-banner');
            if (banner) banner.remove();
        });
    } catch (e) {}

    const pageTitle = await page.title();
    let animeInfoList = [];

    const isDetailPage = await page.evaluate(() => {
        const href = window.location.href;
        const hasDetailInfo = !!(document.querySelector('.anime-story') || document.querySelector('.anime-details-title'));
        const hasBigPoster = !!(document.querySelector('.anime-thumbnail img') || document.querySelector('.anime-post-thumbnail img'));
        return href.includes('/anime/') || href.includes('/serie/') || href.includes('/series/') || (hasDetailInfo && hasBigPoster);
    });

    if (isDetailPage) {
        animeInfoList.push({ detailUrl: url });
    }

    let previousSize = 0;
    let stagnatedCycles = 0;

    if (!isDetailPage) {
        while (animeInfoList.length < maxImages && stagnatedCycles < 5) {
            const currentLinks = await page.evaluate(() => {
                const links = [];
                const selectors = [
                    '.anime-card-poster a', '.anime-card-container a', 'a.overlay',
                    '.anime-card-details h3 a', '.view.col-xs-12 h3 a',
                    '.series-box a', '.movie-item a', '.item-poster a', '.box-item a', '.poster a',
                    'a[href*="/anime/"]', 'a[href*="/series/"]', 'a[href*="/season/"]',
                    'a[href*="/serie/"]', 'a[href*="/movie/"]'
                ];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        const href = el.href;
                        if (!href || !href.startsWith('http')) return;
                        const isWork = href.includes('/anime/') || href.includes('/series/') ||
                                       href.includes('/season/') || href.includes('/serie/') || href.includes('/movie/');
                        const isEpisode = href.includes('/episode/') || href.includes('/watch/') || href.includes('/ep/');
                        if (isWork && !isEpisode) links.push(href);
                    });
                });
                return Array.from(new Set(links));
            });

            for (const link of currentLinks) {
                if (animeInfoList.length < maxImages && !animeInfoList.find(a => a.detailUrl === link)) {
                    animeInfoList.push({ detailUrl: link });
                }
            }

            if (animeInfoList.length === previousSize) stagnatedCycles++;
            else stagnatedCycles = 0;
            previousSize = animeInfoList.length;

            if (animeInfoList.length >= maxImages) break;
            await page.evaluate(() => window.scrollBy(0, 1000));
            await sleep(2000);
        }
    }

    await page.close();

    // Visit each detail page
    const results = [];
    const targets = animeInfoList.slice(0, maxImages);

    for (const entry of targets) {
        try {
            const detailPage = await browser.newPage();
            await detailPage.setRequestInterception(true);
            detailPage.on('request', (req) => {
                if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });
            await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            await detailPage.goto(entry.detailUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await sleep(1500);

            const metadata = await detailPage.evaluate(() => {
                const getInfo = (label) => {
                    for (const item of document.querySelectorAll('.anime-info, .info-list li, .movie-info li')) {
                        if (item.textContent.includes(label)) return item.textContent.replace(label, '').trim();
                    }
                    return '';
                };
                const getText = (el) => el ? (el.textContent || el.innerText || '').trim() : '';

                const storyEl = document.querySelector('.anime-story,.entry-content,.story-text,.movie-story,.post-content,.description-content,.story-content');
                const titleEl = document.querySelector('h1.entry-title,.anime-details-title h1,.anime-title,.movie-title h1,.post-title h1,h1.title,h1');
                const titleValue = getText(titleEl) || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title?.split('|')[0]?.trim();

                const genres = Array.from(document.querySelectorAll('.anime-genres a,.genres a,.item-list a[href*="/genre/"],.movie-genres a,.post-genres a')).map(a => getText(a));
                const imgEl = document.querySelector('.anime-thumbnail img,.anime-post-thumbnail img,img[itemprop="image"],.poster img,.movie-poster img,.entry-content img,.post-thumbnail img');
                let poster = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
                if (!poster) poster = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
                if (poster && poster.match(/-\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i)) poster = poster.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp|gif))$/i, '$1');
                if (poster && poster.startsWith('//')) poster = 'https:' + poster;

                let storyValue = getText(storyEl);
                if (!storyValue || storyValue.length < 10) storyValue = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

                return {
                    title: typeof titleValue === 'string' ? titleValue.trim() : getText(titleValue),
                    story: storyValue, poster, genres,
                    episodes: getInfo('عدد الحلقات:') || getInfo('الحلقات:'),
                    status: getInfo('حالة الأنمي:') || getInfo('الحالة:'),
                    season: getInfo('الموسم:'),
                    type: getInfo('النوع:'),
                    malUrl: document.querySelector('.anime-mal')?.href || '',
                    seriesUrl: window.location.href
                };
            });

            if (metadata.poster || metadata.title) {
                results.push({ url: metadata.poster, detailUrl: metadata.seriesUrl || entry.detailUrl, ...metadata });
            }
            await detailPage.close();
        } catch (err) {
            console.error(`Error scraping ${entry.detailUrl}:`, err.message);
        }
    }

    return { pageTitle, results };
};

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
    const url = process.argv[2];
    const maxImages = parseInt(process.argv[3]) || 50;

    if (!url) {
        process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        let pageTitle = 'anime3rb.com';
        let results = [];

        if (isAnime3rb(url)) {
            // ── anime3rb fast path ──────────────────────────────────────────
            results = await scrapeAnime3rb(browser, url, maxImages);
            pageTitle = 'أنمي عرب - Anime3rb';
        } else {
            // ── Generic path ────────────────────────────────────────────────
            const generic = await scrapeGeneric(browser, url, maxImages);
            pageTitle = generic.pageTitle;
            results = generic.results;
        }

        process.stdout.write(JSON.stringify({
            success: true,
            title: pageTitle,
            count: results.length,
            images: results.map(r => r.url),
            data: results
        }));

    } catch (err) {
        process.stdout.write(JSON.stringify({ success: false, error: err.message }));
    } finally {
        if (browser) await browser.close();
    }
})();
