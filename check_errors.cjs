const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating to https://invorator.fly.dev ...');
  await page.goto('https://invorator.fly.dev', { waitUntil: 'networkidle0' });
  
  const content = await page.content();
  console.log('BODY HTML LENGTH:', content.length);
  
  await browser.close();
})();
