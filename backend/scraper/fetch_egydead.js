const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('=== Step 1: Opening Invincible S04E01 page... ===');
    await page.goto('https://egydead.pics/episode/invincible-2021-s04e01-1/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: 'step1_invincible.png' });
    
    // Click the .watchNow element (the red button we saw in the screenshot)
    console.log('Looking for .watchNow button...');
    const watchNow = await page.$('.watchNow');
    if (watchNow) {
        console.log('Found .watchNow, clicking...');
        await watchNow.click();
        await sleep(4000);
    } else {
        console.log('.watchNow not found, trying other selectors...');
        // Try other selectors
        const selectors = ['.watch-btn', '.btn-watch', '[class*="watch"]', 'a.red', 'a[href*="watch"]'];
        for (const sel of selectors) {
            try {
                await page.click(sel);
                console.log('Clicked:', sel);
                await sleep(3000);
                break;
            } catch(e) { /* try next */ }
        }
    }
    
    await page.screenshot({ path: 'step2_after_watch_click.png' });
    console.log('Step 2 screenshot saved. New URL:', page.url());
    
    // Get page content to understand what's there
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nPage content after click:\n', bodyText.substring(0, 1000));
    
    // Look for "جميع الجودات" button  
    console.log('\n=== Step 3: Looking for quality button... ===');
    const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button'))
            .map(el => ({ 
                text: el.textContent.trim().replace(/\s+/g, ' '), 
                href: el.getAttribute('href') || '',
                classes: el.className,
                tag: el.tagName
            }))
            .filter(l => l.text.length > 0);
    });
    
    // Find quality-related elements
    const qualityEl = allLinks.find(l => 
        l.text.includes('جميع') || 
        l.text.includes('جودات') || 
        l.text.includes('HD') || 
        l.text.includes('تحميل') ||
        l.text.includes('download')
    );
    
    console.log('\nQuality element found:', qualityEl);
    console.log('\nAll elements list:');
    allLinks.slice(0, 30).forEach(l => console.log(`[${l.tag}] class="${l.classes.substring(0,30)}" text="${l.text.substring(0,50)}" href="${l.href.substring(0,80)}"`));
    
    if (qualityEl) {
        if (qualityEl.href && qualityEl.href.startsWith('http')) {
            console.log('\nNavigating to quality page:', qualityEl.href);
            await page.goto(qualityEl.href, { waitUntil: 'networkidle2', timeout: 30000 });
        } else {
            await page.evaluate((targetText) => {
                const allEls = Array.from(document.querySelectorAll('a, button'));
                const el = allEls.find(e => e.textContent.trim().includes(targetText));
                if (el) el.click();
            }, qualityEl.text.substring(0, 15));
        }
        await sleep(3000);
    }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);
    await page.screenshot({ path: 'step3_quality.png' });
    console.log('\nStep 3 screenshot saved. Final URL:', page.url());
    
    // Extract all external video links
    const finalLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => ({ text: a.textContent.trim().replace(/\s+/g, ' '), href: a.href }))
            .filter(l => l.href && l.href.startsWith('http'));
    });
    
    const videoHosts = ['dood', 'uqload', 'upstream', 'vidoza', 'streamtape', 'hglink', 'streamsb', 'ok.ru', 'dailymotion', 'vidbom', 'mcloud', 'filemoon'];
    const videoLinks = finalLinks.filter(l => videoHosts.some(h => l.href.includes(h)));
    
    console.log('\n====== RESULT: VIDEO LINKS FOUND ======');
    if (videoLinks.length > 0) {
        videoLinks.forEach(l => {
            console.log('\nTitle: ' + l.text);
            console.log('Download URL: ' + l.href);
            
            // Convert to embed
            let embedUrl = l.href;
            if (l.href.match(/\/d\//)) embedUrl = l.href.replace('/d/', '/e/');
            else if (l.href.match(/\/f\//)) embedUrl = l.href.replace('/f/', '/e/');
            else if (l.href.includes('dood')) embedUrl = l.href; // already might be embed
            
            if (embedUrl !== l.href) console.log('Embed URL:    ' + embedUrl);
        });
    } else {
        console.log('No video host links found. All external links:');
        finalLinks.filter(l => !l.href.includes('egydead')).forEach(l => console.log(l.href));
    }
    
    await browser.close();
    console.log('\n=== DONE ===');
})();
