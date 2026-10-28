// @vitest-environment node
import {expect,it} from 'vitest';
import {isOfflineNavigation,validateShellEntries,hasExclusiveLease,hasUpdateProof,updateProofName} from '../../../src/features/offline/cache-policy';
it('serves app navigation while excluding OAuth callbacks, API paths and foreign origins',()=>{
 const origin='https://gather.example';for(const path of ['/offline','/offline/abc','/audience/abc','/app'])expect(isOfflineNavigation(new URL(path,origin),origin)).toBe(true);
 for(const path of ['/auth/callback?code=secret','/api/data','/rest/v1/decks','/functions/v1/media-upload','/storage/v1/object/private'])expect(isOfflineNavigation(new URL(path,origin),origin)).toBe(false);
 expect(isOfflineNavigation(new URL('https://example.invalid/offline'),origin)).toBe(false);
});
it('requires an exact bounded local shell with index, compiled code, styles and Figtree',()=>{
 const entries=[{url:'index.html',integrity:'sha256-'+'a'.repeat(43)+'='},{url:'assets/app.js',integrity:'sha256-'+'b'.repeat(43)+'='},{url:'assets/app.css',integrity:'sha256-'+'c'.repeat(43)+'='},{url:'fonts/Figtree.ttf',integrity:'sha256-'+'d'.repeat(43)+'='}];
 expect(validateShellEntries(entries)).toBe(true);expect(validateShellEntries(entries.slice(0,3))).toBe(false);expect(validateShellEntries([...entries,{url:'https://example.invalid/auth',integrity:entries[0].integrity}])).toBe(false);expect(validateShellEntries([...entries,entries[0]])).toBe(false);
});

it('an update requires the exclusive runtime lease owned by its requesting window',()=>{const lock={name:'runtime',mode:'exclusive',clientId:'window-a'};expect(hasExclusiveLease([lock],'runtime','window-a')).toBe(true);expect(hasExclusiveLease([lock],'runtime','window-b')).toBe(false);expect(hasExclusiveLease([{...lock,mode:'shared'}],'runtime','window-a')).toBe(false);expect(hasExclusiveLease([],'runtime','window-a')).toBe(false);});

it('binds an update proof to the same opaque lock owner without equating two browser ID systems',()=>{const nonce='12345678-1234-4234-8234-123456789abc',runtime={name:'runtime',mode:'exclusive',clientId:'opaque-owner'},proof={name:updateProofName(nonce),mode:'exclusive',clientId:'opaque-owner'};expect(hasUpdateProof([runtime,proof],'runtime',nonce)).toBe(true);expect(hasUpdateProof([runtime,{...proof,clientId:'other-owner'}],'runtime',nonce)).toBe(false);expect(hasUpdateProof([runtime],'runtime',nonce)).toBe(false);expect(hasUpdateProof([runtime,proof],'runtime','invalid')).toBe(false);});
