import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from 'vite-plugin-pwa';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
function files(path:string):string[]{return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(resolve(path,entry.name)):[resolve(path,entry.name)]);}
const root=process.cwd(),hash=createHash('sha256');
for(const path of [...files(resolve(root,'src')),...files(resolve(root,'public')),resolve(root,'package-lock.json'),resolve(root,'vite.config.ts')].sort())hash.update(relative(root,path).replaceAll('\\','/')).update(readFileSync(path));
hash.update(process.env.GATHER_BUILD_ID??'');
const appBuild=hash.digest('hex');let output=resolve(root,'dist');
export default defineConfig({define:{__APP_BUILD__:JSON.stringify(appBuild)},plugins:[react(),tailwindcss(),{name:'gather-output-path',configResolved(config){output=resolve(config.root,config.build.outDir);}},VitePWA({
 strategies:'injectManifest',srcDir:'src',filename:'service-worker.ts',injectRegister:false,registerType:'prompt',
 manifest:false,includeManifestIcons:false,
 injectManifest:{globPatterns:['**/*.{js,css,html,ttf,svg,webmanifest}'],globIgnores:['service-worker.js'],maximumFileSizeToCacheInBytes:2*1024*1024,manifestTransforms:[async entries=>({manifest:await Promise.all(entries.map(async entry=>({...entry,integrity:'sha256-'+createHash('sha256').update(await readFile(resolve(output,entry.url))).digest('base64')}))),warnings:[]})]}
})],server:{port:5173,strictPort:true}});
