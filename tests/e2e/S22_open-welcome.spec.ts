import {test,expect} from '@playwright/test';
test('login appears directly and preserves light mode',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
 await page.goto('/auth');await expect(page.locator('.login-entrance video')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Skip to sign in'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible({timeout:15000});
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.reload();await expect(page.locator('.open-welcome-signin')).toBeVisible();await expect(page.locator('video')).toHaveCount(0);expect(errors).toEqual([]);
});
test('Evening Calm shares a frame while Open Horizon uses a separate mobile panel',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/auth');await expect(page.locator('.open-welcome-signin')).toBeVisible();
 const brand=await page.getByRole('link',{name:'PraisePoint home'}).boundingBox();expect(brand!.x).toBe(40);
 const story=await page.locator('.open-welcome-story').boundingBox(),form=await page.locator('.open-welcome-signin').boundingBox();expect(Math.abs(story!.x+story!.width-form!.x)).toBeLessThan(1);expect(story!.y).toBe(form!.y);
 await page.setViewportSize({width:390,height:844});const mobileBrand=await page.getByRole('link',{name:'PraisePoint home'}).boundingBox();expect(mobileBrand!.x).toBe(20);const mobileStory=await page.locator('.open-welcome-story').boundingBox(),mobileForm=await page.locator('.open-welcome-signin').boundingBox();expect(Math.round(mobileForm!.y-mobileStory!.y-mobileStory!.height)).toBe(26);await expect(page.locator('.open-welcome-features svg').first()).toHaveCSS('width','16px');await expect(page.locator('.open-welcome-story>p')).not.toBeVisible();
});
test('tablet keeps the transparent Evening Calm frame and honors reduced transparency',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'no-preference'},{name:'prefers-reduced-motion',value:'reduce'}]});await page.setViewportSize({width:834,height:1112});await page.goto('/auth');await expect(page.locator('.open-welcome-panels')).toHaveCSS('display','grid');await expect(page.locator('.open-welcome-panels')).toHaveCSS('background-color','rgba(8, 47, 61, 0.58)');await expect(page.locator('.open-welcome-story h1')).toHaveCSS('opacity','1');
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'},{name:'prefers-reduced-motion',value:'reduce'}]});await expect(page.locator('.open-welcome-panels')).toHaveCSS('background-color','rgb(16, 60, 71)');await expect(page.locator('.open-welcome-panels')).toHaveCSS('backdrop-filter','none');await page.setViewportSize({width:390,height:844});await expect(page.locator('.open-welcome-signin')).toHaveCSS('background-color','rgb(16, 60, 71)');await expect(page.locator('.open-welcome-signin')).toHaveCSS('backdrop-filter','none');
});
test('keyboard sign-in starts the existing Google OAuth route',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/auth/v1/settings',r=>r.fulfill({json:{external:{google:true}}}));
 let target='';await page.route('**/auth/v1/authorize?**',async r=>{target=r.request().url();await r.fulfill({contentType:'text/html',body:'<h1>OAuth route intercepted for verification</h1>'})});
 await page.goto('/auth');await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'PraisePoint home'})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Continue with Google'})).toBeFocused();await page.keyboard.press('Enter');
 await expect.poll(()=>target).toContain('provider=google');const url=new URL(target);expect(url.searchParams.get('redirect_to')).toBe(new URL('/auth/callback',test.info().project.use.baseURL).href);expect(url.searchParams.get('prompt')).toBe('select_account');
});
test('provider failure remains readable and lets the user retry',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:700});
 await page.route('**/auth/v1/settings',r=>r.abort());await page.goto('/auth');await page.getByRole('button',{name:'Continue with Google'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('link',{name:'View connection help'})).toBeVisible();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
