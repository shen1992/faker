const puppeteer = require('puppeteer')

puppeteer.launch({headless: false}).then(async browser => {
  const page = await browser.newPage();
  await page.goto('https://baidu.com');
  await page.type('#kw', 'puppeteer', {delay: 100});
  page.click('#su')
  await page.waitFor(1000);
  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  })
  const targetLink = await page.evaluate(() => {
    const text = [...document.querySelectorAll('#content_left a')].filter(item => {  
      return item.innerText && item.innerText === 'Puppeteer的入门教程和实践 - 简书'
    })[0]
    return text.getAttribute('href')
  });
  console.log('a', targetLink)
  await page.goto(targetLink);
  await page.waitFor(1000);
  // await browser.close();
})


