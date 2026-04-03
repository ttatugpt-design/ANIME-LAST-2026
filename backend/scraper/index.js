const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const seedUrl = process.argv[2];
const seriesName = process.argv[3] || "";

if (!seedUrl) {
    console.error(JSON.stringify({ error: "No URL provided" }));
    process.exit(1);
}

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.setViewport({ width: 1280, height: 800 });

        // 1. Visit the initial page
        await page.goto(seedUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));

        // 2. Discover episodes (WitAnime onclick focus)
        const episodes = await page.evaluate(() => {
            const results = [];
            const seen = new Set();
            const witBtns = Array.from(document.querySelectorAll('a[onclick*="openEpisode"]'));
            for (const btn of witBtns) {
                const text = (btn.innerText || "").trim();
                const onclick = btn.getAttribute('onclick');
                if (text && onclick && !seen.has(onclick)) {
                    seen.add(onclick);
                    results.push({ text, onclick });
                }
            }
            if (results.length === 0) {
                const links = Array.from(document.querySelectorAll('.episode-item, .episodes-list a'));
                for (const a of links) {
                    if (a.href && !seen.has(a.href)) {
                        seen.add(a.href);
                        results.push({ text: a.innerText.trim(), href: a.href });
                    }
                }
            }
            return results;
        });

        const targets = episodes.length > 0 ? episodes : [{ text: "Episode 1", href: seedUrl }];
        const finalLinks = [];

        for (const ep of targets) {
            try {
                process.stderr.write(`Processing: ${ep.text}\n`);
                
                if (ep.onclick) {
                    await page.evaluate((script) => { try { eval(script); } catch (e) {} }, ep.onclick);
                    await new Promise(r => setTimeout(r, 6000));
                } else if (ep.href && ep.href !== page.url()) {
                    await page.goto(ep.href, { waitUntil: 'networkidle2' });
                }

                // 3. Click "streamwish" specifically
                const serverClicked = await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('a.server-link, .server-item a, #option-1'));
                    for (const btn of btns) {
                        const txt = (btn.innerText || "").toLowerCase();
                        if (txt.includes('streamwish')) {
                            btn.click();
                            return true;
                        }
                    }
                    if (btns.length > 0) { btns[0].click(); return true; }
                    return false;
                });

                if (serverClicked) {
                    // 4. Wait for iframe injection
                    await new Promise(r => setTimeout(r, 5000));
                    
                    // 5. CLICK PLAY (Common for hglink to activate)
                    await page.evaluate(() => {
                        const cyanBtn = document.querySelector('.jw-icon-display, .jw-display-icon-container, [aria-label="Play"], .play-button, .play-icon');
                        if (cyanBtn) cyanBtn.click();
                    });
                    
                    await new Promise(r => setTimeout(r, 3000));

                    // 6. Extract hglink.to specifically
                    const link = await page.evaluate(() => {
                        // Scan iframes first
                        const iframes = Array.from(document.querySelectorAll('iframe'));
                        for (const f of iframes) {
                            const src = f.src || f.getAttribute('data-src');
                            if (src && src.includes('hglink.to')) return src;
                        }
                        
                        // Scan HTML as fallback
                        const html = document.documentElement.innerHTML;
                        const match = html.match(/https:\/\/hglink\.to\/e\/[a-zA-Z0-9]+/);
                        if (match) return match[0];
                        
                        // Deep check for any iframe
                        if (iframes.length > 0 && iframes[0].src && iframes[0].src.startsWith('http')) return iframes[0].src;

                        return null;
                    });

                    if (link) {
                        finalLinks.push({ episode: ep.text, link: link });
                        process.stderr.write(`Success: Found ${link}\n`);
                    } else {
                        process.stderr.write(`Warning: Failed to find hglink for ${ep.text}\n`);
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
