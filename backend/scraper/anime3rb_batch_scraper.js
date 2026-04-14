const puppeteer = require('puppeteer');

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
        
        let directMp4Url = null;
        await page.setRequestInterception(true);
        page.on('request', req => {
            const rUrl = req.url();
            if (rUrl.includes('vid3rb.com') && rUrl.includes('.mp4')) {
                directMp4Url = rUrl;
            }
            if (['image', 'font', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await Promise.race([
            page.waitForSelector('iframe', { timeout: 3000 }),
            page.waitForSelector('.servers-list, .servers-container, .episodes-list', { timeout: 3000 })
        ]).catch(() => {});

        // Try to trigger the video load to capture the network request
        try {
            await page.evaluate(() => {
                const btn = document.querySelector('.vjs-big-play-button, .play-button, [class*="play"], .watchNow');
                if (btn) btn.click();
            });
            await sleep(2500);
            
            // Go through iframes to click play and extract src
            const frames = page.frames();
            for (const f of frames) {
                const src = await f.evaluate(() => {
                    const v = document.querySelector('video source, video');
                    if (v && v.src && v.src.includes('.mp4')) return v.src;
                    const b = document.querySelector('.vjs-big-play-button, .play-button');
                    if (b) b.click();
                    return null;
                }).catch(() => null);
                if (src && src.includes('vid3rb.com')) directMp4Url = src;
            }
        } catch (e) {}

        if (!directMp4Url) await sleep(1500);


        // Anime3rb specific: Servers are usually in a list under the player
        const title = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
        });

        const links = await page.evaluate(() => {
            const results = [];
            // Many anime3rb episodes have servers in a specific list
            document.querySelectorAll('ul.servers-list li, .servers-container a, .episodes-list a').forEach(el => {
                const href = el.getAttribute('href') || el.getAttribute('data-url');
                const label = el.textContent.trim();
                if (href && href.startsWith('http')) {
                    results.push({ label, href });
                }
            });

            // Also check for iframes that might already be there
            document.querySelectorAll('iframe').forEach(f => {
                if (f.src && f.src.startsWith('http')) {
                    results.push({ label: 'Embed', href: f.src });
                }
            });

            return results;
        });

        const allResults = [];
        const seen = new Set();

        for (const link of links) {
            if (seen.has(link.href)) continue;
            seen.add(link.href);

            let embedUrl = toEmbedUrl(link.href);
            if (!embedUrl && (link.href.includes('embed') || link.href.includes('/player/') || link.href.includes('vid3rb') || link.href.includes('.mp4') || link.href.includes('.m3u8'))) {
                embedUrl = link.href;
            }
            
        
            if (embedUrl || isVideoHost(link.href)) {
                allResults.push({
                    title: link.label && link.label !== 'Embed' ? link.label : 'Anime3rb Server',
                    downloadUrl: link.href,
                    embedUrl: embedUrl || link.href,
                    host: 'anime3rb'
                });
            }
        }

        if (directMp4Url) {
            allResults.unshift({
                title: 'Vid3rb 1080p Direct',
                downloadUrl: directMp4Url,
                embedUrl: directMp4Url,
                host: 'anime3rb'
            });
        }

        return { title, url: episodeUrl, links: allResults, error: null };
    } catch (err) {
        return { title: '', url: episodeUrl, links: [], error: err.message };
    } finally {
        await page.close().catch(() => {});
    }
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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

        const discoveryPage = await browser.newPage();
        await discoveryPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await sleep(3000);

        // Detect if we are on a titles page or single episode page
        const isTitlesPage = startUrl.includes('/titles/');
        const isEpisodePage = startUrl.includes('/episode/');

        let episodeUrls = [];

        if (isTitlesPage) {
            // Extract all episodes from the titles page
            episodeUrls = await discoveryPage.evaluate(() => {
                const eps = [];
                const seen = new Set();
                document.querySelectorAll('a[href*="/episode/"]').forEach(a => {
                    const href = a.href.split('?')[0];
                    if (seen.has(href)) return;
                    seen.add(href);
                    
                    const text = a.textContent.trim();
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
