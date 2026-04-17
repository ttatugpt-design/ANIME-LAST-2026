const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scrapeEpisode = async (browser, baseUrl) => {
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(3000);
        
        const episodeTitle = await page.evaluate(() => {
            const h1 = document.querySelector('h1.entry-title') || document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
        });

        const servers = await page.evaluate(async () => {
            const results = [];
            const serverOptions = document.querySelectorAll('ul.server-list li a.option');
            
            for (const option of serverOptions) {
                const label = option.querySelector('.server')?.textContent.trim() || 'Server';
                
                try {
                    option.click();
                    
                    // Specific logic for Animerco: Wait for iframe src to be a real URL
                    let iframeSrc = '';
                    const maxAttempts = 15;
                    for (let i = 0; i < maxAttempts; i++) {
                        await new Promise(r => setTimeout(r, 600));
                        const iframe = document.querySelector('#player iframe');
                        
                        if (iframe && iframe.src && 
                            !iframe.src.includes('about:blank') && 
                            iframe.src.startsWith('http')) {
                            
                            // Check if this is NOT an ad iframe
                            if (!iframe.src.includes('acceptable.a-ads.com') && 
                                !iframe.src.includes('google.com/adsense') &&
                                !iframe.src.includes('doubleclick')) {
                                iframeSrc = iframe.src;
                                break; 
                            }
                        }
                    }
                    
                    if (iframeSrc && !results.some(r => r.embedUrl === iframeSrc)) {
                        results.push({ label, embedUrl: iframeSrc });
                    }
                } catch (e) {}
            }

            // Fallback: If no server list, try clicking the big play button
            if (results.length === 0) {
                const playBtn = document.querySelector('#click-player');
                if (playBtn) {
                    playBtn.click();
                    await new Promise(r => setTimeout(r, 2000));
                    const iframe = document.querySelector('#player iframe');
                    if (iframe && iframe.src && iframe.src.startsWith('http')) {
                        results.push({ label: 'Main Server', embedUrl: iframe.src });
                    }
                }
            }

            // Download links
            document.querySelectorAll('#download table tbody tr').forEach(tr => {
                 const link = tr.querySelector('a');
                 const serverName = tr.querySelector('.favicon')?.parentElement?.nextElementSibling?.textContent?.trim() || 'Download';
                 const quality = tr.querySelector('strong.badge')?.textContent?.trim() || '';
                 if (link && link.href && link.href.startsWith('http')) {
                     results.push({ label: `${serverName} ${quality}`.trim(), embedUrl: link.href, isDownload: true });
                 }
            });

            return results;
        });

        const processedLinks = servers.map(s => {
            const labelLower = s.label.toLowerCase();
            let host = 'player';
            if (s.isDownload) host = 'download';
            else if (labelLower.includes('videa')) host = 'videa';
            else if (labelLower.includes('google') || labelLower.includes('gdrive')) host = 'gdrive';
            else if (labelLower.includes('mega')) host = 'mega';
            else if (labelLower.includes('4shared')) host = '4shared';
            else if (labelLower.includes('sibnet')) host = 'sibnet';
            else if (labelLower.includes('mp4upload')) host = 'mp4upload';
            else if (labelLower.includes('ok')) host = 'ok';
            else if (labelLower.includes('vk')) host = 'vk';
            
            return {
                title: s.label,
                embedUrl: s.embedUrl,
                host: host
            };
        });

        return { title: episodeTitle, url: baseUrl, links: processedLinks };
    } catch (err) {
        return { title: '', url: baseUrl, links: [], error: err.message };
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
            headless: "new", 
            args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu', '--disable-blink-features=AutomationControlled']
        });
        
        const discoveryPage = await browser.newPage();
        await discoveryPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await discoveryPage.goto(startUrl, { waitUntil: 'networkidle0', timeout: 90000 });
        await sleep(3000);

        // 1. Discover all episode links (STRICT)
        const episodeUrls = await discoveryPage.evaluate(() => {
            const results = [];
            const seen = new Set();
            const origin = window.location.origin;

            // Target the specific container for episodes
            const containers = [
                document.querySelector('ul.episodes-list'),
                document.querySelector('.nested-menu ul'),
                document.querySelector('#filter')
            ].filter(Boolean);

            if (containers.length > 0) {
                containers.forEach(container => {
                    const links = Array.from(container.querySelectorAll('a'));
                    links.forEach(a => {
                        let href = a.href;
                        if (!href) return;
                        
                        // Strip query params and fragments for accurate deduplication
                        const plainUrl = href.split('?')[0].split('#')[0];
                        
                        // Strict validation
                        if (plainUrl.startsWith(origin) && 
                            plainUrl.includes('/episodes/') && 
                            !plainUrl.includes('?url=') && // skip share links
                            !seen.has(plainUrl)) {
                            
                            const text = a.textContent.trim();
                            // Only add if it looks like an episode link (contains a number or "الحلقة")
                            if (/\d+/.test(text) || text.includes('الحلقة')) {
                                seen.add(plainUrl);
                                
                                // Parse episode number
                                let num = 0;
                                const match = text.match(/(\d+)/);
                                if (match) num = parseInt(match[1]);
                                else {
                                    const slugMatch = plainUrl.match(/(\d+)\/?$/);
                                    if (slugMatch) num = parseInt(slugMatch[1]);
                                }

                                results.push({ href: plainUrl, num: num, text: text });
                            }
                        }
                    });
                });
            }

            return results.sort((a,b) => a.num - b.num);
        });

        const { animeTitle, animePoster } = await discoveryPage.evaluate(() => {
            const h1 = document.querySelector('h1.entry-title') || document.querySelector('h1');
            const title = h1 ? h1.textContent.split('الحلقة')[0].trim() : 'Animerco Series';
            
            const img = document.querySelector('.anime-thumbnail img') || 
                        document.querySelector('.anime-post-thumbnail img') || 
                        document.querySelector('.poster img') || 
                        document.querySelector('meta[property="og:image"]');
            
            let poster = '';
            if (img) {
                if (img.tagName === 'META') poster = img.getAttribute('content');
                else poster = img.getAttribute('data-src') || img.src;
            }
            if (poster && poster.startsWith('//')) poster = 'https:' + poster;
            
            return { animeTitle: title, animePoster: poster };
        });

        await discoveryPage.close();

        // If no episodes found in list, and we are on an episode page, take only this one
        if (episodeUrls.length === 0 && startUrl.includes('/episodes/')) {
            const result = await scrapeEpisode(browser, startUrl);
            process.stdout.write(JSON.stringify({
                success: true,
                title: animeTitle,
                poster: animePoster,
                totalEpisodes: 1,
                episodes: [{ 
                    episodeNum: 1, 
                    label: 'الحلقة 1', 
                    url: startUrl, 
                    title: result.title, 
                    links: result.links 
                }]
            }));
        } else if (episodeUrls.length > 0) {
            const episodes = [];
            for (const ep of episodeUrls) {
                const result = await scrapeEpisode(browser, ep.href);
                episodes.push({
                    episodeNum: ep.num,
                    label: ep.text || `الحلقة ${ep.num}`,
                    url: ep.href,
                    title: result.title || ep.text,
                    links: result.links
                });
                await sleep(500); 
            }
            
            process.stdout.write(JSON.stringify({ 
                success: true, 
                title: animeTitle,
                poster: animePoster,
                totalEpisodes: episodes.length, 
                episodes 
            }));
        } else {
            throw new Error('لم نتمكن من العثور على قائمة الحلقات في هذه الصفحة.');
        }

    } catch (error) {
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
})();
