const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto('https://egydead.pics/episode/%d8%a7%d9%86%d9%85%d9%8a-kaiju-no-8-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%ab%d8%a7%d9%86%d9%8a-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-1-%d9%85%d8%aa%d8%b1%d8%ac/', 
        { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Click watchNow and look for episode list
    const watchNow = await page.$('.watchNow');
    if (watchNow) { await watchNow.click(); await new Promise(r => setTimeout(r, 3000)); }

    const result = await page.evaluate(() => {
        // Find episode list links
        const eps = Array.from(document.querySelectorAll('[class*="episode"], [class*="eps"], [id*="eps"], .eps-list a, .EpisodeList a, ul li a'))
            .filter(a => a.href && a.href.includes('egydead'))
            .map(a => ({ text: a.textContent.trim().substring(0, 60), href: a.href }));
        
        // Also look for navigation: next/prev
        const navLinks = Array.from(document.querySelectorAll('a'))
            .filter(a => a.href && a.href.includes('egydead') && (
                a.textContent.includes('التالي') || a.textContent.includes('next') ||
                a.textContent.includes('الحلقة') || a.textContent.includes('episode') ||
                a.className.includes('next') || a.className.includes('prev')
            ))
            .map(a => ({ text: a.textContent.trim().substring(0, 60), href: a.href, cls: a.className }));
        
        // Get all episode-like links
        const allEgydead = Array.from(document.querySelectorAll('a'))
            .filter(a => a.href && a.href.includes('/episode/'))
            .map(a => ({ text: a.textContent.trim().substring(0, 60), href: a.href }));
        
        return { eps: eps.slice(0, 20), navLinks, allEgydead: allEgydead.slice(0, 30) };
    });
    
    console.log('=== EPISODE LIST ===');
    console.log(JSON.stringify(result.eps, null, 2));
    console.log('\n=== NAV LINKS ===');
    console.log(JSON.stringify(result.navLinks, null, 2));
    console.log('\n=== ALL /episode/ LINKS ===');
    console.log(JSON.stringify(result.allEgydead, null, 2));
    
    await browser.close();
})();
