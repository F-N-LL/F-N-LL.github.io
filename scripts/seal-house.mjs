// Seals the flat: compiles private/house.ts and encrypts it into
// public/house.sealed.json, so the published site carries only ciphertext.
// The key comes from the password (PBKDF2-SHA256, 310 000 rounds) and the
// cipher is AES-256-GCM; without the password the file is noise, and a wrong
// one fails the GCM check. The password is read from private/.house-key, or
// from HOUSE_KEY. Run it after changing the house:  node scripts/seal-house.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { transform } from 'esbuild';

const key = process.env.HOUSE_KEY ?? readFileSync(new URL('../private/.house-key', import.meta.url), 'utf8').replace(/\n$/, '');
if (key.length < 12) throw new Error('the house password should be long');
const ts = readFileSync(new URL('../private/house.ts', import.meta.url), 'utf8');
const { code } = await transform(ts, { loader: 'ts', format: 'esm', target: 'es2022', minify: true });

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const iter = 310_000;
const base = await crypto.subtle.importKey('raw', enc.encode(key), 'PBKDF2', false, ['deriveKey']);
const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, enc.encode(code)));
const b64 = (u) => Buffer.from(u).toString('base64');
writeFileSync(new URL('../public/house.sealed.json', import.meta.url), JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), data: b64(data) }));
console.log(`sealed ${code.length} bytes of house into public/house.sealed.json`);
