#!/usr/bin/env node
/*
 * Prepare a photo for the site: take out where and when it was taken, shrink it,
 * and keep it the right way up.
 *
 *   node tools/prep-photo.cjs <original> <output.jpg | output.png> [--max 1800]
 *
 * JPEG out (photographs): Exif (GPS, camera, time), XMP, IPTC and comments are
 * removed. A rotation flag is kept when the picture needs one to stand upright.
 * A JPEG that is already small enough is not re-encoded: its image data is copied
 * byte for byte. Anything else goes through macOS `sips` to resize/convert first.
 *
 * PNG out (graphics, transparency): only image and colour chunks are kept, and any
 * rotation is baked into the pixels.
 *
 * HEIC is refused on purpose: export it from Photos as JPEG with location off.
 * Without `sips` (not a Mac) it still strips metadata; it just cannot resize.
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const at = argv.indexOf('--max');
const MAX = at >= 0 ? parseInt(argv.splice(at, 2)[1], 10) : 1800;
const [src, dst] = argv;
const die = (m) => { console.error('✗ ' + m); process.exit(1); };

if (!src || !dst || !(MAX > 0)) die('usage: node tools/prep-photo.cjs <original> <output.jpg|output.png> [--max 1800]');
if (!fs.existsSync(src)) die('not found: ' + src);
if (path.resolve(src) === path.resolve(dst)) die('write to a new file; the original is never overwritten');
const inExt = path.extname(src).toLowerCase(), outExt = path.extname(dst).toLowerCase();
if (inExt === '.heic' || inExt === '.heif') die('HEIC is not handled here. In Photos: File → Export → Export 1 Photo → JPEG, with "Include location information" unticked. Then run this on the JPEG.');
if (!['.jpg', '.jpeg', '.png'].includes(outExt)) die('output must end in .jpg or .png');

let hasSips = true;
try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); } catch { hasSips = false; }
const sips = (...a) => execFileSync('sips', a, { stdio: ['ignore', 'pipe', 'pipe'] });
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-photo-'));
const warn = [];

// ---- JPEG ------------------------------------------------------------------
function jpegSegments(b) {
  if (b[0] !== 0xFF || b[1] !== 0xD8) die('not a JPEG: ' + src);
  const segs = [{ m: 0xD8, data: b.subarray(0, 2) }];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) die('damaged JPEG');
    const m = b[i + 1];
    if (m === 0xFF) { i++; continue; }                                  // fill byte
    if (m === 0xDA) { segs.push({ m, data: b.subarray(i) }); break; }   // image data, to the end
    const len = b.readUInt16BE(i + 2);
    segs.push({ m, data: b.subarray(i, i + 2 + len) });
    i += 2 + len;
  }
  return segs;
}
function tiffOrientation(t) {                                           // t: a TIFF header onwards
  const le = t.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = (o) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  const ifd = u32(4);
  for (let k = 0, n = u16(ifd); k < n; k++) { const e = ifd + 2 + k * 12; if (u16(e) === 0x0112) return u16(e + 8); }
  return 1;
}
const isExif = (s) => s.m === 0xE1 && s.data.toString('latin1', 4, 10) === 'Exif\0\0';
const miniExif = (o) => Buffer.from([0xFF, 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0,
  0x4D, 0x4D, 0x00, 0x2A, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0, 0, 0, 0, 0]);
function jpegSize(segs) {
  const f = segs.find((s) => [0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF].includes(s.m));
  return f ? [f.data.readUInt16BE(7), f.data.readUInt16BE(5)] : [0, 0];
}
function cleanJpeg(b) {
  const segs = jpegSegments(b), keep = [], gone = new Set();
  let orientation = 1;
  for (const s of segs) {
    if (isExif(s)) {
      orientation = tiffOrientation(s.data.subarray(10));
      if (!s.data.equals(miniExif(orientation))) gone.add('Exif (location, camera, time)');
      if (orientation !== 1) keep.push({ m: 0xE1, data: miniExif(orientation) });
    } else if (s.m === 0xE1) gone.add('XMP');
    else if (s.m === 0xED) gone.add('IPTC');
    else if (s.m === 0xFE) gone.add('comments');
    else keep.push(s);
  }
  return { out: Buffer.concat(keep.map((s) => s.data)), orientation, gone: [...gone], size: jpegSize(segs) };
}

// ---- PNG -------------------------------------------------------------------
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'iCCP', 'sRGB', 'gAMA', 'cHRM', 'cICP', 'sBIT', 'caBX', 'acTL', 'fcTL', 'fdAT']);
function pngChunks(b) {
  if (!b.subarray(0, 8).equals(PNG_SIG)) die('not a PNG: ' + src);
  const out = []; let i = 8;
  while (i < b.length) { const n = b.readUInt32BE(i); out.push({ type: b.toString('latin1', i + 4, i + 8), data: b.subarray(i, i + 12 + n) }); i += 12 + n; }
  return out;
}
function cleanPng(b) {
  const ch = pngChunks(b), gone = new Set();
  const kept = ch.filter((c) => (PNG_KEEP.has(c.type) ? true : (gone.add(c.type === 'eXIf' ? 'Exif (location, camera, time)' : c.type), false)));
  const ihdr = ch[0].data;
  return { out: Buffer.concat([PNG_SIG, ...kept.map((c) => c.data)]), gone: [...gone],
    size: [ihdr.readUInt32BE(8), ihdr.readUInt32BE(12)], alpha: [4, 6].includes(ihdr[17]) || ch.some((c) => c.type === 'tRNS') };
}
const pngOrientation = (b) => { const e = pngChunks(b).find((c) => c.type === 'eXIf'); return e ? tiffOrientation(e.data.subarray(8, e.data.length - 4)) : 1; };

// ---- run -------------------------------------------------------------------
const original = fs.readFileSync(src);
const srcKind = original.subarray(0, 8).equals(PNG_SIG) ? 'png' : original[0] === 0xFF && original[1] === 0xD8 ? 'jpeg' : 'other';
const [w0, h0] = srcKind === 'jpeg' ? jpegSize(jpegSegments(original)) : srcKind === 'png' ? cleanPng(original).size : [0, 0];
const tooBig = srcKind === 'other' || Math.max(w0, h0) > MAX;
let result;

if (outExt === '.png') {
  let file = src;
  if (srcKind !== 'png' || tooBig) {
    if (!hasSips) die('converting or resizing needs macOS sips; supply a PNG no larger than ' + MAX + 'px');
    file = path.join(work, 'a.png');
    sips('-s', 'format', 'png', ...(tooBig && srcKind !== 'other' ? ['-Z', String(MAX)] : []), src, '--out', file);
  }
  const o = pngOrientation(fs.readFileSync(file));
  if (o !== 1) {
    const turn = { 3: '180', 6: '90', 8: '270' }[o];
    if (!turn || !hasSips) die('this PNG is stored mirrored or rotated in a way that needs sips; save it as .jpg instead');
    const r = path.join(work, 'r.png'); sips('-r', turn, file, '--out', r); file = r;
  }
  result = cleanPng(fs.readFileSync(file));
  result.orientation = 1;
} else {
  let file = src;
  if (srcKind !== 'jpeg' || tooBig) {
    if (!hasSips) { if (srcKind !== 'jpeg') die('converting needs macOS sips; supply a JPEG'); warn.push('not resized: sips is not available here'); }
    else {
      file = path.join(work, 'a.jpg');
      sips('-s', 'format', 'jpeg', '-s', 'formatOptions', '82', ...(tooBig && srcKind !== 'other' ? ['-Z', String(MAX)] : []), src, '--out', file);
      if (srcKind === 'other') { const [w, h] = jpegSize(jpegSegments(fs.readFileSync(file))); if (Math.max(w, h) > MAX) sips('-Z', String(MAX), file); }
    }
  }
  result = cleanJpeg(fs.readFileSync(file));
  if (srcKind === 'png' && cleanPng(original).alpha) warn.push('the original has transparency, which JPEG cannot keep — use a .png output if that matters');
}

// ---- prove it --------------------------------------------------------------
fs.mkdirSync(path.dirname(path.resolve(dst)), { recursive: true });
fs.writeFileSync(dst, result.out);
const written = fs.readFileSync(dst);
if (outExt === '.png') {
  const left = pngChunks(written).map((c) => c.type).filter((t) => !PNG_KEEP.has(t));
  if (left.length) die('metadata survived: ' + left.join(', '));
} else {
  const segs = jpegSegments(written);
  const bad = segs.filter((s) => (s.m === 0xE1 && !(isExif(s) && s.data.equals(miniExif(result.orientation)))) || s.m === 0xED || s.m === 0xFE);
  if (bad.length) die('metadata survived in ' + dst);
}
fs.rmSync(work, { recursive: true, force: true });

const [w, h] = result.orientation >= 5 ? [result.size[1], result.size[0]] : result.size;
const kb = Math.round(written.length / 1024);
if (kb > 600) warn.push(`${kb} KB is heavy for a phone — try --max 1400`);
console.log(`✓ ${dst}`);
console.log(`  ${w} × ${h} as displayed · ${kb} KB`);
console.log(`  removed: ${result.gone.length ? result.gone.join(', ') : 'nothing — it was already clean'}`);
if (result.orientation !== 1) console.log(`  kept: rotation flag (${result.orientation}) so it stands upright`);
for (const m of warn) console.log('  ! ' + m);
console.log(`  width="${w}" height="${h}"`);
