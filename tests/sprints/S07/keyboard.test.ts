import {expect,it} from 'vitest';
import {isPresenterInput} from '../../../src/features/presenter/presenter-state';
it('keeps arrow shortcuts available after clicking a control while ignoring text inputs',()=>{
 const button=document.createElement('button'),input=document.createElement('input'),editable=document.createElement('div');editable.setAttribute('contenteditable','true');const child=document.createElement('span');editable.append(child);
 expect(isPresenterInput(button)).toBe(false);expect(isPresenterInput(input)).toBe(true);expect(isPresenterInput(child)).toBe(true);
});
