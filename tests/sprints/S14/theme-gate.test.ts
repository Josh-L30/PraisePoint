import {afterEach,describe,it,expect,vi} from 'vitest';
import {initializeTheme,setThemeAccess,transitionTheme} from '../../../src/lib/theme';
afterEach(()=>{setThemeAccess(false);localStorage.removeItem('praisepoint-theme');vi.unstubAllGlobals();});
describe('workspace theme boundary',()=>{
 it('starts light and restores saved dark only after successful authentication',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn()}));localStorage.setItem('praisepoint-theme','dark');initializeTheme();expect(document.documentElement.dataset.theme).toBe('light');setThemeAccess(true);expect(document.documentElement.dataset.theme).toBe('dark');setThemeAccess(false);expect(document.documentElement.dataset.theme).toBe('light');expect(localStorage.getItem('praisepoint-theme')).toBe('dark');
 });
 it('follows a dark system preference only inside the authenticated workspace',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn()}));initializeTheme();expect(document.documentElement.dataset.theme).toBe('light');setThemeAccess(true);expect(document.documentElement.dataset.theme).toBe('dark');
 });
 it('switches immediately without view-transition support',async()=>{
  await transitionTheme('dark',{x:20,y:20});expect(document.documentElement.dataset.theme).toBe('dark');expect(document.documentElement.classList.contains('theme-changing')).toBe(false);
 });
});