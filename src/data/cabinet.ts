// The cabinet: every specimen on the site, in catalogue order.
// `img` is a plate in public/img, rendered by scripts/dither.mjs.

export type Specimen = {
  slug: string;
  title: string;
  kind: 'Work' | 'Essay' | 'Post' | 'Study' | 'Service' | 'Specimen' | 'Landscape' | 'Pigments' | 'Correspondence';
  year: string;
  medium: string;
  text: string;
  href?: string;
  link?: string;
  lang?: string;
};

// The phone reads the cabinet as a story: who, what gets made, where the work
// happened, what got written. Slugs in reading order, grouped by section.
export const flow: { section: string; slugs: string[] }[] = [
  { section: 'About', slugs: ['pyrenees', 'tomatoes', 'moth', 'spider', 'pigments', 'correspondence'] },
  { section: 'Projects', slugs: ['trackpad-curve', 'haskarm', 'dino_ML', 'HTTPServer_C'] },
  { section: 'Experience', slugs: ['tui', 'uned', 'mitx', 'sfl', 'caritas'] },
  { section: 'Posts', slugs: ['ui-ai', 'eficiencia', 'siglo-xx'] },
];

export const specimens: Specimen[] = [
  {
    slug: 'trackpad-curve',
    title: 'trackpad-curve',
    kind: 'Work',
    year: '2026',
    medium: 'C, libinput adapter, Niri',
    text: 'Speed-dependent cursor and two-finger scroll curves for Niri on Linux. Slow movements stay precise; fast ones travel farther. Nothing in the system is replaced.',
    href: 'https://github.com/F-N-LL/trackpad-curve',
    link: 'View source',
  },
  {
    slug: 'haskarm',
    title: 'haskarm',
    kind: 'Work',
    year: '2025',
    medium: 'Haskell, OpenCV, ESP32-CAM, servo',
    text: 'A camera finds your hand; a servo turns to follow it. Python sees, Haskell decides, an ESP32 moves.',
    href: 'https://github.com/F-N-LL/haskarm',
    link: 'View source',
  },
  {
    slug: 'dino_ML',
    title: 'dino_ML',
    kind: 'Work',
    year: '2024',
    medium: 'Python, machine learning',
    text: 'The Chrome dino runner, rebuilt with learning layers to crack the high score.',
    href: 'https://github.com/F-N-LL/dino_ML',
    link: 'View source',
  },
  {
    slug: 'HTTPServer_C',
    title: 'HTTPServer_C',
    kind: 'Work',
    year: '2024',
    medium: 'C, sockets, HTTP/1.1',
    text: 'An HTTP server written from scratch in C: structs, sockets, parsing, responses, and every error along the way.',
    href: 'https://github.com/F-N-LL/HTTPServer_C',
    link: 'View source',
  },
  {
    slug: 'ui-ai',
    title: 'The Crucial Role of Effective UI in AI Applications',
    kind: 'Essay',
    year: '2023',
    medium: 'Essay, English',
    text: 'Effective interfaces make complex models legible, build trust, and keep people in control.',
    href: 'https://www.linkedin.com/pulse/crucial-role-effective-ui-design-ai-applications-fenoll-',
    link: 'Read',
  },
  {
    slug: 'eficiencia',
    title: 'Paradigmas de Eficiencia (I)',
    kind: 'Essay',
    year: '2020',
    medium: 'Essay, Spanish',
    text: 'On the proxy routines we run for the meaning of everyday words, efficiency first among them.',
    href: 'https://es.linkedin.com/pulse/paradigmas-de-eficiencia-i-daniel-fenoll-castro',
    link: 'Read',
    lang: 'es',
  },
  {
    slug: 'siglo-xx',
    title: 'Enterrando el siglo XX',
    kind: 'Essay',
    year: '2020',
    medium: 'Essay, Spanish',
    text: 'Burying the twentieth century: nature, and the nature of technology.',
    href: 'https://es.linkedin.com/pulse/enterrando-el-siglo-xx-la-naturaleza-y-de-tecnolog%C3%ADa-fenoll-castro',
    link: 'Read',
    lang: 'es',
  },
  {
    slug: 'tui',
    title: 'Software Engineer, TUI',
    kind: 'Post',
    year: 'Current',
    medium: 'AWS: Lambda, DynamoDB, IAM · JavaScript',
    text: 'Cloud and backend systems for one of Europe’s largest travel groups.',
  },
  {
    slug: 'uned',
    title: 'Computer Engineering, UNED',
    kind: 'Study',
    year: '—',
    medium: 'Distance learning, alongside work',
    text: 'Algorithms, operating systems, C++ written on paper at eight in the morning. Studied to learn, not for the title.',
  },
  {
    slug: 'mitx',
    title: 'MicroMasters, Statistics & Data Science',
    kind: 'Study',
    year: '2020',
    medium: 'MITx',
    text: 'Probability, statistics and machine learning, from the Massachusetts Institute of Technology.',
  },
  {
    slug: 'pyrenees',
    title: 'Untitled (Pyrenees)',
    kind: 'Landscape',
    year: '2026',
    medium: 'Photograph, ordered dither',
    text: 'Pasture, a fence line, a white house with a red roof. The mountains are where the mosaic comes from.',
  },
  {
    slug: 'tomatoes',
    title: 'Tomatoes',
    kind: 'Specimen',
    year: '2026',
    medium: 'Solanum lycopersicum, bamboo canes, terrace',
    text: 'The huerta, early autumn. Two plants on bamboo canes, still green.',
  },
  {
    slug: 'moth',
    title: 'Moth',
    kind: 'Specimen',
    year: '2026',
    medium: 'Found on a wall, Alicante',
    text: 'One of the day’s visitors to the huerta.',
  },
  {
    slug: 'spider',
    title: 'Spider',
    kind: 'Specimen',
    year: '2026',
    medium: 'Found on a wall, Alicante',
    text: 'Another visitor to the huerta, the same day.',
  },
  {
    slug: 'pigments',
    title: 'Pompeii',
    kind: 'Pigments',
    year: '2026',
    medium: 'Pompeian red, Roman ochre, olive bronze, volcanic charcoal, Aegean blue, fresco cream',
    text: 'A palette taken from the frescoes of Pompeii, made for the house. Every plate in this cabinet is printed in these six colours and nothing else.',
  },
  {
    slug: 'sfl',
    title: 'National Coordinator, Students For Liberty',
    kind: 'Service',
    year: '2016–18',
    medium: 'Volunteer',
    text: 'Coordinated a student network across Spain: a dozen groups, several hundred people, many events.',
  },
  {
    slug: 'caritas',
    title: 'Night food distribution, Cáritas',
    kind: 'Service',
    year: '2021–22',
    medium: 'Volunteer',
    text: 'Delivering food at night to people living on the street.',
  },
  {
    slug: 'correspondence',
    title: 'Correspondence',
    kind: 'Correspondence',
    year: 'Open',
    medium: 'dfenollapps@gmail.com',
    text: 'For work, questions, or tomatoes.',
    href: 'mailto:dfenollapps@gmail.com',
    link: 'Write',
  },
];

export const elsewhere = [
  { label: 'GitHub', handle: 'F-N-LL', href: 'https://github.com/F-N-LL' },
  { label: 'X', handle: '@daniel0xFC', href: 'https://x.com/daniel0xFC' },
  { label: 'LinkedIn', handle: 'daniel-fenoll', href: 'https://www.linkedin.com/in/daniel-fenoll' },
  { label: 'Email', handle: 'dfenollapps@gmail.com', href: 'mailto:dfenollapps@gmail.com' },
];
