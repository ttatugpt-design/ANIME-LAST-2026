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
            // EarnVids/minochinos: extract ID and build /embed/ID URL
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
            
            const elements = document.querySelectorAll('li[data-watch], .serverList li, ul.watch-servers li, div.server, a.server');
            for (const el of elements) {
                const url = el.getAttribute('data-watch') || el.getAttribute('data-ep');
                if (url) {
                    const labelStr = el.innerText?.trim() || el.textContent?.trim() || 'Server';
                    const lines = labelStr.split('\n').filter(s => s.trim().length > 0);
                    let label = lines[lines.length - 1];
                    if (!label || label.match(/^\d+$/)) label = labelStr.replace(/\n/g, ' ').trim();
                    window.extractedLinks.push({ label: label, url: url });
                }
            }
            
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
    let startUrl = process.argv[2];
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
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2500);
        
        const episodeUrls = await discoveryPage.evaluate((startUrl) => {
            const links = [];
            // Target the EpisodesList container specifically, or generic links if not found
            let targets = document.querySelectorAll('.EpisodesList a');
            if (targets.length === 0) {
                targets = document.querySelectorAll('a[href*="ristoanime.co"]');
            }

            const seen = new Set();
            targets.forEach(a => {
                const href = a.href.split('?')[0].replace(/\/watch\/?$/, ''); // Normalize URL
                if (!href || seen.has(href) || href === startUrl.split('?')[0]) return;
                
                const text = a.textContent.trim();
                // Match "الحلقة X" or extract from URL if necessary
                const isEpisode = text.includes('الحلقة') || href.match(/%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-\d+/);
                
                if (isEpisode) {
                    seen.add(href);
                    const tNum = text.match(/\d+/);
                    let num = 99;
                    if (tNum) {
                        num = parseInt(tNum[0]);
                    } else {
                        const hNum = href.match(/-(\d+)\/?$/);
                        if (hNum) num = parseInt(hNum[1]);
                    }
                    links.push({ href: href, num: num, text: text || ('الحلقة ' + num) });
                }
            });

            // Ensure startUrl itself is included if it represents an episode
            if (!seen.has(startUrl.split('?')[0].replace(/\/watch\/?$/, '')) && startUrl.match(/%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-\d+/)) {
                const hNum = startUrl.match(/-(\d+)\/?/);
                const num = hNum ? parseInt(hNum[1]) : 1;
                links.push({ href: startUrl.split('?')[0].replace(/\/watch\/?$/, ''), num: num, text: 'الحلقة ' + num });
            }

            links.sort((a, b) => a.num - b.num);
            return links;
        }, startUrl);
        
        await discoveryPage.close();
        
        const allEpisodes = episodeUrls.length > 0 ? episodeUrls : [{ href: startUrl, text: 'الحلقة 1', num: 1 }];
        const episodes = [];
        
        // Loop and scrape each episode
        for (const ep of allEpisodes) {
            const result = await scrapeEpisode(browser, ep.href);
            episodes.push({ 
                episodeNum: ep.num, 
                label: ep.text || ('الحلقة ' + ep.num), 
                url: ep.href, 
                title: result.title || ep.text, 
                links: result.links || [], 
                error: result.error 
            });
            await sleep(1500);
        }
        
        await browser.close();
        process.stdout.write(JSON.stringify({ success: true, totalEpisodes: episodes.length, episodes }));
    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
})();
