const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scrapeAnimercoBase = async (browser, url) => {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 900 });

    try {
        console.error(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(2000);

        const data = await page.evaluate(() => {
            const getText = (el) => el ? (el.textContent || el.innerText || '').trim() : '';
            
            const bannerEl = document.querySelector('.head-box .banner') || document.querySelector('.banner');
            let mainBanner = '';
            if (bannerEl) {
                mainBanner = bannerEl.getAttribute('data-src') || bannerEl.getAttribute('src');
                if (!mainBanner || mainBanner.startsWith('data:')) {
                    const style = window.getComputedStyle(bannerEl);
                    const bgUrlMatch = style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                    if (bgUrlMatch) mainBanner = bgUrlMatch[1];
                }
            }

            const title = getText(document.querySelector('.media-title h1') || document.querySelector('h1'));

            const seasons = [];
            const seenSeasons = new Set();
            
            const seasonItems = document.querySelectorAll('.media-seasons .episodes-lists li, .episodes-lists li');
            seasonItems.forEach(li => {
                const link = li.querySelector('a.title') || li.querySelector('a');
                if (link && link.href.includes('/seasons/')) {
                    const href = link.href;
                    if (href && !seenSeasons.has(href)) {
                        seenSeasons.add(href);
                        
                        const posterEl = li.querySelector('.poster') || li.querySelector('.image');
                        let seasonPoster = posterEl ? (posterEl.getAttribute('data-src') || posterEl.getAttribute('src')) : '';
                        
                        if (!seasonPoster || seasonPoster.startsWith('data:')) {
                            const style = window.getComputedStyle(posterEl || li);
                            const bgUrlMatch = style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                            if (bgUrlMatch) seasonPoster = bgUrlMatch[1];
                        }

                        const seasonTitle = li.querySelector('h3') ? getText(li.querySelector('h3')) : getText(link);

                        seasons.push({
                            title: seasonTitle,
                            url: href,
                            poster: seasonPoster
                        });
                    }
                }
            });

            return { title, mainBanner, seasons };
        });

        return { success: true, ...data };
    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        await page.close();
    }
};

const scrapeAnimercoSeason = async (browser, url, withServers = false) => {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1440, height: 1500 });

    try {
        console.error(`Navigating to season: ${url}... (Servers: ${withServers})`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(3000);

        const data = await page.evaluate(() => {
            const getText = (el) => el ? (el.textContent || el.innerText || '').trim() : '';
            const getInfo = (label) => {
                for (const item of Array.from(document.querySelectorAll('.media-info li, .anime-info li'))) {
                    if (item.textContent.includes(label)) {
                        const span = item.querySelector('span');
                        return span ? getText(span) : item.textContent.replace(label, '').trim();
                    }
                }
                return '';
            };

            const title = getText(document.querySelector('.media-title h1') || document.querySelector('h1'));
            
            const dvdPosterEl = document.querySelector('.widget-sidebar .image') || document.querySelector('.anime-poster img');
            let dvdPoster = dvdPosterEl ? (dvdPosterEl.getAttribute('data-src') || dvdPosterEl.getAttribute('src')) : '';
            if (!dvdPoster || dvdPoster.startsWith('data:')) {
                const style = window.getComputedStyle(dvdPosterEl || document.body);
                const bgUrlMatch = style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                if (bgUrlMatch) dvdPoster = bgUrlMatch[1];
            }

            const story = getText(document.querySelector('.media-story .content') || document.querySelector('.anime-story'));
            const genres = Array.from(document.querySelectorAll('.media-story .genres a')).map(a => getText(a));

            const episodesCount = getInfo('الحلقات:') || getInfo('عدد الحلقات:');
            const status = getInfo('الحالة:') || getInfo('حالة الأنمي:');
            const season = getInfo('الموسم:');
            const type = getInfo('النوع:');

            const epItems = Array.from(document.querySelectorAll('.media-episodes .episodes-lists li, ul#filter li'));
            const episodesLinks = epItems.map(li => {
                const link = li.querySelector('a.title') || li.querySelector('a[href*="/episodes/"]');
                const imgEl = li.querySelector('.image');
                let thumbnail = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : '';
                if (!thumbnail || thumbnail.startsWith('data:')) {
                    const style = window.getComputedStyle(imgEl || li);
                    const bgUrlMatch = style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
                    if (bgUrlMatch) thumbnail = bgUrlMatch[1];
                }
                return link ? { url: link.href, title: getText(link), thumbnail } : null;
            }).filter(Boolean);

            return { 
                title, dvdPoster, story, genres, episodesCount, status, season, type, 
                episodesLinks
            };
        });

        if (!withServers) {
            const episodes = data.episodesLinks.map((epInfo, idx) => {
                const epNumMatch = epInfo.title.match(/(\d+)/) || epInfo.url.match(/-(\d+)\/?$/);
                const epNum = epNumMatch ? parseInt(epNumMatch[1]) : (idx + 1);
                return {
                    number: epNum,
                    title: epInfo.title || `الحلقة ${epNum}`,
                    url: epInfo.url,
                    thumbnail: epInfo.thumbnail,
                    servers: []
                };
            });
            return { success: true, ...data, episodes: episodes.sort((a,b) => a.number - b.number) };
        }

        const fullEpisodes = [];
        for (const epInfo of data.episodesLinks) {
            try {
                const epPage = await browser.newPage();
                await epPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
                await epPage.goto(epInfo.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await sleep(2000);

                const internalServers = await epPage.evaluate(async () => {
                    const s = (ms) => new Promise(r => setTimeout(r, ms));
                    const serverLinks = Array.from(document.querySelectorAll('.server-list li a'));
                    const results = [];
                    for (const a of serverLinks) {
                        a.click();
                        await s(1500); // Wait for iframe source to update
                        const ifr = document.querySelector('#player iframe');
                        if (ifr && ifr.src && !ifr.src.includes('about:blank')) {
                            results.push({ name: a.querySelector('.server').textContent.trim(), url: ifr.src });
                        }
                    }
                    return results;
                });

                // Deep resolution of internal links
                const resolvedServers = [];
                for (const srv of internalServers) {
                    if (srv.url.includes('animerco.org/jwplayer')) {
                        try {
                            const resPage = await browser.newPage();
                            await resPage.goto(srv.url, { waitUntil: 'networkidle2', timeout: 15000 });
                            const finalUrl = await resPage.evaluate(() => {
                                const ifr = document.querySelector('iframe');
                                if (ifr && ifr.src) return ifr.src;
                                const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).join('\n');
                                const fileMatch = scripts.match(/file:[\"']([^\"']+)[\"']/);
                                return fileMatch ? fileMatch[1] : null;
                            });
                            if (finalUrl) resolvedServers.push({ name: srv.name, url: finalUrl });
                            else resolvedServers.push(srv); // Fallback
                            await resPage.close();
                        } catch (e) {
                            resolvedServers.push(srv);
                        }
                    } else {
                        resolvedServers.push(srv);
                    }
                }

                const epNumMatch = epInfo.title.match(/(\d+)/) || epInfo.url.match(/-(\d+)\/?$/);
                const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 0;

                fullEpisodes.push({
                    number: epNum,
                    title: epInfo.title,
                    url: epInfo.url,
                    thumbnail: epInfo.thumbnail,
                    servers: resolvedServers
                });

                await epPage.close();
            } catch (epErr) {
                fullEpisodes.push({ number: 0, title: epInfo.title, url: epInfo.url, thumbnail: epInfo.thumbnail, servers: [] });
            }
        }

        return { 
            success: true, 
            ...data, 
            episodes: fullEpisodes.sort((a,b) => a.number - b.number) 
        };
    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        await page.close();
    }
};

(async () => {
    const mode = process.argv[2]; 
    const url = process.argv[3];
    const withServers = process.argv[4] === 'true';

    if (!url) {
        process.stdout.write(JSON.stringify({ success: false, error: 'No URL provided' }));
        process.exit(1);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        let result;
        if (mode === 'base') {
            result = await scrapeAnimercoBase(browser, url);
        } else if (mode === 'season') {
            result = await scrapeAnimercoSeason(browser, url, withServers);
        } else {
            result = { success: false, error: 'Invalid mode' };
        }

        process.stdout.write(JSON.stringify(result));

    } catch (err) {
        process.stdout.write(JSON.stringify({ success: false, error: err.message }));
    } finally {
        if (browser) await browser.close();
    }
})();
