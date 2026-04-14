const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const VIDEO_HOSTS  = ['dood','dsvplay','dooood','streamruby','mixdrop','hglink','hgcloud','uqload','streamtape','filemoon','vidbom','mcloud','streamsb','vidoza','upstream','huntrexus', 'earnvids', 'vidfast', 'minochinos', 'streamhg', 'earnvid', 'vidfast.co', 'voe'];
const INTERMEDIATE = ['hanerix.com','koramaup.com','vikingfile.com'];
const DOWNLOAD_ONLY = ['gofile','megaup','1fichier','bowfile','1cloudfile','krakenfiles','forafile','send.now'];

const isVideoHost    = (url) => VIDEO_HOSTS.some(h => url.toLowerCase().includes(h));
const isIntermediate = (url) => INTERMEDIATE.some(h => url.toLowerCase().includes(h));
const isDownloadOnly = (url) => DOWNLOAD_ONLY.some(h => url.toLowerCase().includes(h));

const NORMALIZE_HOST = (h) => {
    const low = h.toLowerCase();
    if (low.includes('dood') || low.includes('dsvplay')) return 'dood';
    if (low.includes('earnvids') || low.includes('minochinos')) return 'earnvids';
    if (low.includes('hgcloud') || low.includes('hglink') || low.includes('streamhg')) return 'hgcloud';
    return low;
};

const toEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const u = url.toLowerCase();
        if (u.includes('dood') || u.includes('dsvplay') || u.includes('dooood'))
            return url.replace(/\/(d|f|e|file)\//, '/e/');
        if (u.includes('streamruby.com'))  return url.replace(/\/(d|f)\//, '/e/');
        if (u.includes('mixdrop.'))        return url.replace('/f/', '/e/');
        if (u.includes('hgcloud') || u.includes('hglink') || u.includes('streamhg')) {
            const parts = url.split('/');
            const code  = parts[parts.length - 1];
            if (code && !url.includes('/e/')) return url.replace(code, 'e/' + code);
            return url;
        }
        if (u.includes('uqload.')) {
            const id = url.split('/').pop()?.replace('.html','').replace('embed-','');
            return `https://uqload.to/embed-${id}.html`;
        }
        if (u.includes('streamtape.')) return url.replace('/v/', '/e/');
        if (u.includes('filemoon.'))   return url.replace('/d/', '/e/');
        if (u.includes('voe.'))        return url.replace(/\/(d|f)\//, '/e/').replace(/voe\.sx\//, 'voe.sx/e/');
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

const resolveIntermediate = async (page, url) => {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(1500);
        return await page.evaluate(() => {
            const iet = document.getElementById('iet');
            if (iet?.value) {
                const m = iet.value.match(/SRC="([^"]+)"/i);
                if (m) return { embedUrl: m[1] };
            }
            for (const ta of document.querySelectorAll('textarea')) {
                if (ta.value?.trim().startsWith('http') && !ta.value.includes('['))
                    return { downloadUrl: ta.value.trim() };
            }
            return null;
        });
    } catch { return null; }
};

const scrapeEpisode = async (browser, episodeUrl) => {
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image','font','media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await sleep(2000);

        const watchNow = await page.$('.watchNow');
        if (watchNow) { await watchNow.click(); await sleep(5000); }

        const title = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim().substring(0, 100) : '';
        });

        const collectLinks = async (targetPage) => {
            const links = await targetPage.evaluate(() => {
                const results = [];
                document.querySelectorAll('.ser-link').forEach(a => {
                    results.push({ text: a.parentElement.textContent.trim(), href: a.href });
                });
                Array.from(document.querySelectorAll('a'))
                    .filter(a => a.href?.startsWith('http') && !a.href.endsWith('#'))
                    .forEach(a => {
                        results.push({ text: a.textContent.trim().substring(0, 50), href: a.href });
                    });
                return results;
            });
            
            const results = [];
            const seenHref = new Set();
            for (const link of links) {
                if (seenHref.has(link.href)) continue;
                seenHref.add(link.href);
                const label = link.text || link.href;

                if (isVideoHost(link.href)) {
                    const normHost = NORMALIZE_HOST(VIDEO_HOSTS.find(h => link.href.toLowerCase().includes(h)) || 'stream');
                    const embedUrl = toEmbedUrl(link.href) || link.href;
                    if (embedUrl) {
                        results.push({ title: label, downloadUrl: link.href, embedUrl: embedUrl, host: normHost });
                    }
                    continue;
                }
                if (isIntermediate(link.href)) {
                    const rPage = await browser.newPage();
                    try {
                        const resolved = await resolveIntermediate(rPage, link.href);
                        if (resolved && (resolved.embedUrl || toEmbedUrl(resolved.downloadUrl))) {
                            const finalEmbed = resolved.embedUrl || toEmbedUrl(resolved.downloadUrl);
                            results.push({ title: label, downloadUrl: resolved.downloadUrl || link.href, embedUrl: finalEmbed, host: 'hgcloud', via: link.href });
                        }
                    } finally {
                        await rPage.close().catch(() => {});
                    }
                    continue;
                }
                // Ignored download-only links as per user request
            }
            return results;
        };

        let allResults = [];
        const seenUrls = new Set();
        const stage1 = await collectLinks(page);
        stage1.forEach(r => { if (!seenUrls.has(r.downloadUrl)) { allResults.push(r); seenUrls.add(r.downloadUrl); } });

        const qualityClicked = await page.evaluate(() => {
            for (const el of document.querySelectorAll('a, button, span, div')) {
                const t = el.textContent.trim();
                if (t.includes('جميع') && t.includes('جودات')) {
                    const href = el.getAttribute('href');
                    if (href?.startsWith('http')) return 'link:' + href;
                    el.click(); return 'clicked';
                }
            }
            return 'not-found';
        });

        if (qualityClicked !== 'not-found') {
            if (qualityClicked.startsWith('link:')) await page.goto(qualityClicked.slice(5), { waitUntil: 'domcontentloaded', timeout: 20000 });
            await sleep(4000);
            const stage2 = await collectLinks(page);
            stage2.forEach(r => { if (!seenUrls.has(r.downloadUrl)) { allResults.push(r); seenUrls.add(r.downloadUrl); } });
        }
        return { title, url: episodeUrl, links: allResults, error: null };
    } catch (err) { return { title: '', url: episodeUrl, links: [], error: err.message }; } finally { await page.close().catch(() => {}); }
};

(async () => {
    const startUrl = process.argv[2];
    if (!startUrl) { process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' })); process.exit(1); }

    const urlParts = startUrl.split('/');
    const fullSlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
    const decodeSlug = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
    
    let coreFilter = decodeSlug(fullSlug);
    coreFilter = coreFilter.replace(/-?الموسم.*/, '');
    coreFilter = coreFilter.replace(/-?الحلقة.*/, '');
    coreFilter = coreFilter.replace(/-?حلق[هة].*/, '');
    coreFilter = coreFilter.replace(/-s\d+e\d+.*/i, '');
    coreFilter = coreFilter.replace(/-e\d+.*/i, '');
    coreFilter = coreFilter.replace(/-episode.*/i, '');
    coreFilter = coreFilter.replace(/^انمي-/i, '');
    coreFilter = coreFilter.replace(/-?\d+$/, ''); // Remove trailing year
    
    // For very long slugs, take the first 2-3 words to be flexible
    const words = coreFilter.split('-').filter(w => w.length > 2);
    const filterKeywords = words.slice(0, 3).map(w => w.toLowerCase());
    
    if (filterKeywords.length === 0) filterKeywords.push(fullSlug.split('-')[0].toLowerCase());

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'] });
        const discoveryPage = await browser.newPage();
        await discoveryPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2500);

        // --- ENHANCEMENT: IF IT'S AN EPISODE PAGE, NAVIGATE TO THE PARENT SERIES PAGE FIRST ---
        if (startUrl.includes('/episode/')) {
            const seriesLink = await discoveryPage.evaluate(() => {
                const links = Array.from(document.querySelectorAll('.BottomPost a, .Breadcrumb a, .all-eps a, ul.terms li a, a.seEps, a[href*="/season/"], a[href*="/series/"], a.anime-link, .SeasonLnk a'));
                for (const a of links) {
                    const href = a.href;
                    const text = a.textContent.toLowerCase();
                    if ((href.includes('/season/') && href.split('/season/')[1].length > 1) || 
                        (href.includes('/series/') && href.split('/series/')[1].length > 1) || 
                        (href.includes('/anime-') && !href.includes('/episode/')) || 
                        text.includes('الموسم') || text.includes('season')) {
                        return href;
                    }
                }
                return null;
            });

            if (seriesLink) {
                console.error(`[Navigation] Navigating from episode to series/season: ${seriesLink}`);
                await discoveryPage.goto(seriesLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await sleep(2500);
            }
        }
        
        let activeUrl = await discoveryPage.url();

        // 1. Force Click the 'Watch Now' only if episodes are not already visible
        const episodesAlreadyVisible = await discoveryPage.evaluate(() => document.querySelectorAll('a[href*="/episode/"]').length > 3);
        
        if (!episodesAlreadyVisible) {
            const watchNow = await discoveryPage.$('.watchNow');
            if (watchNow) { 
                console.error('[Navigation] Clicking .watchNow to reveal list...');
                await watchNow.click(); 
                await sleep(6000); 
            }
        }

        const episodeUrls = await discoveryPage.evaluate((keywords, currentUrl) => {
            const seen = new Set();
            const links = [];
            
            const decodeUTF8 = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

            // 1. Identify ALL grids or lists on the page
            const allLinks = Array.from(document.querySelectorAll('a[href*="/episode/"]'));
            
            // 2. Priority 1: Links inside an episode container
            allLinks.forEach(a => {
                const href = a.href.split('?')[0];
                if (!href || seen.has(href)) return;

                let isInGrid = false;
                let parent = a.parentElement;
                let foundHeader = false;
                for (let i = 0; i < 15; i++) {
                    if (!parent) break;
                    const pt = parent.textContent.toLowerCase();
                    if (pt.includes('حلقات الموسم') || pt.includes('قائمة الحلقات') || pt.includes('قائمه الحلقات') || pt.includes('جميع الحلقات') || pt.includes('season episodes')) { 
                        foundHeader = true; break; 
                    }
                    parent = parent.parentElement;
                }

                if (foundHeader || a.closest('.all-episodes-list') || a.closest('.SeasonEps')) {
                    isInGrid = true;
                }

                if (isInGrid) {
                    const text = a.textContent.trim();
                    const hDec = decodeUTF8(href);
                    seen.add(href);
                    
                    const tNum = text.match(/\d+/);
                    let num = 0;
                    if (tNum) {
                        num = parseInt(tNum[0]);
                    } else {
                        const hNum = hDec.match(/e(\d+)/i) || hDec.match(/(\d+)\/?$/);
                        if (hNum) num = parseInt(hNum[1] || hNum[0]);
                    }
                    links.push({ href, num, text: text || ('الحلقة ' + num) });
                }
            });

            // 3. Priority 2: Links that match any of the keywords
            allLinks.forEach(a => {
                const href = a.href.split('?')[0];
                if (!href || seen.has(href)) return;

                const text = a.textContent.trim().toLowerCase();
                const hDec = decodeUTF8(href).toLowerCase();
                
                const matchesKeyword = keywords.some(k => hDec.includes(k));
                const isEpisodeLabel = text.match(/حلق[هة]\s*\d+/) || text.match(/episode\s*\d+/i) || text.match(/^\s*\d+\s*$/);

                if (matchesKeyword && isEpisodeLabel) {
                    seen.add(href);
                    const tNum = text.match(/\d+/);
                    let num = 0;
                    if (tNum) {
                        num = parseInt(tNum[0]);
                    } else {
                        const hNum = hDec.match(/e(\d+)/i) || hDec.match(/(\d+)\/?$/);
                        if (hNum) num = parseInt(hNum[1] || hNum[0]);
                    }
                    links.push({ href, num, text: a.textContent.trim() || ('الحلقة ' + num) });
                }
            });

            // 4. Ensure current page is included if it's an episode
            if (currentUrl.includes('/episode/') && !seen.has(currentUrl.split('?')[0])) {
                const uDec = decodeUTF8(currentUrl);
                const nMatch = uDec.match(/episode\s*(\d+)/i) || uDec.match(/حلق[هة]\s*(\d+)/) || uDec.match(/(\d+)\/?$/);
                const n = nMatch ? parseInt(nMatch[1]) : 1;
                links.push({ href: currentUrl.split('?')[0], num: n, text: 'الحلقة ' + n });
            }

            links.sort((a, b) => a.num - b.num);
            return links;
        }, filterKeywords, activeUrl);
        await discoveryPage.close();

        const allEpisodes = episodeUrls.length > 0 ? episodeUrls : [{ href: startUrl, text: 'الحلقة 1', num: 1 }];
        const CONCURRENCY = 3; // Reduced to 3 for stability guarantee
        const episodes = [];
        
        // Helper for chunks
        const chunks = [];
        for (let i = 0; i < allEpisodes.length; i += CONCURRENCY) {
            chunks.push(allEpisodes.slice(i, i + CONCURRENCY));
        }



        for (const chunk of chunks) {
            const results = await Promise.all(chunk.map(async (ep) => {
                try {
                    let attempts = 0;
                    let result = { error: 'Unknown' };
                    while (attempts < 2) {
                        result = await scrapeEpisode(browser, ep.href);
                        if (!result.error) break;
                        attempts++;
                        await sleep(1500);
                    }
                    return { 
                        episodeNum: ep.num, 
                        label: ep.text || ('الحلقة ' + ep.num), 
                        url: ep.href, 
                        title: result.title || ep.text, 
                        links: result.links || [], 
                        error: result.error 
                    };
                } catch (err) {
                    return { episodeNum: ep.num, url: ep.href, label: ep.text, error: err.message, links: [] };
                }
            }));
            episodes.push(...results);
            await sleep(500); // Breathe between chunks
        }
        
        await browser.close();
        process.stdout.write(JSON.stringify({ success: true, totalEpisodes: episodes.length, episodes }));
    } catch (error) { if (browser) await browser.close().catch(() => {}); process.stdout.write(JSON.stringify({ success: false, error: error.message })); process.exit(1); }
})();
