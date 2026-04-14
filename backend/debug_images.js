const puppeteer = require('puppeteer-extra');
(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Check Community
    console.log("Checking Community Page...");
    await page.goto('http://localhost:8080/ar/community', { waitUntil: 'networkidle2' });
    const commImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            width: img.width,
            height: img.height,
            display: window.getComputedStyle(img).display,
            visibility: window.getComputedStyle(img).visibility,
            opacity: window.getComputedStyle(img).opacity,
            inComment: !!img.closest('.border-t.border-gray-100') // rough check for comment area
        })).filter(img => img.src.includes('custom-emojis') || img.src.includes('uploads'));
    });
    console.log("Community Images:", commImages.length);

    // Check WatchPage
    console.log("Checking Watch Page...");
    await page.goto('http://localhost:8080/ar/watch/1/1/slug', { waitUntil: 'networkidle2' });
    const watchImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            width: img.width,
            height: img.height,
            display: window.getComputedStyle(img).display,
            visibility: window.getComputedStyle(img).visibility,
            opacity: window.getComputedStyle(img).opacity,
            inComment: !!img.closest('#comments-section')
        })).filter(img => img.src.includes('custom-emojis') || img.src.includes('uploads'));
    });
    console.log("WatchPage Images:", watchImages);

    await browser.close();
})();
