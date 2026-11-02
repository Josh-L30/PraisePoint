import {it,expect} from 'vitest';import {readFileSync} from 'node:fs';import {transform} from 'lightningcss';
it('production CSS retains standard blur alongside the Safari fallback',()=>{
 const source=readFileSync('src/styles/glass.css','utf8'),rule=source.match(/\.glass \{[^}]+\}/)![0];const css=transform({filename:'glass.css',code:Buffer.from(rule),minify:true,targets:{chrome:111<<16,safari:16<<16}}).code.toString();expect(css).toMatch(/(?<!-)backdrop-filter:blur/);expect(css).toContain('-webkit-backdrop-filter:blur');
});