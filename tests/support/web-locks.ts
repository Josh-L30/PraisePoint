import { vi } from 'vitest';
export function installTestLocks() {
  let tail = Promise.resolve();
  const original = Object.getOwnPropertyDescriptor(navigator, 'locks');
  const request = vi.fn(
    (
      _name: string,
      options: LockOptions | ((lock: Lock) => unknown),
      handler?: (lock: Lock) => unknown,
    ) => {
      const callback = typeof options === 'function' ? options : handler!;
      const work = tail.then(() => callback({ name: _name, mode: 'exclusive' } as Lock));
      tail = work.then(
        () => undefined,
        () => undefined,
      );
      return work;
    },
  );
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  return {
    request,
    restore() {
      if (original) Object.defineProperty(navigator, 'locks', original);
      else Reflect.deleteProperty(navigator, 'locks');
    },
  };
}
