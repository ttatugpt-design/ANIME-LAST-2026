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
 * Optimized for large batches:
 * 1. Extracts posters/titles directly from listing cards where possible.
 * 2. Visits detail pages in parallel batches for missing metadata.
 */
const scrapeGeneric = async (browser, url, maxImages) => {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });
    await page.setViewport({ width: 1280, height: 1000 });

    // --- AD BLOCKING & OPTIMIZATION ---
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const type = req.resourceType();
        const url = req.url();
        const blockList = ['google-analytics', 'doubleclick', 'adsystem', 'popads', 'ad-score', 'track', 'cloud-flare-challenge'];
        if (['image', 'font', 'media'].includes(type) || blockList.some(b => url.includes(b))) {
            req.abort();
        } else {
            req.continue();
        }
    });

    // --- NAVIGATION WITH RETRY ---
    const navigate = async () => {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        } catch (e) {
            console.error(`First navigation attempt failed: ${e.message}. Retrying...`);
            await page.goto(url, { waitUntil: 'load', timeout: 120000 });
        }
    };

    await navigate();
    await sleep(3000);

    // Initial results list (contains entries found in cards)
    const animeInfoList = [];
    let previousSize = 0;
    let stagnatedCycles = 0;

    // Detect if we are already on a detail page
    const isDetailPage = await page.evaluate(() => {
        const hasDetailInfo = !!(document.querySelector('.anime-story') || document.querySelector('.anime-details-title') || document.querySelector('.entry-content'));
        const hasBigPoster = !!(document.querySelector('.anime-thumbnail img') || document.querySelector('.anime-post-thumbnail img') || document.querySelector('.poster img'));
        return window.location.href.includes('/anime/') || (hasDetailInfo && hasBigPoster);
    });

    if (isDetailPage) {
        animeInfoList.push({ detailUrl: url });
    } else {
        // --- STEP 1: Fast Listing Extraction ---
        while (animeInfoList.length < maxImages && stagnatedCycles < 8) {
            const currentCards = await page.evaluate(() => {
                const results = [];
                const seenUrls = new Set();

                // Selectors for anime cards (listing pages)
                const cardSelectors = [
                    '.anime-card-poster', '.anime-card-container', '.series-box', 
                    '.movie-item', '.item-poster', '.box-item', '.poster',
                    '.anime-post-container', '.anime-post-thumbnail', '.item',
                    '.animepost', '.anime-item', 'article', '.card', '.box'
                ];

                cardSelectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(card => {
                        const anchor = card.querySelector('a') || (card.tagName === 'A' ? card : null);
                        if (!anchor) return;

                        const href = anchor.href.split('?')[0].split('#')[0];
                        if (!href || seenUrls.has(href)) return;

                        // Identify if it's an anime link
                        const isAnime = href.includes('/anime/') || href.includes('/animes/') || href.includes('/series/') || 
                                        href.includes('/serie/') || href.includes('/movie/') ;
                        const isEp = href.includes('/episode/') || href.includes('/watch/') || href.includes('/ep/');
                        
                        if (isAnime && !isEp) {
                            seenUrls.add(href);
                            const img = card.querySelector('img');
                            const src = img ? (img.getAttribute('data-src') || img.src) : '';
                            
                            // Try to get title from img alt, a text, or h3
                            let title = img ? (img.alt || '').trim() : '';
                            if (!title) {
                                const titleEl = card.querySelector('h3, h2, .title, .anime-card-details h3');
                                title = titleEl ? titleEl.textContent.trim() : '';
                            }

                            results.push({
                                detailUrl: href,
                                poster: src,
                                title: title,
                                url: src // Primary image URL
                            });
                        }
                    });
                });

                // Fallback: look for ANY links that look like anime links if no cards were found
                if (results.length === 0) {
                    document.querySelectorAll('a').forEach(a => {
                        const href = a.href.split('?')[0].split('#')[0];
                        if (!href || seenUrls.has(href)) return;
                        const isWork = (href.includes('/anime/') || href.includes('/series/')) && !href.includes('/episode/');
                        if (isWork) {
                            seenUrls.add(href);
                            results.push({ detailUrl: href });
                        }
                    });
                }

                return results;
            });

            for (const card of currentCards) {
                if (animeInfoList.length < maxImages && !animeInfoList.find(a => a.detailUrl === card.detailUrl)) {
                    animeInfoList.push(card);
                }
            }

            if (animeInfoList.length === previousSize) stagnatedCycles++;
            else stagnatedCycles = 0;
            previousSize = animeInfoList.length;

            if (animeInfoList.length >= maxImages) break;
            
            // Scroll down
            await page.evaluate(() => window.scrollBy(0, 1500));
            await sleep(2000);
        }
    }

    const pageTitle = await page.title();
    await page.close();

    // --- STEP 2: Parallel Metadata Enrichment ---
    const results = [];
    const targets = animeInfoList.slice(0, maxImages);
    
    // Concurrency limit for detail page visits (Low to avoid bot detection)
    const CONCURRENCY = 5;
    
    const fetchMetadata = async (entry) => {
        let detailPage = null;
        try {
            detailPage = await browser.newPage();
            // Optimize page load
            await detailPage.setRequestInterception(true);
            detailPage.on('request', (req) => {
                if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            await detailPage.goto(entry.detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await sleep(1500);

            const metadata = await detailPage.evaluate(() => {
                const getInfo = (label) => {
                    for (const item of Array.from(document.querySelectorAll('.anime-info, .info-list li, .movie-info li, .anime-info-container li'))) {
                        if (item.textContent.includes(label)) return item.textContent.replace(label, '').trim();
                    }
                    return '';
                };
                const getText = (el) => el ? (el.textContent || el.innerText || '').trim() : '';

                const storyEl = document.querySelector('.anime-story, .entry-content, .story-text, .movie-story, .post-content, .description-content, .story-content, .anime-details-story');
                const titleEl = document.querySelector('h1.entry-title, .anime-details-title h1, .anime-title, .movie-title h1, .post-title h1, h1.title, h1');
                
                const genres = Array.from(document.querySelectorAll('.anime-genres a, .genres a, .item-list a[href*="/genre/"], .movie-genres a, .post-genres a, a[href*="/genre/"]'))
                    .map(a => getText(a)).filter(g => g.length > 1);

                const imgSelectors = ['.anime-thumbnail img', '.anime-post-thumbnail img', 'img[itemprop="image"]', '.poster img', '.movie-poster img', '.entry-content img', '.post-thumbnail img', '.anime-details-image img'];
                let poster = '';
                for (const sel of imgSelectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        poster = el.getAttribute('data-src') || el.src;
                        if (poster) break;
                    }
                }

                if (!poster) poster = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
                if (poster && poster.match(/-\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i)) poster = poster.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp|gif))$/i, '$1');
                if (poster && poster.startsWith('//')) poster = 'https:' + poster;

                let storyValue = getText(storyEl);
                if (!storyValue || storyValue.length < 10) storyValue = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

                return {
                    title: getText(titleEl) || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title?.split('|')[0]?.trim(),
                    story: storyValue,
                    poster: poster,
                    genres: Array.from(new Set(genres)),
                    episodes: getInfo('عدد الحلقات:') || getInfo('الحلقات:'),
                    status: getInfo('حالة الأنمي:') || getInfo('الحالة:'),
                    season: getInfo('الموسم:'),
                    type: getInfo('النوع:'),
                    malUrl: document.querySelector('.anime-mal, a[href*="myanimelist.net"]')?.href || '',
                    seriesUrl: window.location.href
                };
            });

            // Merge metadata with entry (preserving what we found in cards if detail page fails)
            const result = {
                ...entry,
                ...metadata,
                url: metadata.poster || entry.poster, // Prefer detail poster
                detailUrl: entry.detailUrl
            };

            if (result.poster || result.title) {
                results.push(result);
            }
        } catch (err) {
            console.error(`Error enriching ${entry.detailUrl}:`, err.message);
            // Fallback to card data if enrichment failed
            if (entry.poster || entry.title) {
                results.push(entry);
            }
        } finally {
            if (detailPage) await detailPage.close();
        }
    };

    // Process in batches
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
        const batch = targets.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(entry => fetchMetadata(entry)));
    }

    // Sort back to relative order if needed (results will be in fetch-completion order currently)
    const sortedResults = results.sort((a, b) => {
        const idxA = targets.findIndex(t => t.detailUrl === a.detailUrl);
        const idxB = targets.findIndex(t => t.detailUrl === b.detailUrl);
        return idxA - idxB;
    });

    return { pageTitle, results: sortedResults };
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
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            headless: 'new',
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
