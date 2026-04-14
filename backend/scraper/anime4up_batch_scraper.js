const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Known video hosts & aliasing ──────────────────────────────────────────────
const VIDEO_HOSTS = [
    'dood', 'dsvplay', 'dooood', 'playmogo', 'streamruby', 'mixdrop',
    'hglink', 'hgcloud', 'uqload', 'streamtape', 'filemoon',
    'vidbom', 'mcloud', 'streamsb', 'vidoza', 'upstream', 'huntrexus',
    'earnvids', 'vidfast', 'minochinos', 'streamhg', 'mp4upload', 'ok.ru', 'gounlimited',
    'videa', 'vkvideo', 'vk.com', 'vidmoly', 'voe.sx', 'voe', 'mega.nz', 'share4max',
    'megamax', 'file-upload', 'letsupload', 'solidfiles', 'upbaam', 'uptostream',
    'videa.hu', 'okru'
];

const NORMALIZE_HOST = (url) => {
    const low = url.toLowerCase();
    if (low.includes('dood') || low.includes('dsvplay') || low.includes('dooood') || low.includes('playmogo')) return 'dood';
    if (low.includes('earnvids') || low.includes('minochinos')) return 'earnvids';
    if (low.includes('hgcloud') || low.includes('hglink') || low.includes('streamhg')) return 'hgcloud';
    if (low.includes('mp4upload')) return 'mp4upload';
    if (low.includes('uqload')) return 'uqload';
    if (low.includes('filemoon')) return 'filemoon';
    if (low.includes('share4max') || low.includes('megamax')) return 'share4max';
    if (low.includes('voe.sx') || low.includes('voe')) return 'voe';
    if (low.includes('ok.ru') || low.includes('okru')) return 'okru';
    if (low.includes('vkvideo') || low.includes('vk.com')) return 'vkvideo';
    if (low.includes('vidmoly')) return 'vidmoly';
    if (low.includes('videa')) return 'videa';
    if (low.includes('mega.nz')) return 'mega';
    if (low.includes('mixdrop')) return 'mixdrop';
    if (low.includes('streamtape')) return 'streamtape';
    if (low.includes('streamruby')) return 'streamruby';
    if (low.includes('file-upload')) return 'file-upload';
    if (low.includes('letsupload')) return 'letsupload';
    if (low.includes('solidfiles')) return 'solidfiles';
    if (low.includes('upbaam')) return 'upbaam';
    if (low.includes('uptostream')) return 'uptostream';
    try { return new URL(url).hostname.replace('www.', ''); } catch { return 'unknown'; }
};

const toEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const u = url.toLowerCase();
        // DoodStream / variants
        if (u.includes('dood') || u.includes('dsvplay') || u.includes('dooood') || u.includes('playmogo')) {
            return url.replace(/\/(d|f|file|download)\//i, '/e/');
        }
        // StreamRuby
        if (u.includes('streamruby.com')) return url.replace(/\/(d|f)\//i, '/e/');
        // Mixdrop
        if (u.includes('mixdrop.')) return url.replace(/\/f\//i, '/e/');
        // HGCloud / HGLink
        if (u.includes('hgcloud') || u.includes('hglink') || u.includes('streamhg')) {
            if (!url.includes('/e/')) {
                const parts = url.split('/');
                const code = parts[parts.length - 1];
                if (code) return url.replace(code, 'e/' + code);
            }
            return url;
        }
        // UQLoad
        if (u.includes('uqload.')) {
            const id = url.split('/').pop()?.replace('.html', '').replace('embed-', '');
            return `https://uqload.to/embed-${id}.html`;
        }
        // Streamtape
        if (u.includes('streamtape.')) return url.replace(/\/v\//i, '/e/');
        // Filemoon
        if (u.includes('filemoon.')) return url.replace(/\/d\//i, '/f/');
        // Mp4Upload: /ID -> /embed-ID.html
        if (u.includes('mp4upload.com') && !u.includes('embed-')) {
            const id = url.split('/').pop()?.split('.')[0];
            if (id) return `https://www.mp4upload.com/embed-${id}.html`;
        }
        // Voe.sx
        if (u.includes('voe.sx') || u.includes('voe.')) {
            if (!url.includes('/e/')) {
                const id = url.split('/').pop();
                if (id) return `https://voe.sx/e/${id}`;
            }
            return url;
        }
        // Ok.ru
        if (u.includes('ok.ru')) {
            return url.replace('/video/', '/videoembed/').replace('://ok.ru/video/', '://ok.ru/videoembed/');
        }
        // VK video
        if (u.includes('vkvideo.ru') || u.includes('vk.com')) return url;
        // Vidmoly
        if (u.includes('vidmoly')) {
            if (!url.includes('embed-')) {
                const id = url.split('/').pop()?.split('.')[0];
                if (id) return `https://vidmoly.net/embed-${id}.html`;
            }
            return url;
        }
        // Share4Max / Megamax
        if (u.includes('share4max.com') || u.includes('megamax')) return url;
        // Mega.nz
        if (u.includes('mega.nz')) return url;
        // File-upload
        if (u.includes('file-upload.org') && !u.includes('embed-')) {
            const id = url.split('/').pop()?.split('.')[0].replace('embed-', '');
            if (id) return `https://file-upload.org/embed-${id}.html`;
        }
        // EarnVids / Vidfast / Minochinos → /embed/ID
        if (u.includes('earnvids') || u.includes('vidfast') || u.includes('minochinos') || u.includes('earnvid')) {
            const id = url.split('/').pop()?.split('?')[0];
            if (!id) return null;
            try {
                const base = new URL(url).origin;
                return `${base}/embed/${id}`;
            } catch { return null; }
        }
        // Videa.hu
        if (u.includes('videa.hu')) return url;
        // Already looks like embed
        if (u.includes('/embed') || u.includes('/e/') || u.includes('/iframe')) return url;
        return null;
    } catch { return null; }
};

// ── Extract all servers from an already-loaded page ──────────────────────────
const extractLinksFromPage = async (page) => {
    const allResults = await page.evaluate(() => {
        const links = [];
        const seenUrls = new Set();

        const addLink = (url, label, quality, isDownload) => {
            if (!url || !url.startsWith('http') || seenUrls.has(url)) return;
            seenUrls.add(url);
            links.push({ url, label: label || '', quality: quality || '', isDownload: !!isDownload });
        };

        // ── STEP 1: Watch servers - #episode-servers li[data-watch] ──
        const serverTabs = document.querySelectorAll(
            '#episode-servers li[data-watch], #watch-servers li[data-watch], ul[id*="server"] li[data-watch], ul.nav-tabs li[data-watch]'
        );

        serverTabs.forEach(li => {
            const url = li.getAttribute('data-watch');
            if (!url || !url.startsWith('http')) return;

            const clone = li.cloneNode(true);
            clone.querySelectorAll('noscript, iframe').forEach(el => el.remove());
            const text = clone.textContent.replace(/\s+/g, ' ').trim();

            const qualityMatch = text.match(/\[(FHD|HD|SD|4K|1080p|720p|480p)\]/i);
            const quality = qualityMatch ? qualityMatch[1].toUpperCase() : '';
            const name = text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim() || 'Server';

            addLink(url, name, quality, false);
        });

        // ── STEP 2: Fallback iframes ──
        document.querySelectorAll('.videoWrapper iframe, #player iframe, .ep-player iframe').forEach(iframe => {
            if (iframe.src && iframe.src.startsWith('http')) {
                addLink(iframe.src, 'Embed', '', false);
            }
        });

        // ── STEP 3: Download links ──
        document.querySelectorAll('#download a.btn, .ep-download a, .download-servers a, a[href].btn[target="_blank"]').forEach(a => {
            if (!a.href || !a.href.startsWith('http')) return;
            if (a.href.includes('anime4up.')) return;

            const row = a.closest('tr');
            let serverName = '';
            let quality = '';

            if (row) {
                const serverCell = row.querySelector('.server-name');
                const qualityCell = row.querySelector('td:nth-child(2), .quality, [class*="quality"]');
                if (serverCell) serverName = serverCell.textContent.trim();
                if (qualityCell) {
                    const qMatch = qualityCell.textContent.match(/\d+p|FHD|HD|SD/i);
                    if (qMatch) quality = qMatch[0];
                }
            }

            const label = serverName || a.querySelector('.server-name')?.textContent?.trim() ||
                          a.textContent.trim().substring(0, 30) || 'Download';
            addLink(a.href, label, quality, true);
        });

        // ── STEP 4: All video-host links on page ──
        const knownHosts = ['mp4upload', 'dood', 'dsvplay', 'dooood', 'voe.sx', 'voe', 'uqload',
            'streamtape', 'filemoon', 'mixdrop', 'ok.ru', 'mega.nz', 'vkvideo', 'vidmoly',
            'share4max', 'megamax', 'file-upload', 'solidfiles', 'upbaam', 'letsupload',
            'uptostream', 'earnvids', 'streamruby', 'videa', 'playmogo'];

        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.href;
            if (!href || !href.startsWith('http') || seenUrls.has(href)) return;
            if (knownHosts.some(h => href.toLowerCase().includes(h))) {
                const isInDownload = !!a.closest('#download, .ep-download, .download-wrapper');
                const label = a.querySelector('.server-name')?.textContent?.trim() ||
                              a.textContent.trim().substring(0, 30) || 'Link';
                addLink(href, label, '', isInDownload);
            }
        });

        return links;
    });

    return allResults;
};

const scrapeEpisode = async (browser, episodeUrl) => {
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);

        const title = await page.evaluate(() => {
            const h1 = document.querySelector('h1.anime-details-title, h1');
            return h1 ? h1.textContent.trim().substring(0, 100) : '';
        });

        const allResults = await extractLinksFromPage(page);

        // Process results
        const processedResults = [];
        const seenEmbeds = new Set();
        const downloadLinks = [];

        for (const r of allResults) {
            if (r.isDownload) { downloadLinks.push(r); continue; }
            const host = NORMALIZE_HOST(r.url);
            const embedUrl = toEmbedUrl(r.url) || r.url;
            const label = `${r.label}${r.quality ? ' [' + r.quality + ']' : ''}`;
            if (!seenEmbeds.has(embedUrl)) {
                seenEmbeds.add(embedUrl);
                processedResults.push({ title: label, downloadUrl: r.url, embedUrl, host, quality: r.quality, source: 'watch' });
            }
        }

        for (const r of downloadLinks) {
            const host = NORMALIZE_HOST(r.url);
            const embedUrl = toEmbedUrl(r.url);
            const label = `${r.label || host}${r.quality ? ' [' + r.quality + ']' : ''}`;
            if (embedUrl && !seenEmbeds.has(embedUrl)) {
                seenEmbeds.add(embedUrl);
                processedResults.push({ title: label, downloadUrl: r.url, embedUrl, host, quality: r.quality, source: 'download-converted' });
            } else if (!embedUrl && !processedResults.some(p => p.downloadUrl === r.url)) {
                processedResults.push({ title: label, downloadUrl: r.url, embedUrl: null, host, quality: r.quality, source: 'download' });
            }
        }

        return { title, url: episodeUrl, links: processedResults, error: null };
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
            args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
        });
        
        const discoveryPage = await browser.newPage();
        await discoveryPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await discoveryPage.setRequestInterception(true);
        discoveryPage.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });
        
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2500);

        const episodeUrls = await discoveryPage.evaluate((startUrl) => {
            const links = [];
            const seen = new Set();
            
            // Find all episode links on the page
            const allLinks = Array.from(document.querySelectorAll('a[href*="/episode/"]'));
            
            allLinks.forEach(a => {
                const href = a.href.split('?')[0].split('#')[0];
                if (!href || seen.has(href)) return;
                seen.add(href);

                const text = a.textContent.trim();
                const tNum = text.match(/\d+/);
                let num = 0;
                if (tNum) {
                    num = parseInt(tNum[0]);
                } else {
                    const hNum = href.match(/-(\d+)\/?$/);
                    if (hNum) num = parseInt(hNum[1]);
                }

                links.push({ href, num, text: text || ('الحلقة ' + num) });
            });

            // Include startUrl itself if not in the list
            const cleanStart = startUrl.split('?')[0].split('#')[0];
            if (!seen.has(cleanStart) && cleanStart.includes('/episode/')) {
                const hNum = cleanStart.match(/-(\d+)\/?$/);
                const num = hNum ? parseInt(hNum[1]) : 1;
                links.push({ href: cleanStart, num, text: 'الحلقة ' + num });
            }

            links.sort((a, b) => a.num - b.num);
            return links;
        }, startUrl);

        await discoveryPage.close();

        const allEpisodes = episodeUrls.length > 0 ? episodeUrls : [{ href: startUrl, text: 'الحلقة 1', num: 1 }];
        const episodes = [];

        for (const ep of allEpisodes) {
            const result = await scrapeEpisode(browser, ep.href);
            episodes.push({
                episodeNum: ep.num,
                label: ep.text || ('الحلقة ' + ep.num),
                url: ep.href,
                title: result.title || ep.text,
                links: result.links,
                error: result.error
            });
            await sleep(1500);
        }

        await browser.close();
        process.stdout.write(JSON.stringify({
            success: true,
            totalEpisodes: episodes.length,
            episodes
        }));

    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
})();
