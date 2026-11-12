// The way back: decrypts public/house.sealed.json with the password into
// private/house.recovered.js (compiled, minified JavaScript), should the
// private source ever be lost.   node scripts/unseal-house.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const key = process.env.HOUSE_KEY ?? readFileSync(new URL('../private/.house-key', import.meta.url), 'utf8').replace(/\n$/, '');
const box = JSON.parse(readFileSync(new URL('../public/house.sealed.json', import.meta.url), 'utf8'));
const bytes = (b) => new Uint8Array(Buffer.from(b, 'base64'));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), 'PBKDF2', false, ['deriveKey']);
const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(box.salt), iterations: box.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(box.iv) }, aes, bytes(box.data));
mkdirSync(new URL('../private/', import.meta.url), { recursive: true });
writeFileSync(new URL('../private/house.recovered.js', import.meta.url), Buffer.from(plain));
console.log('unsealed into private/house.recovered.js');
