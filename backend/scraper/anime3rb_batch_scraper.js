const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const VIDEO_HOSTS = ['dood', 'dsvplay', 'dooood', 'streamruby', 'mixdrop', 'hglink', 'hgcloud', 'uqload', 'streamtape', 'filemoon', 'vidbom', 'mcloud', 'streamsb', 'vidoza', 'upstream', 'huntrexus', 'earnvids', 'vidfast', 'minochinos', 'streamhg', 'earnvid', 'vidfast.co'];

const isVideoHost = (url) => VIDEO_HOSTS.some(h => url.toLowerCase().includes(h));

const toEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const u = url.toLowerCase();
        if (u.includes('dood') || u.includes('dsvplay') || u.includes('dooood'))
            return url.replace(/\/(d|f|e|file)\//, '/e/');
        if (u.includes('streamruby.com')) return url.replace(/\/(d|f)\//, '/e/');
        if (u.includes('mixdrop.')) return url.replace('/f/', '/e/');
        if (u.includes('uqload.')) {
            const id = url.split('/').pop()?.replace('.html', '').replace('embed-', '');
            return `https://uqload.to/embed-${id}.html`;
        }
        if (u.includes('streamtape.')) return url.replace('/v/', '/e/');
        if (u.includes('filemoon.')) return url.replace('/d/', '/e/');
        return null;
    } catch { return null; }
};

const scrapeEpisode = async (browser, episodeUrl) => {
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        // Capture direct vid3rb file links from ANY request/response during page load
        const directLinks = new Set();
        const playerUrls = new Set(); // vid3rb player iframe URLs
        
        await page.setRequestInterception(true);
        page.on('request', req => {
            const rUrl = req.url();
            const type = req.resourceType();
            
            // Capture direct MP4 links from vid3rb file servers
            if (/files-\d+\.vid3rb\.com\/files\/.*\.(mp4|m3u8)/.test(rUrl)) {
                directLinks.add(rUrl);
            }
            // Capture vid3rb player iframe URLs
            if (/video\.vid3rb\.com\/player\//.test(rUrl)) {
                playerUrls.add(rUrl);
            }
            
            if (['image', 'font', 'stylesheet'].includes(type)) req.abort();
            else req.continue();
        });

        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
            .catch(e => process.stderr.write(`Navigation timeout on ${episodeUrl}, continuing anyway...\n`));
        
        // Wait for iframes and player to load
        await sleep(4000);
        
        // Extract player URLs from iframe src attributes
        const iframePlayerUrls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('iframe')).map(f => f.src).filter(s => s && (s.includes('vid3rb') || s.includes('video.')));
        }).catch(() => []);
        iframePlayerUrls.forEach(u => playerUrls.add(u));

        // Get download link info from DOM (quality labels)
        const domLinks = await page.evaluate(() => {
            const results = [];
            // Look for quality labels and paired download links
            document.querySelectorAll('a[href*="/download/"]').forEach(a => {
                const parent = a.closest('div') || a.closest('li');
                const label = parent ? (parent.querySelector('label, span, .quality')?.textContent || '') : '';
                results.push({ href: a.href, label: label.trim() });
            });
            return results;
        }).catch(() => []);

        // Collect download link quality info without visiting them
        const qualityLinks = []; // {quality: '720p', downloadHref: '...'}
        for (const dl of domLinks) {
            const quality = detectQualityStatic(dl.href, dl.label);
            qualityLinks.push({ quality, downloadHref: dl.href });
        }

        const allResults = [];

        // STRATEGY 1: If we captured direct file server links during page load, use them
        for (const link of directLinks) {
            const q = detectQualityStatic(link);
            allResults.push({
                title: q,
                downloadUrl: link,
                embedUrl: link,
                host: 'anime3rb'
            });
        }

        // STRATEGY 2: Open each vid3rb player and extract sources for each quality
        for (const playerUrl of playerUrls) {
            const qualityMp4s = await extractPlayerSources(browser, playerUrl);
            for (const { quality, url: mp4Url } of qualityMp4s) {
                // Avoid duplicates
                if (!allResults.some(r => r.downloadUrl === mp4Url)) {
                    allResults.push({
                        title: quality,
                        downloadUrl: mp4Url,
                        embedUrl: playerUrl,
                        host: 'anime3rb'
                    });
                }
            }
        }

        // STRATEGY 3: Fallback - keep the embed/other links from DOM
        const embedLinks = await page.evaluate(() => {
            const results = [];
            // Look for non-download links (other video hosts, embed players)
            document.querySelectorAll('a[href*="embed"], a[href*="/player/"], a[href*="streamhg"], a[href*="dood"]').forEach(a => {
                results.push({ href: a.href, label: a.textContent?.trim() || '' });
            });
            return results;
        }).catch(() => []);

        for (const link of embedLinks) {
            if (!allResults.some(r => r.embedUrl === link.href)) {
                allResults.push({
                    title: link.label || 'Anime3rb Server',
                    downloadUrl: link.href,
                    embedUrl: link.href,
                    host: 'anime3rb'
                });
            }
        }

        const title = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
        }).catch(() => '');

        return { title, url: episodeUrl, links: allResults, error: null };
    } catch (err) {
        return { title: '', url: episodeUrl, links: [], error: err.message };
    } finally {
        await page.close().catch(() => {});
    }
};

// Static quality detector (no DOM needed)
const detectQualityStatic = (url, label = '') => {
    const u = (url + ' ' + label).toLowerCase();
    if (u.includes('1080') || u.includes('fhd')) return '1080p';
    if (u.includes('720') || u.includes('hd')) return '720p';
    if (u.includes('480') || u.includes('sd')) return '480p';
    if (u.includes('360')) return '360p';
    return 'Direct link';
};

// Open vid3rb player iframe and extract direct MP4 sources for each quality
const extractPlayerSources = async (browser, playerUrl) => {
    const playerPage = await browser.newPage();
    const results = [];
    try {
        await playerPage.setViewport({ width: 1280, height: 720 });
        await playerPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        const capturedMp4s = new Set();
        await playerPage.setRequestInterception(true);
        playerPage.on('request', req => {
            const u = req.url();
            if (/files-\d+\.vid3rb\.com\/files\/.*\.mp4/.test(u)) {
                capturedMp4s.add(u);
            }
            req.continue();
        });

        await playerPage.goto(playerUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

        // Click play button to trigger initial source loading
        await playerPage.evaluate(() => {
            const btn = document.querySelector('.vjs-big-play-button, .play-button, .vjs-play-control');
            if (btn) btn.click();
        }).catch(() => {});
        await sleep(2000);

        // Function to extract sources currently in DOM/JS
        const getSources = async () => {
            return await playerPage.evaluate(() => {
                const sources = [];
                // Check video.js player sources
                try {
                    if (window.player && typeof window.player.src === 'function') {
                        const currentSrc = window.player.src();
                        if (currentSrc) sources.push(currentSrc);
                    }
                    if (window.player && window.player.options_ && window.player.options_.sources) {
                        window.player.options_.sources.forEach(s => { if (s.src) sources.push(s.src); });
                    }
                } catch (e) {}

                Array.from(document.querySelectorAll('script')).forEach(s => {
                    const t = s.textContent || '';
                    const matches = t.match(/https:\/\/video\.vid3rb\.com\/video\/[a-f0-9\-]+\?[^"'\s]*/g);
                    if (matches) matches.forEach(m => sources.push(m));
                    const directMatches = t.match(/https:\/\/files-\d+\.vid3rb\.com\/files\/[^"'\s]+\.mp4[^"'\s]*/g);
                    if (directMatches) directMatches.forEach(m => sources.push(m));
                });
                return sources;
            }).catch(() => []);
        };

        // Attempt to switch qualities to capture more sources
        const qualities = ['1080', '720', '480', '360'];
        for (const q of qualities) {
            await playerPage.evaluate((qualityText) => {
                // Try to find quality menu item and click it
                const items = Array.from(document.querySelectorAll('.vjs-menu-item, .vjs-quality-selector li, button'));
                const target = items.find(el => (el.textContent || '').includes(qualityText));
                if (target) target.click();
            }, q).catch(() => {});
            await sleep(1500);
            
            const currentSources = await getSources();
            for (const apiUrl of currentSources) {
                if (apiUrl.includes('files-') && apiUrl.includes('.mp4')) {
                    if (!results.some(r => r.url === apiUrl)) {
                        results.push({ quality: detectQuality(apiUrl), url: apiUrl });
                    }
                } else if (apiUrl.includes('video.vid3rb.com/video/')) {
                    const finalUrl = await resolveVid3rbApiUrl(playerPage, apiUrl);
                    if (finalUrl && finalUrl.includes('.mp4')) {
                        const qName = detectQuality(apiUrl + ' ' + finalUrl);
                        if (!results.some(r => r.url === finalUrl)) {
                            results.push({ quality: qName, url: finalUrl });
                        }
                    }
                }
            }
        }

        // Final capture from requests
        for (const mp4 of capturedMp4s) {
            if (!results.some(r => r.url === mp4)) {
                results.push({ quality: detectQuality(mp4), url: mp4 });
            }
        }

        return results;

        // Also add any directly captured MP4 links from requests
        for (const mp4 of capturedMp4s) {
            if (!results.some(r => r.url === mp4)) {
                results.push({ quality: detectQuality(mp4), url: mp4 });
            }
        }

        return results;
    } catch (e) {
        process.stderr.write(`[ERROR] extractPlayerSources: ${e.message}\n`);
        return results;
    } finally {
        await playerPage.close().catch(() => {});
    }
};

// Helper: follow a video.vid3rb.com/video/{id}? redirect to get the final MP4 URL
const resolveVid3rbApiUrl = async (page, apiUrl) => {
    try {
        // Use the existing page context to make a fetch call (it has vid3rb cookies)
        const result = await page.evaluate(async (url) => {
            try {
                const resp = await fetch(url, { redirect: 'follow' });
                return resp.url;
            } catch (e) {
                return null;
            }
        }, apiUrl);
        return result;
    } catch (e) {
        return null;
    }
};

// Quality detection helper (used inside extractPlayerSources)  
const detectQuality = (url, label = '') => {
    const u = (url + ' ' + (label || '')).toLowerCase();
    if (u.includes('1080') || u.includes('fhd')) return '1080p';
    if (u.includes('720') || u.includes('hd')) return '720p';
    if (u.includes('480') || u.includes('sd')) return '480p';
    if (u.includes('360')) return '360p';
    return 'Direct link';
};

(async () => {
    const startUrl = process.argv[2];
    if (!startUrl) {
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
                '--no-zygote'
            ]
        });

        const discoveryPage = await browser.newPage();
        await discoveryPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => process.stderr.write(`Navigation timeout on discovery, continuing anyway...\n`));
        await sleep(3000);

        // Detect if we are on a titles page or single episode page
        const isTitlesPage = startUrl.includes('/titles/');
        const isEpisodePage = startUrl.includes('/episode/');

        let episodeUrls = [];

        if (isTitlesPage) {
            // Aggressively click "Load More" / "إظهار المزيد" buttons
            // Use a safer loop that handles reloads
            let iterations = 0;
            while (iterations < 10) {
                const didClick = await discoveryPage.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a, span')).filter(el => {
                        const txt = (el.textContent || '').trim();
                        return txt === 'إظهار المزيد' || txt === 'المزيد' || txt === 'Load More' || txt === 'المسلسل';
                    });
                    if (buttons.length > 0) {
                        buttons[0].click();
                        return true;
                    }
                    return false;
                }).catch(() => false);
                
                if (!didClick) break;
                await sleep(1500);
                iterations++;
            }

            // Extract all episodes from the titles page
            episodeUrls = await discoveryPage.evaluate(() => {
                const eps = [];
                const seen = new Set();
                document.querySelectorAll('a[href*="/episode/"]').forEach(a => {
                    const href = a.href.split('?')[0];
                    if (seen.has(href)) return;
                    seen.add(href);
                    
                    const text = (a.textContent || '').trim();
                    const urlMatch = href.split('?')[0].match(/\/(\d+)\/?$/);
                    const epMatch = text.match(/الحلقة\s*(\d+)/) || text.match(/Episode\s*(\d+)/i);
                    // Crucial: prefer URL match which avoids matching duration text (e.g. 24:40)
                    const num = urlMatch ? parseInt(urlMatch[1]) : (epMatch ? parseInt(epMatch[1]) : 0);
                    
                    eps.push({ href: href.split('?')[0], num, text: `الحلقة ${num}` });
                });
                return eps.sort((a, b) => a.num - b.num);
            });
        } else if (isEpisodePage) {
            const numMatch = startUrl.match(/\/(\d+)\/?$/);
            const num = numMatch ? parseInt(numMatch[1]) : 1;
            episodeUrls = [{ href: startUrl, num, text: `الحلقة ${num}` }];
        }

        const animeMeta = await discoveryPage.evaluate(() => {
            const getText = (el) => el ? (el.textContent || el.innerText || '').trim() : '';

            const titleEl = document.querySelector('h1') || document.querySelector('[class*="title"] h1') || document.querySelector('[class*="title"]');
            const title = getText(titleEl) || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';

            let poster = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
            if (!poster) {
                const imgEl = document.querySelector('img[src*="images.anime3rb.com"]');
                poster = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
            }

            let story = getText(document.querySelector('.description, [class*="description"], .story, [class*="story"], p'));
            if (!story || story.length < 5) story = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

            const genres = Array.from(document.querySelectorAll('a[href*="/genres/"], a[href*="/genre/"], a[href*="/tag/"]')).map(a => getText(a)).filter(Boolean);

            const getInfoValue = (keywords) => {
                for (const el of document.querySelectorAll('li, .info-item, [class*="info"] > *, dl dt, dl dd, span, p')) {
                    const text = getText(el);
                    for (const kw of keywords) {
                        if (text.includes(kw)) {
                            const next = el.nextElementSibling;
                            if (next) return getText(next);
                            return text.replace(kw, '').replace(':', '').trim();
                        }
                    }
                }
                return '';
            };

            return {
                title,
                story,
                poster,
                genres,
                status: getInfoValue(['الحالة', 'Status', 'حالة']) || 'مستمر',
                type: getInfoValue(['النوع', 'Type']) || 'TV'
            };
        });

        await discoveryPage.close();

        if (episodeUrls.length === 0) {
            throw new Error('لم يتم العثور على أي حلقات في هذا الرابط');
        }

        const episodes = [];
        const CONCURRENCY = 2; // Low concurrency for stability on anime3rb

        for (let i = 0; i < episodeUrls.length; i += CONCURRENCY) {
            const chunk = episodeUrls.slice(i, i + CONCURRENCY);
            const results = await Promise.all(chunk.map(async (ep) => {
                const res = await scrapeEpisode(browser, ep.href);
                return {
                    episodeNum: ep.num,
                    label: ep.text,
                    url: ep.href,
                    title: res.title || ep.text,
                    links: res.links,
                    error: res.error
                };
            }));
            episodes.push(...results);
            await sleep(1000);
        }

        await browser.close();

        process.stdout.write(JSON.stringify({
            success: true,
            title: animeMeta.title,
            data: [{
                ...animeMeta,
                url: animeMeta.poster,
                detailUrl: startUrl,
                episodes: String(episodeUrls.length)
            }],
            totalEpisodes: episodes.length,
            episodes: episodes
        }));

    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
})();
