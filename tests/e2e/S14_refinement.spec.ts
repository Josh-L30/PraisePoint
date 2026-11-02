import {test,expect} from '@playwright/test';
import {teamFixture,personalId} from './support/team-fixture';
import {songServiceFixture} from './support/song-service-fixture';
import {deckFixture,libraryPath} from './support/deck-fixture';
import {mediaFixture} from './support/media-fixture';

test('anonymous login stays light without changing the saved workspace preference',async({page})=>{
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.addInitScript(()=>localStorage.setItem('praisepoint-theme','dark'));
 await page.goto('/auth');await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(page.getByRole('button',{name:/Switch to .* mode/})).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('praisepoint-theme'))).toBe('dark');
});
test('authenticated theme switches without a circle and retains preference',async({page})=>{
 await page.addInitScript(()=>{const animate=Element.prototype.animate;Object.defineProperty(window,'s14Animations',{value:[],configurable:true});Element.prototype.animate=function(frames,options){(window as unknown as {s14Animations:unknown[]}).s14Animations.push({frames,options});return animate.call(this,frames,options);};});await teamFixture(page);await page.goto('/app');await expect(page.getByRole('button',{name:'Switch to dark mode'})).toBeVisible();await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect.poll(()=>page.evaluate(()=>JSON.stringify((window as unknown as {s14Animations:unknown[]}).s14Animations))).not.toContain('circle(');await expect(page.locator('html')).not.toHaveClass(/theme-changing/);await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Switch to light mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});
test('sidebar groups prepared services beside templates and reveals only the collapse arrow',async({page})=>{
 await teamFixture(page);await page.goto('/app');const a=await page.getByRole('link',{name:'Templates',exact:true}).boundingBox(),b=await page.getByRole('link',{name:'Prepared services',exact:true}).boundingBox();expect(b!.y-a!.y-a!.height).toBeLessThanOrEqual(8);
 const toggle=page.getByRole('button',{name:'Collapse navigation'});await page.mouse.move(700,200);await expect(toggle.locator('.collapse-arrow')).toHaveCSS('opacity','0');await toggle.hover();await expect(toggle.locator('.collapse-arrow')).toHaveCSS('opacity','1');await expect(page.locator('.sidebar-brand-row')).toHaveCSS('border-bottom-style','solid');
});
test('mobile song title has its own row and wraps completely above actions',async({page})=>{
 const state=await songServiceFixture(page),id=crypto.randomUUID(),title='Amazing Grace — How sweet the sound, worship together this Sunday';state.songs.set(id,{id,workspaceId:personalId,title,lyrics:'Grace',author:'Worship team',source:null,usageNotes:null,revision:1});await page.setViewportSize({width:320,height:844});await page.goto('/app/w/'+personalId+'/songs');const row=page.locator('.song-library .content-row'),heading=row.getByRole('heading',{name:title}),actions=row.locator('.action-row');await expect(heading).toBeVisible();const h=await heading.boundingBox(),r=await row.boundingBox(),a=await actions.boundingBox();expect(h!.width).toBeGreaterThan(r!.width-70);expect(a!.y).toBeGreaterThan(h!.y+h!.height);expect(await heading.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'docs/evidence/S15-song-mobile.png'});
});
test('layout choices show distinct readable category compositions',async({page})=>{
 await deckFixture(page,false);await page.goto(libraryPath);await page.getByRole('button',{name:'New presentation',exact:true}).click();await expect(page.locator('.layout-preview')).toHaveCount(5);expect(await page.locator('.layout-preview').evaluateAll(nodes=>nodes.every(el=>{const a=el.getBoundingClientRect(),b=el.closest('button')!.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;}))).toBe(true);await expect(page.getByText('Your lyrics go here',{exact:true})).toBeVisible();await expect(page.getByText('John 3:16',{exact:true})).toBeVisible();await page.screenshot({path:'docs/evidence/S15-layout-choices.png'});
});
test('media library keeps import clear and puts detailed limits behind disclosure',async({page})=>{
 await teamFixture(page);await mediaFixture(page);await page.goto('/app/w/'+personalId+'/media');await expect(page.getByRole('heading',{name:'Media library',exact:true})).toBeVisible();await expect(page.locator('details.media-help')).not.toHaveAttribute('open');await page.screenshot({path:'docs/evidence/S15-media-library.png'});await page.locator('details.media-help summary').click();await expect(page.getByText(/4 megapixels/)).toBeVisible();
});
test('theme remains usable when view transitions are unavailable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(document,'startViewTransition',{value:undefined,configurable:true}));await teamFixture(page);await page.goto('/app');await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.getByRole('button',{name:'Switch to light mode'})).toBeEnabled();
});

test('production glass keeps live menu blur without filtering scrolling surfaces',async({page})=>{
 await teamFixture(page);const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'no-preference'}]});await page.goto('/app');await expect(page.locator('main')).toHaveCSS('backdrop-filter','none');await expect(page.locator('.side-panel')).toHaveCSS('backdrop-filter','none');await page.getByRole('button',{name:'Switch workspace',exact:true}).click();await expect(page.locator('.workspace-menu')).toHaveCSS('backdrop-filter',/blur\(24px\)/);await page.keyboard.press('Escape');
});
