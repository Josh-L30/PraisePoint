import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import {ThemeToggle} from '../../../src/components/ThemeToggle';
import {setTheme} from '../../../src/lib/theme';
afterEach(()=>{Reflect.deleteProperty(document,'startViewTransition');setTheme('light');localStorage.clear();vi.unstubAllGlobals()});
it('switches themes immediately and persists them without starting a view transition',async()=>{vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn()}));setTheme('light');const transition=vi.fn();Object.defineProperty(document,'startViewTransition',{configurable:true,value:transition});render(<ThemeToggle/>);await userEvent.click(screen.getByRole('button',{name:'Switch to dark mode'}));expect(document.documentElement.dataset.theme).toBe('dark');expect(localStorage.getItem('praisepoint-theme')).toBe('dark');expect(transition).not.toHaveBeenCalled();await userEvent.click(screen.getByRole('button',{name:'Switch to light mode'}));expect(document.documentElement.dataset.theme).toBe('light');expect(transition).not.toHaveBeenCalled();});
