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

        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(2500);
        
        const episodeTitle = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
        });

        const servers = await page.evaluate(async () => {
            const results = [];
            // Target all potential server buttons
            const selectors = [
                'a.server-link', 
                '.server-item a', 
                'ul.video-servers li a',
                '.servers-list a',
                '#episode-servers a'
            ];
            
            let buttons = [];
            selectors.forEach(sel => {
                const found = document.querySelectorAll(sel);
                if (found.length > 0) buttons = Array.from(found);
            });

            if (buttons.length === 0) {
                // Fallback for generic links that might be servers
                buttons = Array.from(document.querySelectorAll('a')).filter(a => 
                    a.textContent.includes('سيرفر') || a.className.includes('server')
                );
            }
            
            for (const btn of buttons) {
                const label = btn.textContent.trim() || 'Server';
                
                try {
                    // Force click if needed
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    btn.click();
                    
                    // Wait for iframe with more patience
                    let iframeSrc = '';
                    for (let i = 0; i < 20; i++) { // Wait up to 12 seconds
                        await new Promise(r => setTimeout(r, 600));
                        const iframe = document.querySelector('iframe[src*="embed"], iframe[src*="vid"], .video-item iframe, #video-player iframe, .episode-watch-container iframe, iframe[src*="yonaplay"]');
                        if (iframe && iframe.src && !iframe.src.includes('about:blank') && iframe.src.startsWith('http')) {
                            iframeSrc = iframe.src;
                            break;
                        }
                    }
                    
                    if (iframeSrc && !results.some(r => r.embedUrl === iframeSrc)) {
                        results.push({ label, embedUrl: iframeSrc });
                    }
                } catch (e) {}
            }

            // Download links
            document.querySelectorAll('a.download-link, .download-item a, a[href*="/download/"]').forEach(el => {
                 const label = el.textContent.trim() || 'Download';
                 const href = (el.tagName === 'A') ? el.href : '';
                 if (href && href.startsWith('http')) {
                     results.push({ label: label + ' (Download)', embedUrl: href, isDownload: true });
                 }
            });

            return results;
        });

        const processedLinks = servers.map(s => {
            const labelLower = s.label.toLowerCase();
            let finalUrl = s.embedUrl;
            
            // Clean yonaplay URLs if they are known to have issues
            if (labelLower.includes('yonaplay')) {
                // Ensure it's the correct embed format
                if (finalUrl.includes('embed.php')) {
                    // Sometimes adding a specific parameter helps, or using a different domain
                    // But for now, we just ensure it's the full URL
                }
            }

            return {
                title: s.label,
                embedUrl: finalUrl,
                host: s.isDownload ? 'download' : 
                      labelLower.includes('videa') ? 'videa' : 
                      labelLower.includes('google') || labelLower.includes('gdrive') ? 'gdrive' :
                      labelLower.includes('mega') ? 'mega' :
                      labelLower.includes('dood') ? 'dood' :
                      labelLower.includes('yonaplay') ? 'yonaplay' :
                      labelLower.includes('embud') || labelLower.includes('embed') ? 'embed' :
                      s.label.replace(/\s+/g, '').toLowerCase()
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
        
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2500);

        // **Improvement**: If on an episode page, find the link back to the main series for better discovery
        const seriesUrl = await discoveryPage.evaluate(() => {
            if (window.location.href.includes('/episode/')) {
                const animeLink = document.querySelector('a[href*="/anime/"]');
                return animeLink ? animeLink.href : null;
            }
            return null;
        });

        if (seriesUrl) {
            console.error('Redirecting to series page for discovery:', seriesUrl);
            await discoveryPage.goto(seriesUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await sleep(2000);
        }
        
        await discoveryPage.evaluate(async () => {
             for (let i = 0; i < 3; i++) {
                 window.scrollBy(0, 800);
                 await new Promise(r => setTimeout(r, 400));
             }
        });
        await sleep(1500);

        // 1. Discover all episode links
        const episodeUrls = await discoveryPage.evaluate(async () => {
            const list = [];
            const seriesSlug = window.location.pathname.split('/').filter(p => p && p !== 'anime').pop();
            
            // Target all links that look like episodes
            const potentialTargets = Array.from(document.querySelectorAll('a'))
                .filter(a => {
                    const text = a.textContent.trim();
                    return text.includes('الحلقة') || a.href.includes('/episode/') || a.className.includes('ep');
                });
            
            for (const a of potentialTargets) {
                const text = a.textContent.trim();
                // Strategy: look for the number following "الحلقة" or the last number in text
                let epNumStr = '';
                const hlkMatch = text.match(/الحلقة\s*(\d+)/i);
                if (hlkMatch) {
                    epNumStr = hlkMatch[1];
                } else {
                    const allNums = text.match(/\d+/g);
                    if (allNums && allNums.length > 0) {
                        epNumStr = allNums[allNums.length - 1]; // Take the last one
                    }
                }
                
                if (!epNumStr) continue;
                const epNum = parseInt(epNumStr);
                
                let href = a.href;
                if (!href || href.includes('javascript:')) {
                    href = a.getAttribute('data-url') || a.getAttribute('data-href');
                }
                
                if (href && href.startsWith('http')) {
                    list.push({ href: href, num: epNum, text });
                } else if (seriesSlug) {
                    // Fallback: Construct URL from slug
                    const guessedUrl = `${window.location.origin}/episode/${seriesSlug}-الحلقة-${epNum}/`;
                    list.push({ href: guessedUrl, num: epNum, text: `الحلقة ${epNum}` });
                }
            }

            const seen = new Set();
            return list.filter(e => {
                if (seen.has(e.num)) return false;
                seen.add(e.num);
                return true;
            }).sort((a,b) => a.num - b.num);
        });

        console.error(`Found ${episodeUrls.length} episodes for discovery.`);

        const { animeTitle, animePoster } = await discoveryPage.evaluate(() => {
            const titleEl = document.querySelector('.anime-details-title h1') || document.querySelector('h1');
            const title = titleEl ? titleEl.textContent.trim() : 'WitAnime Series';

            const img = document.querySelector('.anime-thumbnail img') || 
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

        if (episodeUrls.length === 0) {
            // Could be an episode page already
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
        } else {
            const episodes = [];
            // Visit each episode page
            for (const ep of episodeUrls) {
                const result = await scrapeEpisode(browser, ep.href);
                episodes.push({
                    episodeNum: ep.num,
                    label: ep.text,
                    url: ep.href,
                    title: result.title || ep.text,
                    links: result.links
                });
                // Small sleep between episodes to be gentle
                await sleep(1000);
            }
            
            process.stdout.write(JSON.stringify({ 
                success: true, 
                title: animeTitle,
                poster: animePoster,
                totalEpisodes: episodes.length, 
                episodes 
            }));
        }

    } catch (error) {
        if (browser) await browser.close().catch(() => {});
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
