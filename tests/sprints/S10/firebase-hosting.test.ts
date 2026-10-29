// @vitest-environment node
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
type Rule={source?:string;regex?:string;headers:{key:string;value:string}[]};
function configuration(){return JSON.parse(readFileSync('firebase.json','utf8')) as {hosting:{public:string;ignore:string[];rewrites:{source:string;destination:string}[];headers:Rule[]};functions?:unknown;firestore?:unknown;storage?:unknown};}
it('targets the dedicated Spark hosting project and exposes only the production build',()=>{
 const config=configuration(),binding=JSON.parse(readFileSync('.firebaserc','utf8'));
 expect(binding.projects.default).toBe('gather-ccf-presentations');
 expect(config.hosting.public).toBe('dist');
 expect(config.functions).toBeUndefined();expect(config.firestore).toBeUndefined();expect(config.storage).toBeUndefined();
 expect(config.hosting.ignore).toEqual(expect.arrayContaining(['**/.*','**/node_modules/**','_headers']));
 expect(config.hosting.rewrites.some(rule=>rule.destination==='/index.html')).toBe(true);
 expect(config.hosting.rewrites.some(rule=>rule.source==='**')).toBe(false);
});
it('keeps deep-link HTML and the worker fresh while retaining immutable hashed assets',()=>{
 const rules=configuration().hosting.headers,global=rules.find(rule=>rule.headers.some(header=>header.key==='Content-Security-Policy')),assets=rules.find(rule=>rule.headers.some(header=>header.value.includes('immutable')));
 expect(global?.headers).toContainEqual({key:'Cache-Control',value:'no-cache'});
 expect(assets?.headers).toContainEqual({key:'Cache-Control',value:'public, max-age=31536000, immutable'});
 for(const path of ['/assets/app.js','\\assets\\app.js'])expect(new RegExp(assets!.regex!).test(path)).toBe(true);expect(new RegExp(assets!.regex!).test('/auth/callback')).toBe(false);
 expect(rules.indexOf(assets!)).toBeGreaterThan(rules.indexOf(global!));
});
it('preserves the verified browser capabilities and blocks executable third-party content',()=>{
 const global=configuration().hosting.headers.find(rule=>rule.headers.some(header=>header.key==='Content-Security-Policy'))!,headers=Object.fromEntries(global.headers.map(header=>[header.key,header.value])),policy=headers['Content-Security-Policy'];
 expect(policy).toContain("script-src 'self'");expect(policy).not.toContain('unsafe-eval');expect(policy).toContain("font-src 'self'");expect(policy).toContain("worker-src 'self'");expect(policy).toContain("media-src 'self' blob:");expect(policy).toContain("object-src 'none'");expect(policy).toContain("frame-ancestors 'none'");expect(policy).toContain('https://tnrmotwiarlpknamxoyp.supabase.co');
 expect(headers['X-Content-Type-Options']).toBe('nosniff');expect(headers['X-Frame-Options']).toBe('DENY');
 expect(headers['Permissions-Policy']).toContain('fullscreen=(self)');
});
