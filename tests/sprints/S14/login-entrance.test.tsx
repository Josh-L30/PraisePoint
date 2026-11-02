import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {LoginEntrance} from '../../../src/features/auth/LoginEntrance';
afterEach(()=>vi.useRealTimers());
it('keeps a white handoff after video ends before revealing login',()=>{vi.useFakeTimers();const done=vi.fn();const {container}=render(<LoginEntrance onComplete={done}/>);fireEvent.ended(container.querySelector('video')!);expect(screen.getByRole('main')).toHaveClass('is-white');expect(done).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(450));expect(done).toHaveBeenCalledTimes(1);});
it('always lets volunteers skip with the keyboard',()=>{const done=vi.fn();render(<LoginEntrance onComplete={done}/>);fireEvent.keyDown(window,{key:'Escape'});expect(done).toHaveBeenCalledTimes(1);});
it('recovers from media failure or a stalled connection',()=>{vi.useFakeTimers();const done=vi.fn();const {container}=render(<LoginEntrance onComplete={done}/>);fireEvent.error(container.querySelector('source')!);expect(done).toHaveBeenCalledTimes(1);act(()=>vi.advanceTimersByTime(12000));expect(done).toHaveBeenCalledTimes(1);});
it('does not trap the login behind a never-loading video',()=>{vi.useFakeTimers();const done=vi.fn();render(<LoginEntrance onComplete={done}/>);act(()=>vi.advanceTimersByTime(7499));expect(done).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(1));expect(done).toHaveBeenCalledTimes(1);});
it('plays the entrance at 1.6x without a visible skip button',()=>{const {container}=render(<LoginEntrance onComplete={vi.fn()}/>);const video=container.querySelector('video')!;fireEvent.loadedMetadata(video);expect(video.playbackRate).toBe(1.6);expect(screen.queryByRole('button')).not.toBeInTheDocument();});
