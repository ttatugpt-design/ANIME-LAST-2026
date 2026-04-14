const puppeteer = require('puppeteer');

(async () => {
    let browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();
    
    // Stealth
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const url = "https://www.crunchyroll.com/ar/videos/new";

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000)); // wait extra time

        // Extract title
        const pageTitle = await page.title();

        // Scroll indefinitely to get images
        const targetImages = 30; // Just for testing
        let previousHeight = 0;
        let imagesCollected = 0;
        
        while (imagesCollected < targetImages) {
            const currentImages = await page.evaluate(() => {
                const imgs = [];
                document.querySelectorAll('img').forEach(img => {
                    let src = img.src || img.getAttribute('data-src');
                    // some sites use srcset or specific data attributes for high res
                    if (img.srcset) {
                        const srcset = img.srcset.split(',');
                        // usually the last one is the highest res
                        let highestRes = srcset[srcset.length - 1].trim().split(' ')[0];
                        if (highestRes) src = highestRes;
                    }
                    if (src && src.startsWith('http') && !src.includes('data:image') && img.width > 100) {
                        imgs.push(src);
                    }
                });
                // Background images
                document.querySelectorAll('div').forEach(div => {
                    const bg = window.getComputedStyle(div).backgroundImage;
                    if (bg && bg.includes('url(') && !bg.includes('data:')) {
                        let url = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                        if (url.startsWith('http') && (div.offsetWidth > 100)) {
                            imgs.push(url);
                        }
                    }
                });
                return Array.from(new Set(imgs)); // unique
            });
            
            imagesCollected = currentImages.length;
            if (imagesCollected >= targetImages) break;

            const scrollResult = await page.evaluate(async () => {
                const prevHeight = document.body.scrollHeight;
                window.scrollBy(0, 1500);
                return prevHeight;
            });
            
            await new Promise(r => setTimeout(r, 2000));
            
            const newHeight = await page.evaluate(() => document.body.scrollHeight);
            if (newHeight === scrollResult) {
                // Reached bottom
                break;
            }
        }

        const data = await page.evaluate(() => {
            const imgs = [];
            // Generic extraction
            document.querySelectorAll('img, source').forEach(el => {
                let src = el.src || el.getAttribute('srcset') || el.getAttribute('data-src') || el.getAttribute('data-srcset');
                if (src && !src.includes('data:image')) {
                    // Extract highest res from srcset
                    if (src.includes(',')) {
                         const sources = src.split(',').map(s => s.trim().split(' '));
                         sources.sort((a,b) => {
                             const aw = a[1] ? parseInt(a[1]) : 0;
                             const bw = b[1] ? parseInt(b[1]) : 0;
                             return bw - aw;
                         });
                         src = sources[0][0];
                    }
                    if (src.startsWith('http')) {
                        imgs.push(src);
                    }
                }
            });
            return Array.from(new Set(imgs));
        });

        console.log(JSON.stringify({ title: pageTitle, count: data.length, images: data.slice(0, 20) }, null, 2));

    } catch(err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
})();
