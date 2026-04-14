const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.goto('https://hanerix.com/m4i6qsl1wfkq', { waitUntil: 'networkidle2', timeout: 20000 });

    const result = await page.evaluate(() => {
        const html = document.body.innerHTML;
        
        // Get file_id from cookie script
        const fileIdMatch = html.match(/file_id[',"\s]+,?\s*'(\d+)'/);
        const fileIdMatch2 = html.match(/file_id'[^']*'(\d+)'/);
        const cookieMatch = html.match(/cookie\('file_id',\s*'(\d+)'/);
        
        // Get all inputs and textareas
        const inputs = Array.from(document.querySelectorAll('input, textarea')).map(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            value: el.value ? el.value.substring(0, 300) : ''
        }));
        
        // Look for embed tab content
        const tabs = Array.from(document.querySelectorAll('[id*="tab"], [class*="tab-content"], [class*="embed"]')).map(el => ({
            id: el.id,
            cls: el.className.substring(0, 60),
            text: el.textContent.trim().substring(0, 300)
        }));
        
        // Get the download link tab
        const downloadLinks = Array.from(document.querySelectorAll('a')).filter(a => 
            !a.href.includes('#') && a.href.startsWith('http') && !a.href.includes('hanerix')
        ).map(a => ({ text: a.textContent.trim(), href: a.href }));
        
        // Get file_id from script
        const scriptTags = html.match(/file_id.*?'(\d+)'/g);
        
        return { inputs, tabs, downloadLinks, scriptTags, cookieMatch };
    });
    
    console.log('=== INPUTS ===');
    console.log(JSON.stringify(result.inputs, null, 2));
    console.log('\n=== TABS ===');
    console.log(JSON.stringify(result.tabs.slice(0, 10), null, 2));
    console.log('\n=== DOWNLOAD LINKS ===');
    console.log(JSON.stringify(result.downloadLinks, null, 2));
    console.log('\n=== SCRIPT MATCHES ===');
    console.log(JSON.stringify(result.scriptTags, null, 2));
    
    // Click "Embed Code" tab
    const clicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        for (const a of links) {
            if (a.textContent.toLowerCase().includes('embed')) {
                a.click();
                return 'clicked embed tab: ' + a.textContent;
            }
        }
        return 'embed tab not found';
    });
    console.log('\nEmbed click:', clicked);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Now get all inputs and visible content after clicking embed tab
    const afterClick = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
            id: el.id, value: el.value ? el.value.substring(0, 500) : ''
        })).filter(el => el.value.length > 0);
    });
    console.log('\n=== AFTER CLICK INPUTS ===');
    console.log(JSON.stringify(afterClick, null, 2));
    
    await browser.close();
})();
