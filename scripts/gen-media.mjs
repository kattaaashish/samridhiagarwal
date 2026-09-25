#!/usr/bin/env node
/**
 * Generates placeholder media (4s silent looping MP4 + JPG poster + WebP srcset)
 * for every media slot in seed/content.json that carries a `_gen` hint.
 * Output goes to public/media/**. Idempotent: skips slots whose files exist.
 * Usage: node scripts/gen-media.mjs [--force]
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';

const run = promisify(execFile);
const force = process.argv.includes('--force');
const docs = JSON.parse(readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8'));
const OUT = new URL('../public', import.meta.url).pathname;
const WIDTHS = [480, 960, 1440];
const TYPES = { linear: 0, radial: 1, circular: 2, spiral: 3, square: 4 };

const jobs = [];
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(walk);
  if (node._gen) {
    const base = node.localVideo ? node.localVideo.replace(/\.mp4$/, '') : node.localSrc ?? node.image?.localSrc;
    if (base) jobs.push({ base, gen: node._gen, video: !!node.localVideo });
  }
  for (const v of Object.values(node)) walk(v);
}
walk(docs);

async function ffmpeg(args) {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { maxBuffer: 1 << 24 });
}

async function generate({ base, gen, video }) {
  const { w, h, palette, type = 'linear', seed = 1 } = gen;
  const file = join(OUT, base);
  mkdirSync(dirname(file), { recursive: true });
  const poster = `${file}.jpg`;
  if (!force && existsSync(poster) && (!video || existsSync(`${file}.mp4`))) return 'skip';

  const [c0, c1, c2, c3] = palette;
  // Video resolution: cap long edge at 1280 to keep files light.
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const vw = Math.round((w * scale) / 2) * 2;
  const vh = Math.round((h * scale) / 2) * 2;
  const grad = (W, H, d) =>
    `gradients=s=${W}x${H}:c0=${c0}:c1=${c1}:c2=${c2}:c3=${c3}:nb_colors=4:type=${TYPES[type] ?? 0}:speed=0.012:seed=${seed}:d=${d}:r=24,format=rgb24`;
  const perl = (W, H) =>
    `perlin=s=${Math.round(W / 5)}x${Math.round(H / 5)}:octaves=3:persistence=0.55:xscale=2.5:yscale=2.5:tscale=0.35:random_mode=seed:seed=${seed}:r=24,scale=${W}:${H}:flags=bicubic,eq=contrast=1.4:brightness=0.08,format=rgb24`;
  const mix = `[0:v][1:v]blend=all_mode=softlight:all_opacity=0.55,eq=brightness=0.03:saturation=1.05,noise=alls=5:allf=t,vignette=PI/6`;

  if (video) {
    await ffmpeg([
      '-f', 'lavfi', '-i', grad(vw, vh, 4),
      '-f', 'lavfi', '-i', perl(vw, vh),
      '-filter_complex', `${mix},format=yuv420p`,
      '-t', '4', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', `${file}.mp4`,
    ]);
  }
  // Poster / still at full size (frame 0 of the same generator so it matches the video).
  await ffmpeg([
    '-f', 'lavfi', '-i', grad(w, h, 0.1),
    '-f', 'lavfi', '-i', perl(w, h),
    '-filter_complex', `${mix},format=yuvj420p`,
    '-frames:v', '1', '-q:v', '5', poster,
  ]);
  for (const width of WIDTHS.filter((x) => x <= w)) {
    await ffmpeg(['-i', poster, '-vf', `scale=${width}:-2`, '-c:v', 'libwebp', '-quality', '74', `${file}-${width}.webp`]);
  }
  return 'ok';
}

const concurrency = 4;
let i = 0, done = 0, skipped = 0;
console.log(`Generating ${jobs.length} media slots…`);
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (i < jobs.length) {
      const job = jobs[i++];
      try {
        const r = await generate(job);
        r === 'skip' ? skipped++ : done++;
      } catch (e) {
        console.error('FAILED', job.base, e.stderr || e.message);
        process.exitCode = 1;
      }
    }
  }),
);
console.log(`Done: ${done} generated, ${skipped} skipped.`);
