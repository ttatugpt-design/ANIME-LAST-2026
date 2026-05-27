const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    const targetUrl = 'https://eta.animerco.org/episodes/dr-stone-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1/';
    
    console.log(`Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    const results = await page.evaluate(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const links = Array.from(document.querySelectorAll('.server-list li a'));
        const data = [];
        for (const a of links) {
            const serverName = a.querySelector('.server').textContent.trim();
            a.click();
            await sleep(1500);
            
            const playerIframe = document.querySelector('#player iframe');
            if (playerIframe) {
                data.push({ name: serverName, url: playerIframe.src });
            }
        }
        return data;
    });

    console.log('Internal links found:', results.length);

    const finalResults = [];
    for (const res of results) {
        console.log(`Inspecting server: ${res.name} (${res.url})`);
        const innerPage = await browser.newPage();
        try {
            await innerPage.goto(res.url, { waitUntil: 'networkidle2', timeout: 20000 });
            await new Promise(r => setTimeout(r, 2000));

            const inspection = await innerPage.evaluate(() => {
                const ifr = document.querySelector('iframe');
                if (ifr && ifr.src && !ifr.src.includes('about:blank')) {
                    return { type: 'iframe', src: ifr.src };
                }
                // Try to find file links in script tags
                const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).join('\n');
                const fileMatch = scripts.match(/file:[\"']([^\"']+)[\"']/);
                if (fileMatch) return { type: 'file', src: fileMatch[1] };
                
                return { type: 'none', src: null, html: document.body.innerHTML.substring(0, 500) };
            });

            console.log(`Result for ${res.name}:`, inspection);
            finalResults.push({
                name: res.name,
                originalUrl: res.url,
                resolvedUrl: inspection.src || res.url
            });
        } catch(e) {
            console.log(`Failed to inspect ${res.name}: ${e.message}`);
            finalResults.push({ name: res.name, originalUrl: res.url, resolvedUrl: res.url });
        }
        await innerPage.close();
    }

    console.log('--- FINAL SUMMARY ---');
    console.log(JSON.stringify(finalResults, null, 2));
    await browser.close();
})();
