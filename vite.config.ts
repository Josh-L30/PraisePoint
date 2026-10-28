import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from 'vite-plugin-pwa';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {applicationBuild} from './scripts/build-fingerprint.ts';
const root=process.cwd();let output=resolve(root,'dist');
export default defineConfig(({mode})=>{
 const appBuild=applicationBuild(root,loadEnv(mode,root,'VITE_'),process.env.GATHER_BUILD_ID??'');
 return {define:{__APP_BUILD__:JSON.stringify(appBuild)},plugins:[react(),tailwindcss(),{name:'gather-output-path',configResolved(config){output=resolve(config.root,config.build.outDir);}},VitePWA({
 strategies:'injectManifest',srcDir:'src',filename:'service-worker.ts',injectRegister:false,registerType:'prompt',
 manifest:false,includeManifestIcons:false,
 injectManifest:{globPatterns:['**/*.{js,css,html,ttf,svg,webmanifest}'],globIgnores:['service-worker.js'],maximumFileSizeToCacheInBytes:2*1024*1024,manifestTransforms:[async entries=>({manifest:await Promise.all(entries.map(async entry=>({...entry,integrity:'sha256-'+createHash('sha256').update(await readFile(resolve(output,entry.url))).digest('base64')}))),warnings:[]})]}
 })],server:{port:5173,strictPort:true}};
});
