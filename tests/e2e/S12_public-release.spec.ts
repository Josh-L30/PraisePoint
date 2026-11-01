import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {teamFixture,personalId} from './support/team-fixture';

test('published S12 serves the gallery and navigation with the intended hosting policy',async({page})=>{
 const origin=process.env.GATHER_HOSTED_VERIFY_URL;
 test.skip(!origin,'Explicit owned production-site check only.');
 if(origin!=='https://gather-ccf-presentations.web.app')throw Error('Unexpected release origin');
 test.setTimeout(90000);
 await page.setViewportSize({width:1366,height:768});
 const response=await page.goto(origin+'/auth');
 expect(response?.status()).toBe(200);
 expect(response?.headers()['content-security-policy']).toContain('https://images.pexels.com');
 await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
 await page.screenshot({path:'docs/evidence/S12-public-login.png'});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active && !!navigator.serviceWorker.controller,{},{timeout:30000});
 // Synthetic auth/API fixtures verify the deployed bundle, never real church records.
 await teamFixture(page,{personalOnly:true});await page.goto(origin+'/app/w/'+personalId+'/templates');
 await expect(page.getByRole('heading',{name:'Backgrounds for worship.'})).toBeVisible({timeout:30000});
 await expect(page.locator('.top-bar').getByRole('combobox',{name:'Switch workspace'})).toBeVisible();
 await expect(page.getByRole('button',{name:'New presentation',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:/View .* on Pexels/})).toHaveCount(4);
 await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeHidden();
 const menu=page.getByRole('button',{name:'Expand navigation',exact:true});await menu.hover();
 await expect(menu.locator('.brand-menu-icon')).toHaveCSS('opacity','1');await menu.click();
 await page.locator('.background-preview img').first().scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('.background-preview img').first().evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
 await page.screenshot({path:'docs/evidence/S12-public-gallery.png'});
 await writeFile('docs/evidence/S12-public-browser.json',JSON.stringify({origin,loginRendered:true,googleSignInNotRepeated:true,syntheticAuthAndApiOnly:true,realChurchDataMutated:false,gallery:true,workspaceHeader:true,sidebarToggle:true,externalPreviewLoaded:true},null,2));
});
