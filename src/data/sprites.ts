// 8-bit bitmaps. Letters map to CSS colours in each palette.

// Hanko seal with a pixel "DF", stamped in Pompeian red.
export const seal = [
  '.#############.',
  '###############',
  '###############',
  '###############',
  '##oooo##ooooo##',
  '##o###o#o######',
  '##o###o#o######',
  '##o###o#oooo###',
  '##o###o#o######',
  '##o###o#o######',
  '##oooo##o######',
  '###############',
  '###############',
  '###############',
  '.#############.',
];
export const sealPalette = { '#': 'var(--accent)', o: 'var(--bg)' };

// A tomato from the huerta.
export const tomato = [
  '.....g.g.....',
  '......gg.....',
  '....ggggg....',
  '..rrgg.ggrr..',
  '.rrrrrrrrrrr.',
  'rrhhrrrrrrrrr',
  'rrhrrrrrrrrrd',
  'rrrrrrrrrrrrd',
  'rrrrrrrrrrrdd',
  '.rrrrrrrrrdd.',
  '..rrrrrrddd..',
  '....ddddd....',
];
export const tomatoPalette = {
  r: 'var(--accent)',
  d: 'var(--accent-deep)',
  h: 'var(--bg)',
  g: 'var(--olive)',
};
