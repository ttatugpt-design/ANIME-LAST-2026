const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox','--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const episodeUrl = "https://zeta.animerco.org/episodes/hokuto-no-ken-fist-of-the-north-star-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-3/";
    console.log("Visiting episode: ", episodeUrl);
    await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
    
    // play btn
    await page.evaluate(async () => {
        const playBtn = document.querySelector('#click-player') || document.querySelector('.play-video');
        if (playBtn) playBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const optionCount = await page.evaluate(() => document.querySelectorAll('ul.server-list li a.option').length);
    console.log("Found options:", optionCount);
    
    const results = [];
    for (let i = 0; i < Math.min(optionCount, 3); i++) {
        const data = await page.evaluate(async (index) => {
            const options = document.querySelectorAll('ul.server-list li a.option');
            if (!options[index]) return null;
            
            const serverName = options[index].querySelector('.server')?.textContent.trim() || '';
            options[index].click();
            
            let iframeSrc = '';
            let nestedIframeSrc = '';
            
            const start = Date.now();
            while (Date.now() - start < 4500) {
                await new Promise(r => setTimeout(r, 500));
                const iframe = document.querySelector('#player iframe');
                if (iframe && iframe.src && !iframe.src.includes('about:blank') && !iframe.src.includes('a-ads.com')) {
                    iframeSrc = iframe.src;
                    
                    try {
                        if(iframe.contentDocument) {
                            const innerIframe = iframe.contentDocument.querySelector('iframe');
                            if(innerIframe && innerIframe.src) {
                                nestedIframeSrc = innerIframe.src;
                            } else {
                                // sometimes it's an inline video tag or script
                                const scripts = Array.from(iframe.contentDocument.scripts).map(s => s.innerHTML).join(' ');
                                const match = scripts.match(/file["']?\s*:\s*["']([^"']+)["']/);
                                if(match) {
                                    nestedIframeSrc = match[1];
                                }
                            }
                        }
                    } catch(e) {}
                    break;
                }
            }
            return { server: serverName, src: iframeSrc, nestedSrc: nestedIframeSrc };
        }, i);
        
        // Wait, if it didn't find nestedSrc, let's open the src directly in a new tab and extract!
        if (data && data.src && !data.nestedSrc) {
            console.log("Navigating to iframe src to extract real link:", data.src);
            const nestedPage = await browser.newPage();
            try {
                // intercept ads
                await nestedPage.setRequestInterception(true);
                nestedPage.on('request', req => {
                    if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                    else req.continue();
                });
                
                await nestedPage.goto(data.src, {waitUntil: 'domcontentloaded', timeout: 15000});
                
                data.extractedRealSrc = await nestedPage.evaluate(() => {
                    const iframe = document.querySelector('iframe');
                    if(iframe) return iframe.src;
                    
                    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).join(' ');
                    const match = scripts.match(/file["']?\s*:\s*["'](.*?)["']/i) || scripts.match(/(https:\/\/[^"']+\.(mp4|m3u8)[^"']*)/i);
                    if(match) return match[1];
                    
                    // some players like doodstream redirect or have a specific player element
                    return window.location.href; // if redirected
                });
            } catch(e) { console.error(e); }
            await nestedPage.close();
        }
        
        console.log(`Option ${i}: `, data);
        if (data) results.push(data);
    }
    
    await browser.close();
})();
