import {test,expect} from '@playwright/test';
import {deckFixture,deckId,libraryPath} from './support/deck-fixture';
import {teamFixture,churchId} from './support/team-fixture';
import {personalId} from './support/team-fixture';
import {songServiceFixture} from './support/song-service-fixture';
import {mediaFixture} from './support/media-fixture';
import {writeFile} from 'node:fs/promises';
import {deckFixture as makeDeck} from '../support/deck-fixture';

test('workspace names appear only in an accessible glass choice list',async({page})=>{
 await teamFixture(page);await page.goto('/app');
 const trigger=page.getByRole('button',{name:'Switch workspace',exact:true});await expect(trigger).toBeVisible();
 await expect(page.locator('.top-bar .workspace-name')).toHaveCount(0);
 await expect(page.getByRole('listbox',{name:'Workspaces'})).toHaveCount(0);
 await trigger.click();const list=page.getByRole('listbox',{name:'Workspaces'});await expect(list).toBeVisible();
 await expect(list.getByRole('option',{name:/Personal workspace/})).toBeVisible();
 await page.keyboard.press('End');await expect(list.getByRole('option',{name:/CCF team/})).toBeFocused();await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp('/app/w/'+churchId));
 await trigger.click();await page.keyboard.press('Escape');await expect(list).toHaveCount(0);await expect(trigger).toBeFocused();
 await trigger.click();await page.locator('main h1').click();await expect(list).toHaveCount(0);
});

test('theme toggles all app surfaces and survives a reload',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});await teamFixture(page);await page.goto('/app');
 await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'Switch workspace',exact:true}).click();
 const menu=page.getByRole('listbox',{name:'Workspaces'});await expect(menu).toBeVisible();
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('Add slide immediately creates, selects, saves and reopens a slide below the canvas',async({page})=>{
 await deckFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto(libraryPath+'/'+deckId);
 await page.getByRole('button',{name:'Add slide',exact:true}).click();
 await expect(page.getByRole('button',{name:'Slide 2: Lyrics',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.template-add-panel')).toHaveCount(0);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByRole('button',{name:'Slide 2: Lyrics',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(page.getByRole('button',{name:'Slide 2: Lyrics',exact:true})).toBeVisible();
 const canvas=await page.locator('.editor-canvas-surface').boundingBox(),rail=await page.getByRole('navigation',{name:'Presentation slides'}).boundingBox();
 expect(rail!.y).toBeGreaterThan(canvas!.y+canvas!.height);
 await page.getByRole('button',{name:'Save presentation',exact:true}).click();await expect(page.getByRole('button',{name:'Saved',exact:true})).toBeDisabled();
 await page.reload();await expect(page.getByRole('button',{name:'Slide 2: Lyrics',exact:true})).toBeVisible();
});

test('worship catalogue contains only church sources, filters media and recovers failed previews',async({page})=>{
 await teamFixture(page);await page.goto('/app/w/'+personalId+'/templates');
 await expect(page.locator('.background-card')).toHaveCount(18);
 await expect(page.getByRole('link',{name:/on Pexels/})).toHaveCount(0);
 await page.getByRole('button',{name:'Still images',exact:true}).click();await expect(page.locator('.background-card')).toHaveCount(8);
 await page.getByRole('button',{name:'Moving backgrounds',exact:true}).click();await expect(page.locator('.background-card')).toHaveCount(10);
 await page.route('https://www.churchmediastudio.com/images/**',route=>route.abort());await page.reload();
 await page.getByRole('button',{name:'Moving backgrounds',exact:true}).click();
 await expect(page.getByText('Preview unavailable. Open the source to view this background.').first()).toBeVisible();
 await expect(page.getByRole('link',{name:/View Aurora/}).first()).toHaveAttribute('href','https://www.churchmediastudio.com/free-worship-loops');
});

test('many slides stay in one horizontal strip and dark confirmation remains usable',async({page})=>{
 test.setTimeout(60000);await deckFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto(libraryPath+'/'+deckId);
 const rail=page.getByRole('navigation',{name:'Presentation slides'});await expect(rail).toBeVisible();const initial=await rail.boundingBox();
 for(let i=0;i<12;i++)await page.getByRole('button',{name:'Add slide',exact:true}).click();
 await expect(page.getByRole('button',{name:'Slide 13: Lyrics',exact:true})).toHaveAttribute('aria-pressed','true');
 const final=await rail.boundingBox();expect(final!.height).toBeLessThan(initial!.height+2);
 expect(await page.locator('.slide-order-list').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
 const layout={initial,final,selected:await page.getByRole('button',{name:'Slide 13: Lyrics',exact:true}).boundingBox(),viewport:page.viewportSize()};
 await expect(page.getByRole('button',{name:'Slide 13: Lyrics',exact:true})).toBeInViewport({ratio:1});
 await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await expect(page.getByRole('button',{name:'Slide 13: Lyrics',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Delete slide',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Delete slide'});await expect(modal).toBeVisible();
 await page.screenshot({path:'docs/evidence/S13-dark-confirmation.png',animations:'disabled'});await modal.getByRole('button',{name:'Cancel',exact:true}).click();await expect(modal).toHaveCount(0);await writeFile('docs/evidence/S13-filmstrip-layout.json',JSON.stringify(layout,null,2));
});

test('light and dark screens fit desktop and mobile, with readable actions and unchanged slide colors',async({page})=>{
 test.setTimeout(300000);const state=await songServiceFixture(page);state.documents.set(deckId,{document:makeDeck(),revision:1});await mediaFixture(page);const measurements=[],errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const id=crypto.randomUUID();state.plans.set(id,{id,workspaceId:personalId,title:'Sunday worship',date:null,revision:1,items:[]});
 await page.goto('/app');
 for(const theme of ['light','dark']){
  await page.evaluate(value=>localStorage.setItem('praisepoint-theme',value),theme);
  for(const width of [320,768,1366]){
   await page.setViewportSize({width,height:900});
   for(const path of ['', '/decks','/songs','/services/'+id,'/media','/templates','/team']){
    await page.goto('/app/w/'+personalId+path);await expect(page.getByRole('button',{name:'Switch workspace',exact:true})).toBeVisible({timeout:15000});await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);expect(fits,theme+' '+width+' '+path).toBe(true);measurements.push({theme,width,path,fits});
   }
  }
  await page.setViewportSize({width:1366,height:900});await page.goto('/app/w/'+personalId+'/templates');await expect(page.getByRole('heading',{name:'Backgrounds for worship.'})).toBeVisible();
  await expect.poll(()=>page.locator('.background-preview img').first().evaluate((el:HTMLImageElement)=>el.naturalWidth),{timeout:20000}).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Switch workspace',exact:true}).click();await expect(page.getByRole('listbox',{name:'Workspaces'})).toBeVisible();
  await page.screenshot({path:'docs/evidence/S13-'+theme+'-menu.png',animations:'disabled'});await page.keyboard.press('Escape');
  await page.screenshot({path:'docs/evidence/S13-'+theme+'-gallery.png',animations:'disabled'});
  const button=page.getByRole('link',{name:'Import downloaded media'}),box=await button.boundingBox();if(!box)throw Error('No action');
  const {Image}=await import('imagescript'),shot=await Image.decode(await page.screenshot()),pixel=shot.getPixelAt(Math.floor(box.x+10),Math.floor(box.y+box.height/2)),rgb=[pixel>>>24,(pixel>>>16)&255,(pixel>>>8)&255],foreground=await button.evaluate(el=>getComputedStyle(el).color),values=foreground.match(/[\d.]+/g)!.slice(0,3).map(Number);
  const lum=(channels:number[])=>channels.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((total,v,index)=>total+v*[.2126,.7152,.0722][index],0),a=lum(rgb),b=lum(values),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);expect(contrast).toBeGreaterThanOrEqual(4.5);measurements.push({theme,primaryContrast:contrast});
  await page.goto(libraryPath+'/'+deckId);await expect(page.getByRole('textbox',{name:'Lyrics',exact:true})).toBeVisible();
  await expect(page.locator('.editor-canvas-surface [data-text-id]').first()).toHaveCSS('color','rgb(255, 255, 255)');
  await page.screenshot({path:'docs/evidence/S13-'+theme+'-editor.png',animations:'disabled'});
 }
 await page.setViewportSize({width:390,height:844});await page.goto('/app/w/'+personalId+'/templates');await expect(page.getByRole('heading',{name:'Backgrounds for worship.'})).toBeVisible();await expect.poll(()=>page.locator('.background-preview img').first().evaluate((el:HTMLImageElement)=>el.naturalWidth),{timeout:20000}).toBeGreaterThan(0);await page.screenshot({path:'docs/evidence/S13-mobile-dark.png',animations:'disabled'});
 expect(errors).toEqual([]);await writeFile('docs/evidence/S13-responsive.json',JSON.stringify({measurements,pageErrors:errors,device:'Chromium viewport emulation; no physical phone'},null,2));
});
