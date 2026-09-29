// All site content lives here. Edit this file to update the page.

export const profile = {
  name: 'Daniel Fenoll',
  kana: 'ダニエル',
  roles: ['Software engineer', 'Designer', 'AI enjoyer', 'Gardener'],
  location: 'Alicante, Spain',
  motto: 'The pursuit of excellence does not need justification.',
  about: [
    'I’m a software engineer from Alicante. I build cloud and backend systems on AWS at TUI, and I design the interfaces I’d want to use myself.',
    'I like clean systems, good type and slow craft: a C server written from scratch, a servo arm that follows you around the room, a trackpad that finally feels right. When the terminal lets me go, I’m in the huerta with the tomatoes.',
  ],
  now: ['Shipping on AWS at TUI', 'Tending the huerta', 'Pair-programming with Claude'],
};

export const links = [
  { label: 'GitHub', handle: 'F-N-LL', href: 'https://github.com/F-N-LL' },
  { label: 'X', handle: '@daniel0xFC', href: 'https://x.com/daniel0xFC' },
  { label: 'LinkedIn', handle: 'daniel-fenoll', href: 'https://www.linkedin.com/in/daniel-fenoll' },
  { label: 'Email', handle: 'dfenollapps@gmail.com', href: 'mailto:dfenollapps@gmail.com' },
];

// TODO: add the earlier roles (company, title, years). LinkedIn hides them from logged-out visitors.
export const work = [
  {
    period: 'Now',
    title: 'Software Engineer',
    org: 'TUI',
    note: 'Cloud and backend on AWS (Lambda, DynamoDB, IAM) and JavaScript frameworks for one of Europe’s largest travel groups.',
  },
];

export const education = [
  { period: '', title: 'Computer Engineering', org: 'UNED' },
  { period: '2020', title: 'MicroMasters, Statistics & Data Science', org: 'MITx' },
];

export const volunteering = [
  { period: '2021–22', title: 'Volunteer, night food distribution', org: 'Cáritas' },
  { period: '2016–18', title: 'National Coordinator', org: 'Students For Liberty' },
];

export const projects = [
  {
    name: 'trackpad-curve',
    year: '2026',
    lang: 'C',
    href: 'https://github.com/F-N-LL/trackpad-curve',
    note: 'Speed-dependent cursor and two-finger scroll curves for Niri touchpads.',
  },
  {
    name: 'haskarm',
    year: '2025',
    lang: 'Nix · CV',
    href: 'https://github.com/F-N-LL/haskarm',
    note: 'Computer vision tracks a target and a servo arm points at it.',
  },
  {
    name: 'dino_ML',
    year: '2024',
    lang: 'Python',
    href: 'https://github.com/F-N-LL/dino_ML',
    note: 'The Chrome dino runner, rebuilt with ML layers to crack the high score.',
  },
  {
    name: 'HTTPServer_C',
    year: '2024',
    lang: 'C',
    href: 'https://github.com/F-N-LL/HTTPServer_C',
    note: 'An HTTP server written from scratch in C: sockets, parsing, responses.',
  },
];

export const writing = [
  {
    title: 'The Crucial Role of Effective UI in AI Applications',
    date: '2023',
    href: 'https://www.linkedin.com/pulse/crucial-role-effective-ui-design-ai-applications-fenoll-',
  },
  {
    title: 'Paradigmas de Eficiencia (I)',
    date: '2020',
    lang: 'ES',
    href: 'https://es.linkedin.com/pulse/paradigmas-de-eficiencia-i-daniel-fenoll-castro',
  },
  {
    title: 'Enterrando el siglo XX: la naturaleza y la naturaleza de la tecnología',
    date: '2020',
    lang: 'ES',
    href: 'https://es.linkedin.com/pulse/enterrando-el-siglo-xx-la-naturaleza-y-de-tecnolog%C3%ADa-fenoll-castro',
  },
];
