import {expect,it,vi} from 'vitest';
import {render,waitFor} from '@testing-library/react';
import {VideoLayer,type VideoPlayback} from '../../../src/features/presenter/VideoLayer';
const initial=():VideoPlayback=>({paused:true,volume:.7,time:0,seekSequence:0,blackout:false,onFeedback:vi.fn()});
it('blackout pauses and mutes, and a paused restore cannot start audio',()=>{
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(),pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{}),load=vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{}),control=initial();
 const view=render(<VideoLayer url="blob:fixture" control={control}/>),video=view.container.querySelector('video')!;
 view.rerender(<VideoLayer url="blob:fixture" control={{...control,blackout:true}}/>);expect(video.muted).toBe(true);expect(pause).toHaveBeenCalled();
 view.rerender(<VideoLayer url="blob:fixture" control={control}/>);expect(play).not.toHaveBeenCalled();view.unmount();expect(video.getAttribute('src')).toBeNull();expect(load).toHaveBeenCalled();
});
it('a rejected play promise reports recovery instead of claiming playback',async()=>{
 vi.spyOn(HTMLMediaElement.prototype,'play').mockRejectedValue(new DOMException('Blocked','NotAllowedError'));vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});
 const control={...initial(),paused:false};render(<VideoLayer url="blob:fixture" control={control}/>);await waitFor(()=>expect(control.onFeedback).toHaveBeenCalledWith(expect.objectContaining({paused:true,blocked:true,issue:expect.stringContaining('press Space')})));
});
it('applies repeated seek-to-zero intents without resetting on a volume update',()=>{
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});const control=initial(),view=render(<VideoLayer url="blob:fixture" control={control}/>),video=view.container.querySelector('video')!;
 Object.defineProperty(video,'readyState',{value:1,configurable:true});Object.defineProperty(video,'duration',{value:5,configurable:true});
 view.rerender(<VideoLayer url="blob:fixture" control={{...control,seekSequence:1}}/>);video.currentTime=3;
 view.rerender(<VideoLayer url="blob:fixture" control={{...control,seekSequence:1,volume:.3}}/>);expect(video.currentTime).toBe(3);
 view.rerender(<VideoLayer url="blob:fixture" control={{...control,seekSequence:2}}/>);expect(video.currentTime).toBe(0);
});
