#!/usr/bin/env node
// Script to copy all UI components from frontend/src/components/ui/ to components/ui/
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const src = '/vercel/share/v0-project/frontend/src/components/ui';
const dest = '/vercel/share/v0-project/components/ui';

if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
}

const files = readdirSync(src);
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file));
  console.log(`Copied ${file}`);
}
console.log(`Done: ${files.length} files copied`);
