// All site content lives here. Edit this file to update the page.

export const profile = {
  name: 'Daniel Fenoll',
  kana: 'ダニエル・フェノル',
  roles: ['Senior software engineer', 'Designer', 'AI enjoyer', 'Gardener'],
  location: 'Alicante, Spain',
  motto: 'The pursuit of excellence does not need justification.',
  statement:
    'Senior software engineer in Alicante. Building TUI Archive (300M+ documents, 50,000+ users) in Rust, Python and AWS, small tools for the desk, and a garden on the terrace.',
  about: [
    'I’m a senior software engineer from Alicante. At TUI I build TUI Archive and the agentic infrastructure my team works with, in Rust, Python and AWS, and I design the interfaces I’d want to use myself.',
    'I like clean systems, good type and slow craft: a C server written from scratch, a servo that turns to follow your hand, a trackpad that finally feels right. When the terminal lets me go, I’m in the huerta with the tomatoes.',
  ],
  now: ['Shipping on AWS at TUI', 'Tending the huerta', 'Pair-programming with Claude'],
};

export const links = [
  { label: 'GitHub', handle: 'F-N-LL', href: 'https://github.com/F-N-LL' },
  { label: 'X', handle: '@zumodeia', href: 'https://x.com/zumodeia' },
  { label: 'LinkedIn', handle: 'daniel-fenoll', href: 'https://www.linkedin.com/in/daniel-fenoll' },
  { label: 'Email', handle: 'dfenollapps@gmail.com', href: 'mailto:dfenollapps@gmail.com' },
  { label: 'CV', handle: 'PDF, one page', href: '/Daniel-Fenoll-CV.pdf' },
];

export const work = [
  {
    period: 'Now',
    title: 'Fullstack Software Engineer',
    org: 'TUI',
    note: 'TUI Archive: 300M+ documents for 50,000+ users. Critical Lambda services in Rust, agentic infrastructure for the team.',
  },
  { period: '2024–25', title: 'Instructor, Master in Web Development', org: 'IMMUNE Technology Institute', note: 'JavaScript, React and AI/ML for developers.' },
  { period: '2022–23', title: 'Software Developer', org: 'AF Consulting', note: 'Web apps and online stores for SMEs.' },
  { period: '2019–20', title: 'Developer & Designer, founding team', org: 'fibsen', note: 'First products and brand of a water-tech startup.' },
];

export const education = [
  { period: '2023', title: 'Master in UX/UI Design & Full Stack Development', org: 'Nuclio Digital School' },
  { period: '2020', title: 'MicroMasters, Statistics & Data Science', org: 'MITx' },
  { period: '2014–19', title: 'Political Science and Public Administration', org: 'Universitat de València' },
  { period: '', title: 'Computer Engineering (coursework)', org: 'UNED' },
];

export const volunteering = [
  { period: '2021–22', title: 'Volunteer, night food distribution', org: 'Cáritas' },
  { period: '2016–18', title: 'National Coordinator', org: 'Students For Liberty' },
];

export const projects = [
  {
    name: 'Ligero',
    year: '2026',
    lang: 'Kotlin',
    medium: 'Kotlin, Android, on-device OCR',
    note: 'A light PDF reader for e-ink Android: reflows scanned pages, converts them to EPUB with offline OCR.',
  },
  {
    name: 'new_dumb_iPhone',
    year: '2026',
    lang: 'Go',
    medium: 'Go, Logos tweak, shell, iOS 9',
    href: 'https://github.com/F-N-LL/new_dumb_iPhone',
    note: 'An old iPhone 4S turned into a Light Phone style dumb phone, with a Go WhatsApp bridge.',
  },
  {
    name: 'Campanile',
    year: '2026',
    lang: 'Swift',
    medium: 'Swift, macOS menu bar, Python CI',
    href: 'https://f-n-ll.github.io/campanile-office/',
    note: 'Prayer reminders and a quiet reader in the Mac menu bar.',
  },
  {
    name: 'trackpad-curve',
    year: '2026',
    lang: 'C',
    medium: 'C, libinput adapter, Niri',
    href: 'https://github.com/F-N-LL/trackpad-curve',
    note: 'Speed-dependent cursor and two-finger scroll curves for Niri touchpads.',
  },
  {
    name: 'haskarm',
    year: '2025',
    lang: 'Nix · CV',
    medium: 'Haskell, OpenCV, ESP32-CAM, servo',
    href: 'https://github.com/F-N-LL/haskarm',
    note: 'A camera finds your hand; a servo turns to follow it.',
  },
  {
    name: 'dino_ML',
    year: '2024',
    lang: 'Python',
    medium: 'Python, machine learning',
    href: 'https://github.com/F-N-LL/dino_ML',
    note: 'The Chrome dino runner, rebuilt with ML layers to crack the high score.',
  },
  {
    name: 'HTTPServer_C',
    year: '2024',
    lang: 'C',
    medium: 'C, sockets, HTTP/1.1',
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
