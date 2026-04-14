const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const seedUrl = process.argv[2];
const seriesName = process.argv[3] || "";
const targetEpisode = process.argv[4] || null; // Optional: Only fetch this episode

if (!seedUrl) {
    console.error(JSON.stringify({ error: "No URL provided" }));
    process.exit(1);
}

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setViewport({ width: 1280, height: 800 });

        // 1. Visit the initial page
        await page.goto(seedUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 4000));

        // 1.1 Auto-Scroll to trigger lazy loading (for long lists and sidebars)
        await page.evaluate(async () => {
            // Function to scroll a container
            const scrollEl = async (el, dist = 300, max = 15000) => {
                if (!el) return;
                await new Promise((resolve) => {
                    let cur = 0;
                    let timer = setInterval(() => {
                        el.scrollBy(0, dist);
                        cur += dist;
                        if (cur >= el.scrollHeight || cur > max) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 50);
                });
            };

            // 1. Scroll main window
            await scrollEl(window, 500);
            
            // 2. Scroll specific WitAnime sidebars if they exist
            const sidebar = document.querySelector('.episodes-list, .mCSB_container, [class*="scrollbar"]');
            if (sidebar) {
                // If it's a mCustomScrollbar, it might need to scroll the parent or the container
                await scrollEl(sidebar, 200);
                // Try scrolling the parent as well
                if (sidebar.parentElement) await scrollEl(sidebar.parentElement, 200);
            }
        });
        await new Promise(r => setTimeout(r, 2000)); // wait for final items

        // 2. Discover episodes (WitAnime onclick focus)
        const episodes = await page.evaluate(() => {
            const results = [];
            const seen = new Set();
            // Look for any link with openEpisode or belonging to episodes-list/sidebar
            const raw = Array.from(document.querySelectorAll('a[onclick*="openEpisode"], .episodes-list a, .episode-item a, .mCSB_container a'));
            
            for (const el of raw) {
                const onclick = el.getAttribute('onclick');
                const href = el.href;
                
                // Prioritize 'onclick' for WitAnime as it's more specific
                const key = onclick || href;
                if (!key || seen.has(key)) continue;

                // Skip javascript voids unless they have an onclick
                if (href?.includes('javascript:void(0)') && !onclick) continue;

                const text = (el.innerText || "").trim();
                // Filter: must have text and some action
                if (text && (onclick || (href && !href.includes('javascript')))) {
                    seen.add(key);
                    results.push({ text, onclick, href: href && !href.includes('javascript') ? href : null });
                }
            }
            return results;
        });

        process.stderr.write(`Discovered: ${episodes.length} potential episodes\n`);

        let targets = episodes.length > 0 ? episodes : [{ text: "Initial Page", href: seedUrl }];
        
        // Filter if targetEpisode provided
        if (targetEpisode) {
            const matched = targets.filter(t => t.text.includes(targetEpisode) || targetEpisode.includes(t.text));
            if (matched.length > 0) targets = matched;
            process.stderr.write(`Single Target Mode: ${targets[0].text}\n`);
        }

        const finalLinks = [];

        for (const ep of targets) {
            try {
                process.stderr.write(`Processing: ${ep.text}\n`);
                
                if (ep.onclick) {
                    await page.evaluate((script) => { try { eval(script); } catch (e) {} }, ep.onclick);
                    await new Promise(r => setTimeout(r, 4000));
                } else if (ep.href && ep.href !== page.url()) {
                    await page.goto(ep.href, { waitUntil: 'networkidle2' });
                }

                // 3. Click "streamwish" or best available server
                const serverClicked = await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('a.server-link, .server-item a, #option-1, [data-server*="streamwish"]'));
                    let target = null;
                    for (const btn of btns) {
                        const txt = (btn.innerText || "").toLowerCase();
                        if (txt.includes('streamwish') || txt.includes('wish')) {
                            target = btn;
                            break;
                        }
                    }
                    if (!target && btns.length > 0) target = btns[0];
                    if (target) {
                        target.click();
                        return true;
                    }
                    return false;
                });

                if (serverClicked) {
                    // 4. Poll for hglink.to instead of fixed timeout
                    let link = null;
                    const maxRetries = 15; // 15 seconds max
                    for (let i = 0; i < maxRetries; i++) {
                        // Click play periodically to trigger injection if needed
                        if (i % 5 === 0) {
                            await page.evaluate(() => {
                                const playBtn = document.querySelector('.jw-icon-display, .jw-display-icon-container, [aria-label="Play"], .play-button, .play-icon, #player_vid_play');
                                if (playBtn) playBtn.click();
                            });
                        }

                        link = await page.evaluate(() => {
                            function findHgLink(doc) {
                                // 1. Scan iframes recursively
                                const iframes = Array.from(doc.querySelectorAll('iframe'));
                                for (const f of iframes) {
                                    try {
                                        const src = f.src || f.getAttribute('data-src');
                                        if (src && /https:\/\/hg[a-z0-9]*\.to/.test(src)) return src;
                                        // Try searching inside iframe content if accessible
                                        if (f.contentDocument) {
                                            const res = findHgLink(f.contentDocument);
                                            if (res) return res;
                                        }
                                    } catch (e) {}
                                }
                                // 2. Scan HTML
                                const html = doc.documentElement.innerHTML;
                                const match = html.match(/https:\/\/hg[a-z0-9]*\.to\/e\/[a-zA-Z0-9]+/);
                                if (match) return match[0];
                                return null;
                            }
                            return findHgLink(document);
                        });

                        if (link) break;
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    if (link) {
                        finalLinks.push({ episode: ep.text, link: link });
                        process.stderr.write(`Success: Found ${link}\n`);
                    } else {
                        process.stderr.write(`Warning: Failed to find hglink for ${ep.text} after 15s\n`);
                    }
                }
            } catch (err) {
                process.stderr.write(`Error on ${ep.text}: ${err.message}\n`);
            }
        }

        if (finalLinks.length > 0) {
            console.log(JSON.stringify({ success: true, links: finalLinks }));
        } else {
            console.error(JSON.stringify({ error: "Failed to collect any hglink.to URLs. Please ensure the 'streamwish' server is available." }));
        }

    } catch (e) {
        console.error(JSON.stringify({ error: e.message }));
    } finally {
        if (browser) await browser.close();
    }
})();
