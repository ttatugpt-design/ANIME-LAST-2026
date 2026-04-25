const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// We know the player URL format: https://video.vid3rb.com/player/{VIDEO_ID}?token=...
// The player JS file should contain or call an API to get video sources
// Let's:
// 1. Load the player page
// 2. Intercept ALL requests/responses
// 3. Try to click play button to trigger video source loading
// 4. Capture the final MP4 URLs

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Use the player URL we captured from the episode page
    const playerUrl = 'https://video.vid3rb.com/player/9ae8074b-6bd5-43e9-bc57-a9c460cf5b57?token=3f2334af981adf0ed00fcf71737f428a32b7fce797278b6f44044c7252f55f3d&expires=1776974582&cinema=760&last=0&next-image=undefined&next-title=undefined&next-sub-title=undefined';
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', req => {
        const u = req.url();
        if (u.includes('.mp4') || u.includes('/source') || u.includes('/api/') || u.includes('/hls/') || u.includes('.m3u8')) {
            console.log('[REQUEST]', req.resourceType(), u);
        }
        req.continue();
    });

    page.on('response', async resp => {
        const u = resp.url();
        const ct = resp.headers()['content-type'] || '';
        if (u.includes('.mp4') || u.includes('/source') || u.includes('/api/') || ct.includes('json')) {
            console.log('[RESPONSE]', resp.status(), ct, u);
            if (ct.includes('json') || ct.includes('text')) {
                const text = await resp.text().catch(() => '');
                if (text.includes('mp4') || text.includes('source') || text.includes('file')) {
                    console.log('[BODY]', text.substring(0, 1000));
                }
            }
        }
    });

    try {
        console.log('Loading player...');
        await page.goto(playerUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        
        console.log('Player loaded, checking for video sources...');
        
        // Check page source for video URLs
        const pageContent = await page.content();
        const mp4Matches = pageContent.match(/https?:\/\/files-\d+\.vid3rb\.com[^"'\s]+\.mp4[^"'\s]*/g);
        if (mp4Matches) {
            console.log('\n=== FOUND MP4 LINKS IN PAGE SOURCE ===');
            mp4Matches.forEach(m => console.log(m));
        }
        
        // Check JS variables
        const videoSources = await page.evaluate(() => {
            // Try common video.js source formats
            if (window.player && window.player.src) return JSON.stringify(window.player.src());
            if (window.sources) return JSON.stringify(window.sources);
            
            // Find all script tags with source data
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const s of scripts) {
                const t = s.textContent || '';
                if (t.includes('files-') && t.includes('.mp4')) {
                    return t.substring(0, 2000);
                }
            }
            return null;
        });
        
        if (videoSources) {
            console.log('\n=== VIDEO SOURCES FROM JS ===');
            console.log(videoSources);
        }
        
        // Click play and wait
        await page.evaluate(() => {
            const btn = document.querySelector('.vjs-big-play-button');
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 5000));
        
        // Check again
        const afterClickSrc = await page.evaluate(() => {
            const v = document.querySelector('video');
            return v ? v.currentSrc || v.src : null;
        });
        console.log('\nVideo src after click:', afterClickSrc);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
})();
