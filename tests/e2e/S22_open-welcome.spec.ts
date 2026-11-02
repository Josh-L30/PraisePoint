import {test,expect} from '@playwright/test';
test('entrance hands off automatically and preserves light mode',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
 await page.goto('/auth');await expect(page.locator('.login-entrance video')).toBeVisible();
 await expect(page.getByRole('button',{name:'Skip to sign in'})).toHaveCount(0);
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.playbackRate)).toBe(1.6);
 await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible({timeout:15000});
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.reload();await expect(page.locator('.open-welcome-signin')).toBeVisible();await expect(page.locator('video')).toHaveCount(0);expect(errors).toEqual([]);
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

