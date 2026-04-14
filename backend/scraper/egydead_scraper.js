const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Known video hosts & aliasing ───────────────────────────────────────────────
const VIDEO_HOSTS = [
    'dood', 'dsvplay', 'dooood', 'streamruby', 'mixdrop',
    'hglink', 'hgcloud', 'uqload', 'streamtape', 'filemoon',
    'vidbom', 'mcloud', 'streamsb', 'vidoza', 'upstream', 'huntrexus',
    'earnvids', 'vidfast', 'minochinos', 'streamhg',
    'earnvid', 'vidfast.co'
];

const NORMALIZE_HOST = (h) => {
    const low = h.toLowerCase();
    if (low.includes('dood') || low.includes('dsvplay')) return 'dood';
    if (low.includes('earnvids') || low.includes('minochinos')) return 'earnvids';
    if (low.includes('hgcloud') || low.includes('hglink') || low.includes('streamhg')) return 'hgcloud';
    return low;
};

// ── Known intermediate/redirect hosts that wrap real video links ───────────────
const INTERMEDIATE_HOSTS = ['hanerix.com', 'koramaup.com', 'vikingfile.com', 'send.now'];

const isVideoHost  = (url) => VIDEO_HOSTS.some(h => url.toLowerCase().includes(h));
const isIntermediate = (url) => INTERMEDIATE_HOSTS.some(h => url.toLowerCase().includes(h));

// ── Convert any video-host URL to its embed form ───────────────────────────────
const toEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const u = url.toLowerCase();
        // DoodStream / dsvplay normalization
        if (u.includes('dood') || u.includes('dsvplay') || u.includes('dooood')) {
            // Pattern: /d/ID or /f/ID -> /e/ID
            return url.replace(/\/(d|f|e|file)\//, '/e/');
        }
        if (u.includes('streamruby.com'))  return url.replace(/\/(d|f)\//, '/e/');
        if (u.includes('mixdrop.'))        return url.replace('/f/', '/e/');
        if (u.includes('hgcloud') || u.includes('hglink') || u.includes('streamhg')) {
            const parts = url.split('/');
            const code  = parts[parts.length - 1];
            if (code && !url.includes('/e/')) return url.replace(code, 'e/' + code);
            return url;
        }
        if (u.includes('uqload.')) {
            const id = url.split('/').pop()?.replace('.html', '').replace('embed-', '');
            return `https://uqload.to/embed-${id}.html`;
        }
        if (u.includes('streamtape.')) return url.replace('/v/', '/e/');
        if (u.includes('filemoon.'))   return url.replace('/d/', '/e/');
        if (u.includes('earnvids') || u.includes('vidfast') || u.includes('minochinos') || u.includes('earnvid')) {
            // EarnVids/minochinos: extract ID from any path (/file/ID, /d/ID, /e/ID, /v/ID)
            // and convert to the canonical embed URL: /embed/ID
            const id = url.split('/').pop()?.split('?')[0];
            if (!id) return null;
            // Get the base domain (could be minochinos.com, earnvids.com, vidfast.co, etc.)
            try {
                const base = new URL(url).origin;
                return `${base}/embed/${id}`;
            } catch { return null; }
        }
        return null;
    } catch { return null; }
};

// ── Resolve an intermediate page → real embed link ────────────────────────────
const resolveIntermediate = async (page, url) => {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(1500);

        const resolved = await page.evaluate(() => {
            const ietEl = document.getElementById('iet');
            if (ietEl && ietEl.value) {
                const m = ietEl.value.match(/SRC="([^"]+)"/i);
                if (m) return { embedUrl: m[1], source: 'iet-textarea' };
            }
            const textareas = Array.from(document.querySelectorAll('textarea'));
            for (const ta of textareas) {
                if (ta.value && ta.value.trim().startsWith('http') && !ta.value.includes('[')) {
                    return { downloadUrl: ta.value.trim(), source: 'textarea-download' };
                }
            }
            const origin = window.location.origin;
            const links = Array.from(document.querySelectorAll('a')).filter(a =>
                a.href && a.href.startsWith('http') && !a.href.startsWith(origin) && !a.href.endsWith('#')
            );
            if (links.length > 0) return { downloadUrl: links[0].href, source: 'anchor-link' };
            return null;
        });

        if (!resolved) return null;
        if (resolved.embedUrl) return { embedUrl: resolved.embedUrl, downloadUrl: resolved.downloadUrl || null };
        if (resolved.downloadUrl) {
            const embed = toEmbedUrl(resolved.downloadUrl);
            return { embedUrl: embed, downloadUrl: resolved.downloadUrl };
        }
        return null;
    } catch (err) { return null; }
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

        const resolvePage = await browser.newPage();
        await resolvePage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        await mainPage.setRequestInterception(true);
        mainPage.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        // ── Step 1: Load EgyDead episode page ──────────────────────────────────
        await mainPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2000);

        // ── Step 2: Click "المشاهدة والتحميل" ─────────────────────────────────
        const watchNow = await mainPage.$('.watchNow');
        if (watchNow) {
            await watchNow.click();
            await sleep(4000);
        }

        // ── Step 3: Link Collection Helper ──────────────────────────────────
        const collectEpisodeLinks = async (targetPage) => {
            // First, find specific Download Boxes (DoodStream, EarnVids, Multi Quality)
            const boxes = await targetPage.evaluate((videoHosts) => {
                const results = [];
                // Look for containers that have a label and a download link
                document.querySelectorAll('.ser-link').forEach(a => {
                    const parentText = a.parentElement.textContent.trim();
                    const href = a.href;
                    if (href && href.startsWith('http')) {
                        results.push({ text: parentText, href: href });
                    }
                });
                
                // Also get all standard links
                Array.from(document.querySelectorAll('a'))
                    .filter(a => a.href && a.href.startsWith('http') && !a.href.endsWith('#'))
                    .forEach(a => {
                        results.push({ text: a.textContent.trim().substring(0, 50), href: a.href });
                    });
                return results;
            }, VIDEO_HOSTS);

            const uniqueLinks = [];
            const seenHref = new Set();
            for (const l of boxes) {
                if (seenHref.has(l.href)) continue;
                seenHref.add(l.href);
                uniqueLinks.push(l);
            }

            const results = [];
            const downloadHosts = ['gofile','megaup','1fichier','bowfile','1cloudfile','krakenfiles','forafile'];

            for (const link of uniqueLinks) {
                const label = link.text || link.href;
                const rawHref = link.href;

                // A) Direct video/stream host
                if (isVideoHost(rawHref)) {
                    const normHost = NORMALIZE_HOST(VIDEO_HOSTS.find(h => rawHref.toLowerCase().includes(h)) || 'stream');
                    const embed = toEmbedUrl(rawHref);
                    results.push({ 
                        title: label, 
                        downloadUrl: rawHref, 
                        embedUrl: embed || rawHref, 
                        host: normHost 
                    });
                    continue;
                }

                // B) Intermediate host (hanerix, etc.) – resolve through it
                if (isIntermediate(rawHref)) {
                    const resolved = await resolveIntermediate(resolvePage, rawHref);
                    if (resolved) {
                        results.push({ 
                            title: label, 
                            downloadUrl: resolved.downloadUrl || rawHref, 
                            embedUrl: resolved.embedUrl || resolved.downloadUrl || rawHref, 
                            host: 'hgcloud', 
                            via: rawHref 
                        });
                    }
                    continue;
                }

                // C) Download-only hosts
                if (downloadHosts.some(h => rawHref.includes(h))) {
                    results.push({ 
                        title: label, 
                        downloadUrl: rawHref, 
                        embedUrl: null, 
                        host: downloadHosts.find(h => rawHref.includes(h)) || 'download' 
                    });
                }
            }
            return results;
        };

        // ── Step 4: Collect Stage 1 (Initial Buttons & Download Section) ──
        let allResults = [];
        const seenDownloadUrls = new Set();
        const stage1 = await collectEpisodeLinks(mainPage);
        stage1.forEach(r => { 
            if (!seenDownloadUrls.has(r.downloadUrl)) { 
                allResults.push(r); 
                seenDownloadUrls.add(r.downloadUrl); 
            } 
        });

        // ── Step 5: Click "جميع الجودات" ─────────────────────────────────────
        const qualityClicked = await mainPage.evaluate(() => {
            for (const el of document.querySelectorAll('a, button, span, div')) {
                const t = el.textContent.trim();
                if (t.includes('جميع') && t.includes('جودات')) {
                    const href = el.getAttribute('href');
                    if (href && href.startsWith('http')) return 'link:' + href;
                    el.click();
                    return 'clicked';
                }
            }
            return 'not-found';
        });

        if (qualityClicked !== 'not-found') {
            if (qualityClicked.startsWith('link:')) {
                await mainPage.goto(qualityClicked.slice(5), { waitUntil: 'domcontentloaded', timeout: 20000 });
            }
            await sleep(3500);
            const stage2 = await collectEpisodeLinks(mainPage);
            stage2.forEach(r => { 
                if (!seenDownloadUrls.has(r.downloadUrl)) { 
                    allResults.push(r); 
                    seenDownloadUrls.add(r.downloadUrl); 
                } 
            });
        }

        await browser.close();
        console.log(JSON.stringify({ 
            success: allResults.length > 0, 
            count: allResults.length, 
            results: allResults, 
            page_url: mainPage.url() 
        }));

    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        console.log(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
})();
