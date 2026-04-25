const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

function fixCrunchyrollImageUrl(src, type = 'episode') {
    if (!src) return null;
    
    // 1. Remove blur and existing resizing from URL
    let clean = src.replace(/,?blur=\d+/g, '').replace(/,?width=\d+/g, '').replace(/,?height=\d+/g, '').replace(/fit=[^,]+,?/g, '');
    
    // 2. Extract the base image ID (from catalog or keyart)
    const catalogMatch = clean.match(/\/(catalog\/crunchyroll|keyart)\/([a-f0-9A-Z\-_]+\.(png|jpg|webp|jpeg))/i) || 
                         clean.match(/\/(catalog\/crunchyroll|keyart)\/([a-f0-9A-Z\-_]+)/i);
    
    if (catalogMatch) {
        const pathType = catalogMatch[1]; // catalog/crunchyroll or keyart
        const hashFile = catalogMatch[2];
        
        if (type === 'poster') {
            return `https://imgsrv.crunchyroll.com/cdn-cgi/image/fit=contain,format=auto,quality=85,width=480,height=720/${pathType}/${hashFile}`;
        } else if (type === 'banner') {
            return `https://imgsrv.crunchyroll.com/cdn-cgi/image/fit=cover,format=auto,quality=85,width=1920,height=1080/${pathType}/${hashFile}`;
        } else {
            return `https://imgsrv.crunchyroll.com/cdn-cgi/image/fit=cover,format=auto,quality=85,width=640,height=360/${pathType}/${hashFile}`;
        }
    }
    
    return clean.replace(/quality=\d+/g, 'quality=85');
}

async function scrapeCrunchyroll(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-security']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1600 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        console.error(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

        // Wait for initial page render
        await new Promise(r => setTimeout(r, 15000));

        // Accept Cookies/Banners
        await page.evaluate(() => {
            document.querySelector('#onetrust-accept-btn-handler')?.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        const isDiscovery = url.includes('/videos/new') || url.includes('/discover') || url.includes('/browse');
        if (isDiscovery) {
            const items = await page.evaluate(() => {
                const getSrc = (el) => el ? (el.src || el.getAttribute('data-src') || el.srcset || el.getAttribute('data-thumbnails')) : null;
                const results = [];
                document.querySelectorAll('div[class*="card"], .erc-browse-card').forEach(card => {
                    const a = card.querySelector('a');
                    const img = getSrc(card.querySelector('img'));
                    if (a && a.innerText) results.push({ title: a.innerText.trim().split('\n')[0], link: a.href, img: img ? img.split('?')[0] : null });
                });
                return results;
            });
            return { isDiscovery: true, results: items.map(i => ({ ...i, img: fixCrunchyrollImageUrl(i.img, 'episode') })) };
        }

        // ─── METADATA ────────────────────────────────────────────────
        console.error("Gathering metadata (AR)...");
        const metaAR = await page.evaluate(() => {
            const getMeta = (n) => document.querySelector(`meta[property="${n}"], meta[name="${n}"]`)?.content;
            
            // 1. Description extraction - improved for the new UI classes
            const getDesc = () => {
                const selectors = [
                    '.description--98r20',
                    '.text--is-l--iccTo', // New class found in diagnostics
                    '[data-t="series-description"]',
                    '.series-description',
                    '.erc-series-hero__description',
                    '[class*="series-hero"] [class*="description"]'
                ];
                for (const sel of selectors) {
                    const els = document.querySelectorAll(sel);
                    for (const el of els) {
                        const text = el?.innerText?.trim();
                        // Filter out short texts or marketing/consent/premium text
                        if (text && text.length > 50 && !text.includes('الولوج المميز') && !text.includes('توافق على الشروط')) {
                            return text;
                        }
                    }
                }
                // Fallback to searching all long paragraphs in the hero section
                const hero = document.querySelector('[data-t="series-hero-container"]') || document.body;
                const paragraphs = hero.querySelectorAll('p');
                for (const p of paragraphs) {
                    const t = p.innerText.trim();
                    if (t.length > 100 && !t.includes('الولوج المميز') && !t.includes('توافق على الشروط')) return t;
                }
                return "";
            };

            const description = getDesc();

            // 2. Image extraction - specifically looking for backdrop_tall for the poster
            let rawPoster = null;
            const allImgs = Array.from(document.querySelectorAll('img, source'));
            for (const el of allImgs) {
                const src = el.src || el.getAttribute('srcset') || el.getAttribute('data-src');
                if (src && src.includes('backdrop_tall')) {
                    rawPoster = src.split(' ')[0]; // Take first URL from srcset if needed
                    break;
                }
            }
            if (!rawPoster) {
                rawPoster = document.querySelector('[data-t="series-hero-poster"] img, .hero-poster--1c2R0 img, [data-t="poster-image"] img, .erc-series-hero__poster img')?.src || getMeta('og:image');
            }

            const rawBanner = document.querySelector('[data-t="series-hero-background"] img, .hero-background--4cfse img, .erc-series-hero__background img')?.src || null;
            
            return {
                title: document.querySelector('h1')?.textContent?.trim() || getMeta('og:title') || "N/A",
                description,
                rawPoster,
                rawBanner,
                genres: Array.from(document.querySelectorAll('[class*="genre-badge"], [data-t="genre-badge"]')).map(el => el.textContent.trim())
            };
        });

        // 3. Switch to English to get the English description
        console.error("Gathering metadata (EN)...");
        const enUrl = url.replace('/ar/', '/en/');
        let descriptionEn = "";
        try {
            await page.goto(enUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 12000)); // wait longer for EN UI
            descriptionEn = await page.evaluate(() => {
                const getDesc = () => {
                    const selectors = [
                        '.description--98r20',
                        '.text--is-l--iccTo',
                        '[data-t="series-description"]',
                        '.series-description',
                        '.erc-series-hero__description',
                        '[class*="series-hero"] [class*="description"]'
                    ];
                    for (const sel of selectors) {
                        const els = document.querySelectorAll(sel);
                        for (const el of els) {
                            const text = el?.innerText?.trim();
                            if (text && text.length > 50 && !text.includes('Premium access') && !text.includes('internet browser')) {
                                return text;
                            }
                        }
                    }
                    const paragraphs = document.querySelectorAll('p');
                    for (const p of paragraphs) {
                        const t = p.innerText.trim();
                        if (t.length > 100 && !t.includes('Premium access') && !t.includes('internet browser')) return t;
                    }
                    return "";
                };
                return getDesc();
            });
            // Switch back to original URL (AR) to continue episode extraction
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.error("Failed to fetch EN description:", e.message);
        }

        const meta = { ...metaAR, descriptionEn };
        console.error(`Title: ${meta.title}`);

        // ─── SEASON DETECTION ────────────────────────────────────────
        let seasons = await page.evaluate(() => {
            // Crunchyroll uses data-t="season-dropdown" or erc-season-dropdown
            const dropdownBtn = document.querySelector(
                '[data-t="season-dropdown"] button, .erc-season-dropdown button, [class*="season-dropdown"] button'
            );
            if (!dropdownBtn) return [{ index: 0, text: 'Default' }];

            dropdownBtn.click(); // open
            const opts = Array.from(document.querySelectorAll(
                '[data-t="season-dropdown-option"], .erc-season-dropdown-option, [class*="season-dropdown-option"]'
            )).map((el, i) => ({ index: i, text: el.innerText.trim() }));
            dropdownBtn.click(); // close
            return opts.length > 0 ? opts : [{ index: 0, text: 'Default' }];
        });
        await new Promise(r => setTimeout(r, 500)); // small pause after dropdown interaction

        console.error(`Found ${seasons.length} season(s): ${seasons.map(s => s.text).join(', ')}`);
        let allEpisodesRaw = [];

        for (const s of seasons) {
            if (seasons.length > 1 && s.text !== 'Default') {
                console.error(`Switching to season: ${s.text}`);
                await page.evaluate((idx) => {
                    const btn = document.querySelector(
                        '[data-t="season-dropdown"] button, .erc-season-dropdown button'
                    );
                    if (!btn) return;
                    btn.click();
                    const opts = document.querySelectorAll(
                        '[data-t="season-dropdown-option"], .erc-season-dropdown-option'
                    );
                    if (opts[idx]) opts[idx].click();
                }, s.index);
                await new Promise(r => setTimeout(r, 6000));
            }

            // ─── EXPAND ALL (Show More) ─────────────────────────────
            // Count unique /watch/ links as growth signal
            let lastLinkCount = 0;
            let stableRounds = 0;

            for (let attempt = 0; attempt < 20; attempt++) {
                const state = await page.evaluate(() => {
                    // Look for Show More button with Arabic or English text
                    const showMoreBtn = Array.from(
                        document.querySelectorAll('button, [role="button"], a[class*="btn"]')
                    ).find(el => {
                        const t = (el.innerText || el.textContent || "").trim();
                        return (
                            t.includes('أظهر المزيد') ||
                            t.includes('عرض المزيد') ||
                            t.includes('Show More') ||
                            t.includes('Load More')
                        ) && el.offsetParent !== null; // visible
                    });

                    if (showMoreBtn) {
                        showMoreBtn.scrollIntoView({ block: 'center' });
                        showMoreBtn.click();
                        return {
                            watchLinks: document.querySelectorAll('a[href*="/watch/"]').length,
                            clicked: true,
                            btnText: showMoreBtn.innerText.trim()
                        };
                    }

                    // Scroll down to load lazy content
                    window.scrollBy(0, 2000);
                    return {
                        watchLinks: document.querySelectorAll('a[href*="/watch/"]').length,
                        clicked: false
                    };
                });

                console.error(`Attempt ${attempt}: ${state.watchLinks} watch links (clicked: ${state.clicked}${state.btnText ? ' "' + state.btnText + '"' : ''})`);

                if (state.watchLinks > lastLinkCount) {
                    lastLinkCount = state.watchLinks;
                    stableRounds = 0;
                    await new Promise(r => setTimeout(r, 5000)); // wait for DOM to fully hydrate
                } else {
                    stableRounds++;
                    if (stableRounds >= 4 && !state.clicked) {
                        console.error("Stable — no more episodes loading.");
                        break;
                    }
                    await new Promise(r => setTimeout(r, 3000));
                }
            }

            // ─── EXTRACT EPISODES ───────────────────────────────────
            const seasonEps = await page.evaluate((seriesTitle) => {
                const getSrc = (el) => {
                    if (!el) return null;
                    return el.src || el.getAttribute('data-src') || el.srcset || el.getAttribute('data-thumbnails') || null;
                };
                const stripQuery = (src) => src ? src.split('?')[0] : null;
                const dateRegex = /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/;
                const isArabic = (t) => /[\u0600-\u06FF]/.test(t);

                const results = [];

                // Use data-t="episode-card" — confirmed from DOM inspection
                // Fall back to class-based selectors if data-t approach fails
                const episodeCards = Array.from(
                    document.querySelectorAll('[data-t="episode-card"], [data-t="episode-card "]')
                );

                episodeCards.forEach(card => {
                    // Skip if inside hero / sticky / recommendation sections
                    if (card.closest(
                        '.erc-series-hero-actions, .sticky-actions-wrapper, '
                        + 'aside, [class*="recommendations"], [class*="up-next"], '
                        + '[class*="related"], [data-t="related-series"]'
                    )) return;

                    const a = card.querySelector('a[href*="/watch/"]');
                    if (!a) return;

                    // ─── TITLE: get all visible text spans in card ───
                    const isArabicTitle = (t) => isArabic(t) && !t.includes('دبلجة') && !t.includes('ترجمة') && t !== seriesTitle && !dateRegex.test(t);

                    // All text content from direct children spans/h4 (not nested in img containers)
                    const allTexts = Array.from(card.querySelectorAll('h4, span, p'))
                        .map(el => el.innerText.trim())
                        .filter(t => t.length > 1);

                    // First pick Arabic title candidates
                    let epTitle = allTexts.find(t => isArabicTitle(t) && !t.startsWith('تشغيل')) || "";

                    // If still no descriptive title, try any non-series-name text
                    if (!epTitle) {
                        epTitle = allTexts.find(t => t !== seriesTitle && t.length > 2 && !dateRegex.test(t)) || seriesTitle;
                    }

                    epTitle = epTitle.replace(/^تشغيل\s+/i, '').trim();
                    if (!epTitle) epTitle = seriesTitle;

                    // ─── NUMBER: from text nodes only (avoid image URL numbers) ───
                    const cardTextNodes = Array.from(card.querySelectorAll('span, h4, p'))
                        .map(el => el.childNodes)
                        .reduce((acc, nodes) => {
                            nodes.forEach(n => { if (n.nodeType === 3) acc += ' ' + n.textContent; });
                            return acc;
                        }, "");

                    const mNum = cardTextNodes.match(/(?:حلقة|ح|Ep\.|Episode)\s*(\d+)/i) ||
                                 cardTextNodes.match(/\bح(\d+)\b/) ||
                                 cardTextNodes.match(/\bE(\d+)\b/i) ||
                                 cardTextNodes.match(/\b(\d{1,3})\b/);
                    const num = mNum ? parseInt(mNum[1]) : null;

                    // ─── THUMBNAIL ───
                    const imgEl = card.querySelector('img');
                    const rawThumb = stripQuery(getSrc(imgEl));

                    results.push({ title: epTitle, number: num, rawThumbnail: rawThumb, link: a.href });
                });

                return results;
            }, meta.title);

            console.error(`Season "${s.text}": extracted ${seasonEps.length} episodes`);
            allEpisodesRaw.push(...seasonEps);
        }

        // ─── DEDUPLICATE (AR) ────────────────────────────────────────
        const seen = new Set();
        const unique = [];
        for (const ep of allEpisodesRaw) {
            if (!seen.has(ep.link)) {
                seen.add(ep.link);
                unique.push(ep);
            }
        }
        unique.sort((a, b) => (a.number || 0) - (b.number || 0));
        console.error(`Total unique episodes (AR): ${unique.length}`);

        // ─── FETCH ENGLISH EPISODE DATA ───────────────────────────────
        console.error("Fetching English episode titles...");
        const enEpisodeMap = new Map(); // key = episode slug → {titleEn, descriptionEn}
        try {
            const enSeriesUrl = url.replace('/ar/', '/en/');
            await page.goto(enSeriesUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 8000));

            for (const s of seasons) {
                if (seasons.length > 1 && s.text !== 'Default') {
                    await page.evaluate((idx) => {
                        const btn = document.querySelector('[data-t="season-dropdown"] button, .erc-season-dropdown button, [class*="season-dropdown"] button');
                        if (!btn) return;
                        btn.click();
                        const opts = document.querySelectorAll('[data-t="season-dropdown-option"], .erc-season-dropdown-option, [class*="season-dropdown-option"]');
                        if (opts[idx]) opts[idx].click();
                    }, s.index);
                    await new Promise(r => setTimeout(r, 4000));
                }

                // Expand show more
                for (let i = 0; i < 15; i++) {
                    const clicked = await page.evaluate(() => {
                        const btn = Array.from(document.querySelectorAll('button')).find(el => {
                            const t = (el.innerText || '').trim();
                            return t.includes('Show More') || t.includes('Load More');
                        });
                        if (btn) { btn.click(); return true; }
                        window.scrollBy(0, 2000);
                        return false;
                    });
                    await new Promise(r => setTimeout(r, clicked ? 4000 : 1500));
                    if (!clicked) break;
                }

                const enEps = await page.evaluate(() => {
                    const cards = Array.from(document.querySelectorAll('[data-t="episode-card"]'));
                    return cards.map(card => {
                        const a = card.querySelector('a[href*="/watch/"]');
                        if (!a) return null;
                        const slug = a.href.split('/').pop();
                        const titleEn = Array.from(card.querySelectorAll('h4, span, p'))
                            .map(el => el.innerText.trim())
                            .find(t => t.length > 1 && /[a-zA-Z]/.test(t) && !t.includes('Dub') && !t.includes('Sub')) || '';
                        const descriptionEn = card.querySelector('[class*="description"]')?.innerText?.trim() || '';
                        return { slug, titleEn, descriptionEn };
                    }).filter(Boolean);
                });

                enEps.forEach(ep => enEpisodeMap.set(ep.slug, ep));
            }
            console.error(`Fetched ${enEpisodeMap.size} EN episode entries`);
        } catch (e) {
            console.error("Failed to fetch EN episodes:", e.message);
        }

        // ─── MERGE & FINALIZE ─────────────────────────────────────────
        const result = {
            ...meta,
            poster: fixCrunchyrollImageUrl(meta.rawPoster, 'poster'),
            banner: fixCrunchyrollImageUrl(meta.rawBanner, 'banner'),
            episodes: unique.map(ep => {
                const slug = ep.link.split('/').pop();
                const enData = enEpisodeMap.get(slug) || {};
                return {
                    ...ep,
                    slug,
                    slugEn: slug, // same slug on CR for both langs
                    titleEn: enData.titleEn || '',
                    descriptionEn: enData.descriptionEn || '',
                    thumbnail: fixCrunchyrollImageUrl(ep.rawThumbnail, 'episode')
                };
            })
        };
        delete result.rawPoster;
        delete result.rawBanner;
        return result;

    } catch (err) {
        console.error("Fatal scraping error:", err.message);
        return null;
    } finally {
        await browser.close();
    }
}

const targetUrl = process.argv[2];
if (targetUrl) {
    scrapeCrunchyroll(targetUrl).then(data => {
        if (data) console.log(JSON.stringify(data, null, 2));
    });
}
