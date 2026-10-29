import {test,expect,chromium,type BrowserContext} from '@playwright/test';
import {readFile,readdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {firebaseHost} from './support/firebase-host';
import {prepareOfflineFixture,removeBrowserFixture} from './support/offline-fixture';
test.setTimeout(180000);

test('official Firebase Hosting serves SPA deep links, fresh shell/worker and immutable assets without exposing private or missing files',async()=>{
 const host=await firebaseHost();try{
  const index=await readFile('dist/index.html','utf8'),routes=['/','/auth','/auth/callback','/app/w/fixture/decks','/offline','/offline/fixture','/audience/fixture','/present/fixture','/setup','/invite'],results=[];
  for(const path of routes){const response=await fetch(host.baseURL+path);expect(response.status,path).toBe(200);expect(await response.text(),path).toBe(index);expect(response.headers.get('cache-control'),path).toBe('no-cache');expect(response.headers.get('x-content-type-options')).toBe('nosniff');expect(response.headers.get('content-security-policy')).toContain("script-src 'self'");results.push({path,status:response.status,cache:response.headers.get('cache-control')});}
  const worker=await fetch(host.baseURL+'/service-worker.js');expect(worker.status).toBe(200);expect(worker.headers.get('cache-control')).toBe('no-cache');expect(worker.headers.get('content-type')).toMatch(/javascript/);await worker.arrayBuffer();
  const asset=(await readdir('dist/assets')).find(file=>file.endsWith('.js'))!;const resource=await fetch(host.baseURL+'/assets/'+asset);expect(resource.status).toBe(200);expect(resource.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');await resource.arrayBuffer();
  for(const path of ['/.env','/.firebaserc','/firebase.json','/_headers','/assets/missing-fixture.js','/fonts/missing-fixture.ttf']){const response=await fetch(host.baseURL+path);expect(response.status,path).toBe(404);await response.arrayBuffer();}
  await writeFile('docs/evidence/S10-firebase-routing.json',JSON.stringify({officialEmulator:true,demoProject:'demo-gather-ccf',routes:results,workerFresh:true,hashedAssetsImmutable:true,privateAndMissingFiles404:true,publicDeployment:false},null,2));
 }finally{await host.close();}
});

test('Firebase production headers support complete prepared media and a disconnected full-browser restart',async()=>{
 const scratch=resolve('.superpowers/sdd/2026-10-26-church-presentations'),directory=await mkdtemp(join(scratch,'offline-browser-')),host=await firebaseHost(),options={headless:true,baseURL:host.baseURL,viewport:{width:1440,height:900}};let context:BrowserContext|null=null;const violations:string[]=[],cloud:string[]=[];
 const observe=(browser:BrowserContext)=>browser.on('console',message=>{if(/Content Security Policy|Refused to/.test(message.text()))violations.push(message.text().slice(0,300));});
 try{
  context=await chromium.launchPersistentContext(directory,options);observe(context);const page=context.pages()[0];await prepareOfflineFixture(page);await page.getByRole('link',{name:'Open prepared services',exact:true}).click();const offlineURL=page.url();await context.close();context=await chromium.launchPersistentContext(directory,options);observe(context);context.on('request',request=>{if(/supabase\.co|accounts\.google\.com/.test(request.url()))cloud.push(request.url());});await context.setOffline(true);const offline=context.pages()[0];await offline.goto(offlineURL);await offline.getByRole('button',{name:'Verify prepared copy',exact:true}).click();await expect(offline.getByText('Ready offline',{exact:true})).toBeVisible();await offline.getByRole('link',{name:'Open prepared service',exact:true}).click();const opened=context.waitForEvent('page');await offline.getByRole('button',{name:'Open projector',exact:true}).click();const audience=await opened;await expect(audience.locator('.audience-blackout')).toBeVisible();await offline.getByRole('button',{name:'Send current slide',exact:true}).click();await expect(audience.locator('img')).toBeVisible();await offline.getByRole('button',{name:'Next slide',exact:true}).click();await expect.poll(()=>audience.locator('video[data-media-role="background"]').evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThan(.2);expect(cloud).toEqual([]);expect(violations).toEqual([]);await writeFile('docs/evidence/S10-firebase-offline.json',JSON.stringify({officialEmulator:true,actualPersistentBrowserRestart:true,disconnectedBeforeNavigation:true,preparedImageAndVideo:true,audienceInitiallyBlack:true,manualSend:true,backgroundClockAdvanced:true,cloudRequests:cloud.length,cspViolations:violations,physicalEquipment:false,publicDeployment:false},null,2));
 }finally{await context?.close();await host.close();await removeBrowserFixture(directory,scratch);}
});
