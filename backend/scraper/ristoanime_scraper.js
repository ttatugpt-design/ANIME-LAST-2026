const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Known video hosts & aliasing ───────────────────────────────────────────────
const VIDEO_HOSTS = [
    'dood', 'dsvplay', 'dooood', 'streamruby', 'mixdrop',
    'hglink', 'hgcloud', 'uqload', 'streamtape', 'filemoon',
    'vidbom', 'mcloud', 'streamsb', 'vidoza', 'upstream', 'huntrexus',
    'earnvids', 'vidfast', 'minochinos', 'streamhg', 'mp4upload', 'ok.ru', 'gounlimited',
    'videa', 'vkvideo', 'vk.com', 'vidmoly', 'voe.sx', 'mega.nz', 'share4max', 'turbovidhls', 'sendvid',
    'earnvid', 'vidfast.co'
];

const NORMALIZE_HOST = (h) => {
    const low = h.toLowerCase();
    if (low.includes('dood') || low.includes('dsvplay') || low.includes('dooood')) return 'dood';
    if (low.includes('earnvids') || low.includes('minochinos')) return 'earnvids';
    if (low.includes('hgcloud') || low.includes('hglink') || low.includes('streamhg')) return 'hgcloud';
    if (low.includes('mp4upload')) return 'mp4upload';
    if (low.includes('uqload')) return 'uqload';
    if (low.includes('filemoon')) return 'filemoon';
    return low;
};

const toEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const u = url.toLowerCase();
        if (u.includes('dood') || u.includes('dsvplay') || u.includes('dooood')) return url.replace(/\/(d|f|e|file)\//, '/e/');
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
            // EarnVids/minochinos: extract ID and build canonical embed URL
            const id = url.split('/').pop()?.split('?')[0];
            if (!id) return null;
            try {
                const base = new URL(url).origin;
                return `${base}/embed/${id}`;
            } catch { return null; }
        }
        return null;
    } catch { return null; }
};

const scrapeEpisode = async (browser, baseUrl) => {
    const page = await browser.newPage();
    let episodeUrl = baseUrl;
    // RistoAnime uses /watch endpoint for player
    if (!episodeUrl.endsWith('/watch') && !episodeUrl.endsWith('/watch/')) {
        episodeUrl = episodeUrl.endsWith('/') ? episodeUrl + 'watch' : episodeUrl + '/watch';
    }

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
            const h1 = document.querySelector('h1.PostTitle, h1');
            return h1 ? h1.textContent.trim().substring(0, 100) : '';
        });

        const allResults = await page.evaluate(async () => {
            const results = [];
            window.extractedLinks = [];
            
            // Extract from watch data attributes
            const elements = document.querySelectorAll('li[data-watch], .serverList li, ul.watch-servers li, div.server, a.server');
            for (const el of elements) {
                const url = el.getAttribute('data-watch') || el.getAttribute('data-ep');
                if (url) {
                    const labelStr = el.innerText?.trim() || el.textContent?.trim() || 'Server';
                    const lines = labelStr.split('\n').filter(s => s.trim().length > 0);
                    let label = lines[lines.length - 1]; // "سيرفر 1"
                    if (!label || label.match(/^\d+$/)) label = labelStr.replace(/\n/g, ' ').trim();
                    window.extractedLinks.push({ label: label, url: url });
                }
            }
            
            // If direct iframe is available without clicking
            document.querySelectorAll('iframe').forEach(ifr => {
                 if (ifr.src && ifr.src.startsWith('http') && !window.extractedLinks.some(l => l.url === ifr.src)) {
                     window.extractedLinks.push({ label: 'Embed', url: ifr.src });
                 }
            });
            
            return window.extractedLinks;
        });

        const processedResults = [];
        const seenUrls = new Set();
        
        for (const r of allResults) {
            const rawHref = r.url;
            if (seenUrls.has(rawHref) || rawHref.includes('javascript:false')) continue;
            seenUrls.add(rawHref);

            let hostMatch = VIDEO_HOSTS.find(h => rawHref.toLowerCase().includes(h));
            let host = hostMatch ? NORMALIZE_HOST(hostMatch) : 'embed';

            let embedUrl = rawHref;
            const bestEmbed = toEmbedUrl(rawHref);
            if (bestEmbed) embedUrl = bestEmbed;

            processedResults.push({ title: r.label, downloadUrl: rawHref, embedUrl: embedUrl, host: host });
        }

        return { title, url: episodeUrl, links: processedResults, error: null };
    } catch (err) {
        return { title: '', url: episodeUrl, links: [], error: err.message };
    } finally {
        await page.close().catch(() => {});
    }
};

(async () => {
    let episodeUrl = process.argv[2];
    if (!episodeUrl) {
        process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
        });
        
        const result = await scrapeEpisode(browser, episodeUrl);
        
        await browser.close();
        if (result.error) {
            process.stdout.write(JSON.stringify({ success: false, error: result.error }));
        } else {
            process.stdout.write(JSON.stringify({ success: true, ...result }));
        }
    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
})();
