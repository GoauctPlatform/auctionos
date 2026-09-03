import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating...');
  await page.goto('http://localhost:5173/#/client/properties', { waitUntil: 'networkidle2' });
  
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  console.log('HTML length:', html.length);
  
  await browser.close();
})();
