// Copies the repo's generated JSON (the source of truth in /public-data) into
// this app's public/data so Next.js serves it statically at /data/*.json.
// Runs automatically before `dev` and `build`. Safe to run when no data exists.
import { cp, mkdir, rm, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../../public-data');
const dest = resolve(here, '../public/data');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(source))) {
    console.warn(`[copy-data] no source at ${source}; skipping (dashboard will show empty state).`);
    await mkdir(dest, { recursive: true });
    return;
  }
  await rm(dest, { recursive: true, force: true });
  await mkdir(dirname(dest), { recursive: true });
  await cp(source, dest, { recursive: true });
  console.log(`[copy-data] copied ${source} -> ${dest}`);
}

main().catch((err) => {
  console.error('[copy-data] failed:', err);
  process.exit(1);
});
