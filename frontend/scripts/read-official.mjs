import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  await page.goto('https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('h1').filter({hasText:'Flame in Freefall'}).waitFor({timeout:30000});
  await page.waitForFunction(()=>document.body.innerText.includes('Background'),{},{timeout:15000}).catch(()=>undefined);
  await writeFile('../build/eval/official_challenge.html',await page.content());
  const scripts=await page.locator('script:not([src])').allTextContents();
  await writeFile('../build/eval/official_challenge_embedded.json',JSON.stringify(scripts));
  const text=await page.locator('body').innerText();
  await writeFile('../build/eval/official_challenge.txt',text);
  console.log(JSON.stringify({url:page.url(),characters:text.length,headings:await page.locator('h1,h2,h3').allTextContents()}));
}catch(error){console.log(JSON.stringify({error:error.name,message:error.message.split('\n')[0]}));process.exitCode=1;}
finally{await browser.close();}
