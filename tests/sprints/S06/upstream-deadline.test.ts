// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {createDeadlineFetch} from '../../../supabase/functions/_shared/deadline-fetch';
it('shares one deadline across upstream calls and preserves earlier cancellation',async()=>{
 const base=vi.fn().mockResolvedValue(new Response()),fetcher=createDeadlineFetch(base,30);
 await fetcher('https://example.invalid/one');const first=base.mock.calls[0][1].signal;
 await fetcher('https://example.invalid/two');const second=base.mock.calls[1][1].signal;
 expect(first).toBe(second);await vi.waitFor(()=>expect(first.aborted).toBe(true),{timeout:1000,interval:10});
 const caller=new AbortController();caller.abort();await createDeadlineFetch(base)('https://example.invalid/three',{signal:caller.signal});expect(base.mock.calls[2][1].signal.aborted).toBe(true);
});
