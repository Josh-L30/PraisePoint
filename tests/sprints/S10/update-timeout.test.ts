import { it, expect, vi } from 'vitest';
vi.mock('../../../src/features/offline/update-fence', () => ({ pendingUpdate: async () => false }));
it('stops waiting indefinitely and gives close-all recovery guidance after an accepted update stalls', async () => {
  vi.useFakeTimers();
  vi.stubEnv('PROD', true);
  vi.resetModules();
  class Port {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    peer!: Port;
    postMessage(data: unknown) {
      this.peer.onmessage?.({ data });
    }
    close() {}
  }
  class Channel {
    port1 = new Port();
    port2 = new Port();
    constructor() {
      this.port1.peer = this.port2;
      this.port2.peer = this.port1;
    }
  }
  const target = {
      postMessage: (data: { type: string }, ports: Port[]) =>
        ports[0].postMessage(
          data.type === 'GATHER_BUILD' ? { updateProtocol: 2 } : { ok: true, handoff: 2 },
        ),
    },
    controller = {},
    registration = Object.assign(new EventTarget(), { waiting: target, installing: null }),
    container = Object.assign(new EventTarget(), {
      controller,
      register: async () => registration,
    });
  vi.stubGlobal('MessageChannel', Channel);
  vi.stubGlobal('navigator', {
    serviceWorker: container,
    locks: {
      request: async (_name: string, _options: unknown, callback: (lock: unknown) => unknown) =>
        callback({ mode: 'exclusive' }),
    },
  });
  try {
    const runtime = await import('../../../src/features/offline/runtime-client');
    runtime.initializeOfflineRuntime();
    await Promise.resolve();
    let result: Awaited<ReturnType<typeof runtime.requestAppUpdate>> | undefined;
    void runtime.requestAppUpdate().then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(20001);
    expect(result).toBeDefined();
    expect(result?.ok).toBe(false);
    if (result && !result.ok)
      expect(result.error.message).toMatch(/Close all PraisePoint windows and reopen/);
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
