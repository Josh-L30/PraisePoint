import { expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { openBrowserDB } from '../../../src/lib/browser-db';
import { hashMedia } from '../../../src/features/media/local-media-store';
it('upgrades existing profile and local media bytes without rewriting or losing them', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('crypto', webcrypto);
  try {
    const blob = new NodeBlob([new Uint8Array([1, 2, 3])], { type: 'video/mp4' }),
      previous = await openDB('gather-device', 2, {
        upgrade(db) {
          db.createObjectStore('meta');
          const media = db.createObjectStore('mediaFiles', {
            keyPath: ['profileId', 'descriptor.id'],
          });
          media.createIndex('by-profile', 'profileId');
          media.createIndex('by-workspace', ['profileId', 'descriptor.workspaceId']);
        },
      });
    await previous.put('meta', { profileId: 'profile', signedOut: false }, 'session');
    await previous.put('mediaFiles', {
      profileId: 'profile',
      descriptor: { id: 'media', workspaceId: 'workspace' },
      blob,
    });
    previous.close();
    const upgraded = await openBrowserDB();
    expect(await upgraded.get('meta', 'session')).toEqual({
      profileId: 'profile',
      signedOut: false,
    });
    const saved = await upgraded.get('mediaFiles', ['profile', 'media']);
    expect(saved).toBeDefined();
    expect(await hashMedia(saved!.blob)).toBe(await hashMedia(blob as Blob));
    expect(upgraded.objectStoreNames.contains('preparedServices')).toBe(true);
    expect(upgraded.objectStoreNames.contains('preparedAssets')).toBe(true);
    upgraded.close();
  } finally {
    vi.unstubAllGlobals();
  }
});
