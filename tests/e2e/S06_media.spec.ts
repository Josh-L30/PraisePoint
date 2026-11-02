import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createTemplate} from '../../src/features/decks/templates';
import type {MediaDescriptor} from '../../src/domain/media';
import {songServiceFixture} from './support/song-service-fixture';
import {personalId} from './support/team-fixture';
import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {deckFixture,deckId,libraryPath} from './support/deck-fixture';
import {mediaFixture,mediaPath,stillPath} from './support/media-fixture';
test.setTimeout(60000);
test('real PNG bytes insert, resize, fit and persist through the shared editor and preview',async({page})=>{
 const decks=await deckFixture(page),media=await mediaFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto(mediaPath);
 await page.getByLabel('Choose media file',{exact:true}).setInputFiles({name:'Still fixture (test).png',mimeType:'image/png',buffer:await import('node:fs/promises').then(fs=>fs.readFile(stillPath))});
 await page.getByRole('radio',{name:'Workspace cloud · images only',exact:true}).check();await page.getByRole('button',{name:'Import media',exact:true}).click();await expect(page.getByText('Media imported.',{exact:true})).toBeVisible();expect(media.assets.size).toBe(1);
 await page.goto(libraryPath+'/'+deckId);await page.getByRole('button',{name:'Add image',exact:true}).click();await page.locator('.media-choice').filter({hasText:'Still fixture (test).png'}).click();
 const image=page.locator('.editor-canvas .slide-stage img');await expect(image).toHaveCount(1);await expect(image).toHaveJSProperty('naturalWidth',32);
 await page.getByRole('spinbutton',{name:'Box width',exact:true}).fill('700');await page.getByRole('spinbutton',{name:'Box height',exact:true}).fill('180');await page.getByRole('spinbutton',{name:'X position',exact:true}).fill('96');await page.getByRole('spinbutton',{name:'Y position',exact:true}).fill('96');await page.getByRole('combobox',{name:'Image fit',exact:true}).selectOption('cover');
 await page.getByRole('button',{name:'Choose background',exact:true}).click();await page.locator('.media-choice').filter({hasText:'Still fixture (test).png'}).click();await expect(page.locator('.editor-canvas .slide-stage img')).toHaveCount(2);
 await page.getByRole('button',{name:'Save presentation',exact:true}).click();await expect(page.getByText('Saved · revision 2',{exact:true})).toBeVisible();
 const saved=decks.documents.get(deckId)!.document.slides[0],asset=[...media.assets.values()][0];expect(saved.background).toEqual({kind:'image',mediaId:asset.id});expect(saved.elements.find(element=>element.kind==='image')).toMatchObject({mediaId:asset.id,fit:'cover',width:700,height:180,x:96,y:96});
 await page.screenshot({path:'docs/evidence/S06-editor-image.png',fullPage:true});await page.getByRole('button',{name:'Full-window preview',exact:true}).click();await expect(page.locator('.full-slide-preview .slide-stage img')).toHaveCount(2);await expect(page.locator('.full-slide-preview .slide-stage img').first()).toHaveJSProperty('naturalWidth',32);await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Sunday worship',exact:true})).toBeVisible();
});
test('an unconfirmed upload keeps the original and retries with the same media identity',async({page})=>{
 await deckFixture(page,false);const media=await mediaFixture(page);media.failNextUpload=true;await page.goto(mediaPath);await page.getByLabel('Choose media file',{exact:true}).setInputFiles(fileURLToPath(stillPath));await page.getByRole('radio',{name:'Workspace cloud · images only',exact:true}).check();await page.getByRole('button',{name:'Import media',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Upload could not be confirmed.');await expect(page.getByText('Media imported.',{exact:true})).toHaveCount(0);expect(media.assets.size).toBe(0);expect(await page.getByLabel('Choose media file',{exact:true}).evaluate((input:HTMLInputElement)=>input.files?.[0]?.name)).toBe('still.png');
 await page.getByRole('button',{name:'Import media',exact:true}).click();await expect(page.getByText('Media imported.',{exact:true})).toBeVisible();expect(media.uploadIds).toHaveLength(2);expect(media.uploadIds[1]).toBe(media.uploadIds[0]);expect(media.assets.size).toBe(1);
});

test('service review renders the exact snapshot media through the shared resolver',async({page})=>{
 const services=await songServiceFixture(page),media=await mediaFixture(page),png=await readFile(stillPath);
 const asset:MediaDescriptor={id:crypto.randomUUID(),workspaceId:personalId,kind:'image',location:'cloud',mime:'image/png',bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),revision:1,originalName:'Service background (test).png'};media.assets.set(asset.id,asset);
 const id=crypto.randomUUID(),itemId=crypto.randomUUID(),slide={...createTemplate('lyrics'),background:{kind:'image' as const,mediaId:asset.id}};
 services.plans.set(id,{id,workspaceId:personalId,title:'Sunday image review (test)',date:null,revision:1,items:[{id:itemId,deckId,label:'Worship',position:0}]});
 await page.route('**/rest/v1/rpc/build_service_snapshot',route=>route.fulfill({json:{schemaVersion:1,serviceId:id,workspaceId:personalId,sourceRevision:'a'.repeat(64),title:'Sunday image review (test)',slides:[slide],media:[asset],sections:[{id:itemId,deckId,label:'Worship',startIndex:0,slideCount:1,sourceSongId:null}]}}));
 await page.goto('/app/w/'+personalId+'/services/'+id);await page.getByRole('button',{name:'Review service slides',exact:true}).click();await expect(page.locator('.service-snapshot .slide-stage img')).toHaveCount(1);await expect(page.locator('.service-snapshot .slide-stage img')).toHaveJSProperty('naturalWidth',32);
});
