import { readFile } from 'node:fs/promises';
import type { APIRoute, GetStaticPaths } from 'astro';
import { PIGMENTS } from '../../data/pigments';

// The favicon's juice box, recoloured: the carton takes one palette pigment,
// its shaded side the same pigment darkened. Used by the desktop floor.
const hex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export const getStaticPaths = (() => Object.keys(PIGMENTS).map((tone) => ({ params: { tone } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const rgb = PIGMENTS[params.tone!];
  const svg = (await readFile('public/favicon.svg', 'utf8'))
    .replaceAll('#9a6a2c', hex(rgb.map((v) => v * 0.78)))
    .replaceAll('#c58a3d', hex(rgb));
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
