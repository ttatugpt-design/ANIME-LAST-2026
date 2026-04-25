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
    for (let i = 0; i < optionCount; i++) {
        const data = await page.evaluate(async (index) => {
            const options = document.querySelectorAll('ul.server-list li a.option');
            if (!options[index]) return null;
            
            const serverName = options[index].querySelector('.server')?.textContent.trim() || '';
            options[index].click();
            
            let iframeSrc = '';
            const start = Date.now();
            while (Date.now() - start < 4500) {
                await new Promise(r => setTimeout(r, 500));
                const iframe = document.querySelector('#player iframe');
                if (iframe && iframe.src && !iframe.src.includes('about:blank') && !iframe.src.includes('a-ads.com')) {
                    iframeSrc = iframe.src;
                    break;
                }
            }
            return { server: serverName, src: iframeSrc };
        }, i);
        
        console.log(`Option ${i}: `, data);
        if (data) results.push(data);
    }
    
    require('fs').writeFileSync('animerco_links_dump.json', JSON.stringify(results, null, 2));
    await browser.close();
})();
