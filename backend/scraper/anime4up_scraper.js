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

// ── Convert download URLs to embed URLs ───────────────────────────────────────
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
        // UQLoad - already embed if has 'embed-'
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
        // Voe.sx: /ID -> /e/ID
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
        // VK video - already embeddable
        if (u.includes('vkvideo.ru') || u.includes('vk.com')) return url;
        // Vidmoly
        if (u.includes('vidmoly')) {
            if (!url.includes('embed-')) {
                const id = url.split('/').pop()?.split('.')[0];
                if (id) return `https://vidmoly.net/embed-${id}.html`;
            }
            return url;
        }
        // Share4Max / Megamax - already embed
        if (u.includes('share4max.com') || u.includes('megamax')) return url;
        // Mega.nz - keep embed format
        if (u.includes('mega.nz')) return url;
        // File-upload (has embed)
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
        // Videa.hu - embeddable as-is
        if (u.includes('videa.hu')) return url;
        // If it already looks like an embed URL, return it
        if (u.includes('/embed') || u.includes('/e/') || u.includes('/iframe')) return url;
        return null;
    } catch { return null; }
};

// Extract server name and quality from li element text
const extractServerInfo = (text, url) => {
    text = text.replace(/\s+/g, ' ').trim();
    // Extract quality like [HD], [FHD], [SD]
    const qualityMatch = text.match(/\[(FHD|HD|SD|4K|1080p|720p|480p)\]/i);
    const quality = qualityMatch ? qualityMatch[1].toUpperCase() : '';
    // Clean name removes quality brackets
    const name = text.replace(/\[.*?\]/g, '').trim() || NORMALIZE_HOST(url);
    return { name, quality };
};

// ── Main ──────────────────────────────────────────────────────────────────────
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
            args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
        });

        const mainPage = await browser.newPage();
        await mainPage.setViewport({ width: 1280, height: 800 });
        await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        await mainPage.setRequestInterception(true);
        mainPage.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        // 1. Load Anime4Up episode page
        await mainPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);

        // 2. Extract ALL data from the page
        const allResults = await mainPage.evaluate(() => {
            const links = [];
            const seenUrls = new Set();

            const addLink = (url, label, quality, isDownload) => {
                if (!url || !url.startsWith('http') || seenUrls.has(url)) return;
                seenUrls.add(url);
                links.push({ url, label, quality: quality || '', isDownload: !!isDownload });
            };

            // ── STEP 1: Extract watch servers from #episode-servers li[data-watch] ──
            const serverTabs = document.querySelectorAll('#episode-servers li[data-watch], #watch-servers li[data-watch], ul[id*="server"] li[data-watch], ul.nav-tabs li[data-watch]');
            
            serverTabs.forEach(li => {
                const url = li.getAttribute('data-watch');
                if (!url || !url.startsWith('http')) return;
                
                // Get the text content (remove child element content like noscript)
                const clone = li.cloneNode(true);
                // Remove noscript from clone to get clean text
                clone.querySelectorAll('noscript, iframe').forEach(el => el.remove());
                const text = clone.textContent.replace(/\s+/g, ' ').trim();
                
                const qualityMatch = text.match(/\[(FHD|HD|SD|4K|1080p|720p|480p)\]/i);
                const quality = qualityMatch ? qualityMatch[1].toUpperCase() : '';
                const name = text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim() || 'Server';
                
                addLink(url, name, quality, false);
            });

            // ── STEP 2: Fallback - any iframe src that looks like a video embed ──
            document.querySelectorAll('.videoWrapper iframe, #player iframe, .ep-player iframe, .watch-server iframe').forEach(iframe => {
                if (iframe.src && iframe.src.startsWith('http')) {
                    addLink(iframe.src, 'Embed', '', false);
                }
            });

            // ── STEP 3: Extract download links ──
            // New style: table with .server-name and href
            document.querySelectorAll('#download a.btn, .ep-download a, .download-servers a, a[href].btn[target="_blank"]').forEach(a => {
                if (!a.href || !a.href.startsWith('http')) return;
                // Skip internal links
                if (a.href.includes('anime4up.')) return;
                
                const row = a.closest('tr');
                let serverName = '';
                let quality = '';
                
                if (row) {
                    const serverCell = row.querySelector('.server-name');
                    const qualityCell = row.querySelector('td:nth-child(2), .quality, span[class*="quality"]');
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

            // Extra: look for all a[href] pointing to known video hosts
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.href;
                if (!href || !href.startsWith('http') || seenUrls.has(href)) return;
                const isVideoLink = ['mp4upload', 'dood', 'voe.sx', 'uqload', 'streamtape', 
                    'filemoon', 'mixdrop', 'ok.ru', 'mega.nz', 'vkvideo', 'vidmoly',
                    'share4max', 'megamax', 'file-upload', 'solidfiles', 'upbaam',
                    'letsupload', 'uptostream', 'earnvids', 'streamruby', 'videa'].some(h => href.toLowerCase().includes(h));
                if (isVideoLink) {
                    const label = a.querySelector('.server-name')?.textContent?.trim() ||
                                  a.textContent.trim().substring(0, 30) || 'Link';
                    // Check if already in download table
                    const isInDownload = !!a.closest('#download, .ep-download, .download-wrapper');
                    addLink(href, label, '', isInDownload);
                }
            });

            return links;
        });

        // 3. Process results: normalize hosts, convert downloads to embeds
        const processedResults = [];
        const seenEmbeds = new Set();
        const downloadLinks = [];

        // First pass: handle watch server embeds
        for (const r of allResults) {
            if (r.isDownload) {
                downloadLinks.push(r);
                continue;
            }
            const host = NORMALIZE_HOST(r.url);
            const embedUrl = toEmbedUrl(r.url) || r.url;
            const label = `${r.label}${r.quality ? ' [' + r.quality + ']' : ''}`;
            
            if (!seenEmbeds.has(embedUrl)) {
                seenEmbeds.add(embedUrl);
                processedResults.push({
                    title: label,
                    downloadUrl: r.url,
                    embedUrl: embedUrl,
                    host: host,
                    quality: r.quality,
                    source: 'watch'
                });
            }
        }

        // Second pass: handle download links - convert to embed if possible, or add as download-only
        for (const r of downloadLinks) {
            const host = NORMALIZE_HOST(r.url);
            const embedUrl = toEmbedUrl(r.url);
            const label = `${r.label || host}${r.quality ? ' [' + r.quality + ']' : ''}`;

            if (embedUrl && !seenEmbeds.has(embedUrl)) {
                seenEmbeds.add(embedUrl);
                processedResults.push({
                    title: label,
                    downloadUrl: r.url,
                    embedUrl: embedUrl,
                    host: host,
                    quality: r.quality,
                    source: 'download-converted'
                });
            } else if (!embedUrl) {
                // Can't convert but still add as download-only
                if (!processedResults.some(p => p.downloadUrl === r.url)) {
                    processedResults.push({
                        title: label,
                        downloadUrl: r.url,
                        embedUrl: null,
                        host: host,
                        quality: r.quality,
                        source: 'download'
                    });
                }
            }
        }

        await browser.close();
        console.log(JSON.stringify({ 
            success: processedResults.length > 0, 
            count: processedResults.length, 
            results: processedResults, 
            page_url: mainPage.url() 
        }));

    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        console.log(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
})();
