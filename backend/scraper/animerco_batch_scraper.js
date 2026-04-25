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

        // Click BIG Play button if it exists to initialize player
        await page.evaluate(async () => {
            const playBtn = document.querySelector('#click-player') || document.querySelector('.play-video');
            if (playBtn) playBtn.click();
        });
        await sleep(2000);

        const results = [];
        
        // Get number of options
        const optionCount = await page.evaluate(() => document.querySelectorAll('ul.server-list li a.option').length);
        
        if (optionCount > 0) {
            for (let i = 0; i < optionCount; i++) {
                try {
                    const serverData = await page.evaluate(async (index) => {
                        const options = document.querySelectorAll('ul.server-list li a.option');
                        if (!options[index]) return null;
                        
                        const option = options[index];
                        const label = option.querySelector('.server')?.textContent.trim() || `Server ${index + 1}`;
                        
                        option.click();
                        
                        // Wait for iframe src change logic
                        let iframeSrc = '';
                        const start = Date.now();
                        while (Date.now() - start < 4500) { // Reduced from 8000
                            await new Promise(r => setTimeout(r, 600));
                            const iframe = document.querySelector('#player iframe');
                            if (iframe && iframe.src && !iframe.src.includes('about:blank')) {
                                // Skip ad networks
                                if (!iframe.src.includes('acceptable.a-ads.com') && 
                                    !iframe.src.includes('google.com/adsense')) {
                                    
                                    iframeSrc = iframe.src;
                                    
                                    // EXTRACT REAL IFRAME URL TO BYPASS "LINK EXPIRED" (Animerco tokens)
                                    try {
                                        if (iframe.contentDocument) {
                                            const innerIframe = iframe.contentDocument.querySelector('iframe');
                                            if (innerIframe && innerIframe.src) {
                                                iframeSrc = innerIframe.src;
                                            } else {
                                                const scripts = Array.from(iframe.contentDocument.scripts).map(s => s.innerHTML).join(' ');
                                                const match = scripts.match(/file["']?\s*:\s*["']([^"']+)["']/);
                                                if (match) {
                                                    iframeSrc = match[1];
                                                }
                                            }
                                        }
                                    } catch(e) {} // Cross-origin may error, but for Animerco it's same-origin
                                    
                                    break; // Exit loop early if found
                                }
                            }
                        }
                        return { label, embedUrl: iframeSrc };
                    }, i);

                    if (serverData && serverData.embedUrl && !results.some(r => r.embedUrl === serverData.embedUrl)) {
                        results.push(serverData);
                    }
                } catch (e) {
                    console.error(`Error on option ${i}:`, e.message);
                }
            }
        }

        const processedLinks = results.reduce((acc, s) => {
            const labelLower = s.label.toLowerCase();
            let host = '';
            
            if (labelLower.includes('videa')) host = 'videas';
            else if (labelLower.includes('mega')) host = 'megamax';
            else if (labelLower.includes('ok')) host = 'ok';
            else if (labelLower.includes('vk')) host = 'vkvideo';
            else if (labelLower.includes('michi')) host = 'Michi';
            else if (labelLower.includes('daily')) host = 'dailymotion';
            else if (labelLower.includes('yourupload')) host = 'yourupload';
            
            // Only add if it's one of the explicitly allowed embed servers
            if (host !== '') {
                acc.push({
                    title: s.label, // Original name from UI
                    embedUrl: s.embedUrl,
                    host: host
                });
            }
            return acc;
        }, []);

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
        
        console.error(`[Animerco] Navigating to discovery page: ${startUrl}`);
        await discoveryPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(4000);

        // 1. Discover all episode links (STRICT)
        console.error(`[Animerco] Extracting episode links...`);
        const episodeUrls = await discoveryPage.evaluate(() => {
            const results = [];
            const seen = new Set();
            const origin = window.location.origin;

            const containers = [
                document.querySelector('ul.episodes-list'),
                document.querySelector('.nested-menu ul'),
                document.querySelector('#filter'),
                document.querySelector('.series-list'),
                document.querySelector('.post-list'),
                document.querySelector('#archive-content'),
                document.querySelector('.bixbox')
            ].filter(Boolean);

            const allLinks = containers.length > 0 
                ? Array.from(document.querySelectorAll(containers.map(c => c.tagName + (c.className ? '.' + c.className.split(' ').join('.') : '') + ' a, ' + (c.id ? '#' + c.id + ' a' : '')).join(', '))) // getting complicated, let's just use document.querySelectorAll('a') but filtered
                : [];
                
            // Safe fallback: Just scan all links on the page if specific containers fail
            const linksToScan = containers.length > 0 ? 
                containers.flatMap(c => Array.from(c.querySelectorAll('a'))) : 
                Array.from(document.querySelectorAll('a'));

            linksToScan.forEach(a => {
                let href = a.href;
                if (!href) return;
                
                const plainUrl = href.split('?')[0].split('#')[0];
                if (plainUrl.startsWith(origin) && 
                    plainUrl.includes('/episodes/') && 
                    !seen.has(plainUrl)) {
                    
                    const text = a.textContent.trim() || a.getAttribute('title') || '';
                    if (/\d+/.test(text) || text.includes('الحلقة') || plainUrl.match(/-\d+\/?$/)) {
                        seen.add(plainUrl);
                        let num = 0;
                        const match = text.match(/(\d+)/);
                        if (match) {
                            num = parseInt(match[1]);
                        } else {
                            const slugMatch = plainUrl.match(/-(\d+)\/?$/);
                            if (slugMatch) num = parseInt(slugMatch[1]);
                        }
                        results.push({ href: plainUrl, num: num, text: text || `الحلقة ${num}` });
                    }
                }
            });

            return results.sort((a,b) => a.num - b.num);
        });

        const { animeTitle, animePoster } = await discoveryPage.evaluate(() => {
            const h1 = document.querySelector('h1.entry-title') || document.querySelector('h1');
            const title = h1 ? h1.textContent.split('الحلقة')[0].trim() : 'Animerco Series';
            const img = document.querySelector('.anime-thumbnail img') || 
                        document.querySelector('.anime-post-thumbnail img') || 
                        document.querySelector('.poster img');
            let poster = img ? (img.getAttribute('data-src') || img.src) : '';
            return { animeTitle: title, animePoster: poster };
        });

        await discoveryPage.close();

        // New Logic: If the user provided a specific episode URL, ONLY scrape that episode
        // This prevents "hanging" when a single episode page contains a large episode list.
        if (startUrl.includes('/episodes/')) {
            console.error(`[Animerco] Specific episode URL detected. Scraping only: ${startUrl}`);
            const result = await scrapeEpisode(browser, startUrl);
            process.stdout.write(JSON.stringify({
                success: true,
                title: animeTitle,
                poster: animePoster,
                totalEpisodes: 1,
                episodes: [{ 
                    episodeNum: 1, 
                    label: result.title || 'الحلقة 1', 
                    url: startUrl, 
                    title: result.title, 
                    links: result.links 
                }]
            }));
            return;
        }

        console.error(`[Animerco] Found ${episodeUrls.length} episodes.`);

        // If no episodes found in list, and we are on an episode page, take only this one
        if (episodeUrls.length === 0 && startUrl.includes('/episodes/')) {
            console.error(`[Animerco] No list found, scraping current episode directly.`);
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
            console.error(`[Animerco] Total episodes discovered: ${episodeUrls.length}`);
            // Deep Scrape: process concurrently to ensure blazing speed
            const episodes = [];
            const CONCURRENCY_LIMIT = 5; // Process 5 episodes at the same time

            for (let i = 0; i < episodeUrls.length; i += CONCURRENCY_LIMIT) {
                const chunk = episodeUrls.slice(i, i + CONCURRENCY_LIMIT);
                console.error(`[Animerco] Scraping chunk ${Math.floor(i/CONCURRENCY_LIMIT) + 1} (${chunk.length} items)...`);
                
                const chunkResults = await Promise.all(chunk.map(async (ep) => {
                    const result = await scrapeEpisode(browser, ep.href);
                    return {
                        episodeNum: ep.num,
                        label: ep.text || `الحلقة ${ep.num}`,
                        url: ep.href,
                        title: result.title || ep.text,
                        links: result.links
                    };
                }));
                
                episodes.push(...chunkResults);
            }
            
            // Sort to maintain correct order after concurrent fetches
            episodes.sort((a, b) => a.episodeNum - b.episodeNum);

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
        console.error(`[Animerco Error] ${error.message}`);
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
})();
