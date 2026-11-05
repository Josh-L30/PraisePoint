import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';

/** Runs the official Hosting emulator with the committed policy and an isolated demo project. */
export async function firebaseHost() {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('No free test port');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  const scratch = resolve('.superpowers/sdd/2026-10-29-praisepoint-usability');
  await mkdir(scratch, { recursive: true });
  const path = join(scratch, 'firebase-emulator-' + crypto.randomUUID() + '.json'),
    config = JSON.parse(await readFile('firebase.json', 'utf8'));
  config.hosting.public = relative(scratch, resolve('dist')).split(sep).join('/');
  config.emulators.hosting.port = port;
  await writeFile(path, JSON.stringify(config));
  const child = spawn(
    process.execPath,
    [
      resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
      'emulators:start',
      '--only',
      'hosting',
      '--project',
      'demo-gather-ccf',
      '--config',
      path,
      '--non-interactive',
    ],
    {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true', FIREBASE_CLI_DISABLE_MOTD: 'true' },
    },
  );
  let output = '',
    spawnError: Error | undefined;
  const collect = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-14000);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.on('error', (error) => {
    spawnError = error;
  });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (child.exitCode === null && child.signalCode === null)
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
        child.kill('SIGINT');
      });
    await unlink(path);
  };
  const baseURL = 'http://127.0.0.1:' + port,
    deadline = Date.now() + 45000;
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error('Firebase emulator exited: ' + output);
      try {
        const response = await fetch(baseURL + '/', { signal: AbortSignal.timeout(1000) });
        await response.arrayBuffer();
        return { baseURL, close };
      } catch {
        /* Wait for the official emulator to bind its port. */
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error('Firebase Hosting emulator did not become ready: ' + output);
  } catch (error) {
    await close();
    throw error;
  }
}
