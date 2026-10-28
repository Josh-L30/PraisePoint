// @vitest-environment node
import {expect,it} from 'vitest';import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {resolve,join,sep} from 'node:path';import {applicationBuild} from '../../../scripts/build-fingerprint';
async function removeFixture(root:string,temporaryRoot:string){if(!root.startsWith(temporaryRoot+sep) || !root.split(sep).at(-1)?.startsWith('gather-build-'))throw new Error('Unsafe build fixture cleanup');await rm(root,{recursive:true,force:true});}
it('isolates app versions when root HTML, build settings or public connection configuration changes',async()=>{
 const temporaryRoot=resolve(tmpdir()),root=await mkdtemp(join(temporaryRoot,'gather-build-'));try{
 for(const folder of ['src','public','scripts'])await mkdir(join(root,folder));for(const file of ['src/main.ts','public/icon.svg','index.html','package.json','package-lock.json','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json','scripts/build-fingerprint.ts'])await writeFile(join(root,file),'fixture');
 const initial=applicationBuild(root,{VITE_SUPABASE_URL:'https://one.example.invalid'});await writeFile(join(root,'index.html'),'different HTML shell');expect(applicationBuild(root,{VITE_SUPABASE_URL:'https://one.example.invalid'})).not.toBe(initial);
 const html=applicationBuild(root,{VITE_SUPABASE_URL:'https://one.example.invalid'});expect(applicationBuild(root,{VITE_SUPABASE_URL:'https://two.example.invalid'})).not.toBe(html);await writeFile(join(root,'tsconfig.app.json'),'different compiler settings');expect(applicationBuild(root,{VITE_SUPABASE_URL:'https://one.example.invalid'})).not.toBe(html);
 const stable=applicationBuild(root,{VITE_A:'a',VITE_B:'b',PRIVATE_SECRET:'fixture one'});expect(applicationBuild(root,{VITE_B:'b',VITE_A:'a',PRIVATE_SECRET:'fixture two'})).toBe(stable);expect(applicationBuild(root,{VITE_A:'a',VITE_B:'b'},'new release')).not.toBe(stable);
 }finally{await removeFixture(root,temporaryRoot);}
});
