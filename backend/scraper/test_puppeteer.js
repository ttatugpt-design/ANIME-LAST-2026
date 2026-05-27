const puppeteer = require("puppeteer");
(async () => {
    const browser = await puppeteer.launch({headless: "new", ignoreHTTPSErrors: true, args: ["--no-sandbox"]});
    const page = await browser.newPage();
    await page.goto("https://witanime.life/%d9%82%d8%a7%d8%a6%d9%85%d8%a9-%d8%a7%d9%84%d8%a7%d9%86%d9%85%d9%8a/", {waitUntil: "domcontentloaded"});
    await new Promise(r => setTimeout(r, 5000));
    console.log("Final URL:", page.url());
    const title = await page.title();
    console.log("Title:", title);
    await browser.close();
})();
