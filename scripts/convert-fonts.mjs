#!/usr/bin/env node
// Converts fonts/*.{ttf,otf} to WOFF2, writing output into fonts-built/.
// Re-runnable any time new font files are added: a source file is skipped
// whenever its .woff2 output already exists and is newer than the source,
// so this never re-converts unchanged fonts.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import wawoff2 from 'wawoff2';

const SOURCE_DIR = new URL('../fonts/', import.meta.url);
const OUTPUT_DIR = new URL('../fonts-built/', import.meta.url);
const SOURCE_EXTENSIONS = new Set(['.ttf', '.otf']);

async function isUpToDate(sourcePath, outputPath) {
  try {
    const [sourceStat, outputStat] = await Promise.all([stat(sourcePath), stat(outputPath)]);
    return outputStat.mtimeMs >= sourceStat.mtimeMs;
  } catch {
    return false;
  }
}

async function convertFont(fileName) {
  const sourcePath = new URL(encodeURIComponent(fileName), SOURCE_DIR);
  const outputName = `${basename(fileName, extname(fileName)).toLowerCase()}.woff2`;
  const outputPath = new URL(encodeURIComponent(outputName), OUTPUT_DIR);

  if (await isUpToDate(sourcePath, outputPath)) {
    console.log(`skip (up to date)  ${fileName}`);
    return;
  }

  const sourceBuffer = await readFile(sourcePath);
  const woff2Buffer = await wawoff2.compress(sourceBuffer);
  await writeFile(outputPath, woff2Buffer);
  console.log(`converted          ${fileName} -> fonts-built/${outputName}`);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await readdir(SOURCE_DIR);
  const sourceFiles = entries.filter((entry) =>
    SOURCE_EXTENSIONS.has(extname(entry).toLowerCase()),
  );

  if (sourceFiles.length === 0) {
    console.log('No .ttf/.otf files found in fonts/');
    return;
  }

  for (const fileName of sourceFiles) {
    await convertFont(fileName);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
