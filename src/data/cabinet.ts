// The cabinet: every specimen on the site, in catalogue order.
// `img` is a plate in public/img, rendered by scripts/dither.mjs.

export type Specimen = {
  slug: string;
  title: string;
  kind: 'Work' | 'Essay' | 'Post' | 'Study' | 'Service' | 'Specimen' | 'Landscape' | 'Crop' | 'Workbench' | 'Drawing';
  year: string;
  medium: string;
  text: string;
  href?: string;
  link?: string;
  lang?: string;
  room?: string; // this card is a door: it leads to that section instead of opening
  place?: string; // on the desktop, the district it stands in when that is not its section
  plants?: { name: string; stage: string }[]; // the huerta, one entry per plant, for progress notes
};

// One entry per plant, all starting out the same; progress gets written here.
const sown = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ name: `${prefix} ${i + 1}`, stage: 'Growing' }));

// The phone reads the cabinet as a story: what gets made, where the work
// happened, what grows at home, what got seen and written. Slugs in reading
// order, grouped by section. The phone opens on the introduction before all of them.
// On the desktop the same sections are spread over three worlds: the home
// planet (Garden, Workshop), the one inside the computer (Projects,
// Experience, Education) and the station in orbit (Posts, Links, Gallery).
export const flow: { section: string; slugs: string[] }[] = [
  { section: 'Projects', slugs: ['ligero', 'new_dumb_iPhone', 'campanile', 'trackpad-curve', 'haskarm', 'dino_ML', 'HTTPServer_C'] },
  { section: 'Experience', slugs: ['tui', 'immune', 'afconsulting', 'fibsen', 'nuclio', 'mitx', 'uv', 'uned', 'sfl', 'caritas'] },
  { section: 'Garden', slugs: ['tomatoes', 'eggplant', 'zucchini', 'pepper', 'leek', 'lemon', 'workbench', 'drawings'] },
  { section: 'Gallery', slugs: ['pyrenees', 'moth', 'sketch-montgo', 'sketch-lemon'] },
  { section: 'Posts', slugs: ['ui-ai', 'eficiencia', 'siglo-xx'] },
];

// Things that only exist in the desktop's worlds: doors between them, and
// the networks, which stand on the station as plates.
export type Thing = { slug: string; title: string; kind: string; year: string; place: string; href?: string; room?: string };
export const worldOnly: Thing[] = [
  { slug: 'computer', title: 'The computer', kind: 'Door', year: 'Projects and work inside', place: 'Workshop', room: 'Computer' },
  { slug: 'rocket', title: 'The rocket', kind: 'Door', year: 'To the station', place: 'Launch', room: 'Station' },
  { slug: 'rocket-home', title: 'The rocket', kind: 'Door', year: 'Back home', place: 'Dock', room: 'Home' },
  { slug: 'x', title: 'X', kind: 'Link', year: '@zumodeia', place: 'Links', href: 'https://x.com/zumodeia' },
  { slug: 'tiktok', title: 'TikTok', kind: 'Link', year: '@zumodeia', place: 'Links', href: 'https://www.tiktok.com/@zumodeia' },
  { slug: 'youtube', title: 'YouTube', kind: 'Link', year: '@zumodeia', place: 'Links', href: 'https://www.youtube.com/@zumodeia' },
  { slug: 'linkedin', title: 'LinkedIn', kind: 'Link', year: 'daniel-fenoll', place: 'Links', href: 'https://www.linkedin.com/in/daniel-fenoll' },
  { slug: 'github', title: 'GitHub', kind: 'Link', year: 'F-N-LL', place: 'Links', href: 'https://github.com/F-N-LL' },
];

export const specimens: Specimen[] = [
  {
    slug: 'ligero',
    title: 'Ligero',
    kind: 'Work',
    year: '2026',
    medium: 'Kotlin, Android, on-device OCR · private',
    text: 'A light PDF reader for an e-ink Boox. Scanned book pages are split at the fold, deskewed and reflowed at a larger size, or turned into an EPUB with offline OCR.',
  },
  {
    slug: 'new_dumb_iPhone',
    title: 'new_dumb_iPhone',
    kind: 'Work',
    year: '2026',
    medium: 'Go, Logos tweak, shell, iOS 9',
    text: 'An old iPhone 4S turned into a quiet phone: a black screen, a big clock and a list of words. One script and one cable, plus a small Go bridge that brings WhatsApp back to iOS 9.',
    href: 'https://github.com/F-N-LL/new_dumb_iPhone',
    link: 'View source',
  },
  {
    slug: 'campanile',
    title: 'Campanile',
    kind: 'Work',
    year: '2026',
    medium: 'Swift, macOS menu bar, Python CI',
    text: 'The hours of prayer in the Mac menu bar: a reminder at each hour, a cross that fills in when one is due, and a quiet reader for the traditional Office, rendered daily on CI.',
    href: 'https://f-n-ll.github.io/campanile-office/',
    link: 'Visit',
  },
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
    title: 'Fullstack Software Engineer, TUI',
    kind: 'Post',
    year: 'Current',
    medium: 'AWS: Lambda, DynamoDB, S3 · Rust, Python, Vue',
    text: 'TUI Archive: 300M+ documents searched by 50,000+ people in under 200 ms, for one of Europe’s largest travel groups. Critical Lambda services in Rust, the agentic infrastructure the team works with, and the design decisions made with stakeholders.',
  },
  {
    slug: 'immune',
    title: 'Instructor, IMMUNE Technology Institute',
    kind: 'Post',
    year: '2024–25',
    medium: 'Master in Web Development · JavaScript, React, AI/ML',
    text: 'Taught dozens of students full-stack development, from JavaScript and React to AI for developers, and reviewed their code and final projects.',
  },
  {
    slug: 'afconsulting',
    title: 'Software Developer, AF Consulting',
    kind: 'Post',
    year: '2022–23',
    medium: 'Web apps, e-commerce, SEO',
    text: 'Web apps and online stores for small and medium businesses in Spain and abroad, from the client’s brief to production.',
  },
  {
    slug: 'fibsen',
    title: 'Developer & Designer, fibsen',
    kind: 'Post',
    year: '2019–20',
    medium: 'Founding team · product, brand, web',
    text: 'A water-tech startup, from the first sketches: its first digital and physical products, the brand, the website, and the pitch for its first funding.',
  },
  {
    slug: 'nuclio',
    title: 'Master in UX/UI Design & Full Stack Development',
    kind: 'Study',
    year: '2023',
    medium: 'Nuclio Digital School',
    text: 'Research, interface design and a full stack to build it on. The final project, Homezzy, matched young professionals with a place to live by profile instead of by filters.',
    place: 'Education',
  },
  {
    slug: 'uv',
    title: 'Political Science and Public Administration',
    kind: 'Study',
    year: '2014–19',
    medium: 'Universitat de València',
    text: 'Political theory, economics, statistics with SPSS, and a lot of debating. Where the habit of asking who a system is for comes from.',
    place: 'Education',
  },
  {
    slug: 'uned',
    title: 'Computer Engineering, UNED',
    kind: 'Study',
    year: 'Coursework',
    medium: 'Distance learning, alongside work, not completed',
    text: 'Algorithms, operating systems, C++ written on paper at eight in the morning. Studied to learn, not for the title.',
    place: 'Education',
  },
  {
    slug: 'mitx',
    title: 'MicroMasters, Statistics & Data Science',
    kind: 'Study',
    year: '2020',
    medium: 'MITx',
    text: 'Probability, statistics and machine learning, from the Massachusetts Institute of Technology.',
    place: 'Education',
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
    kind: 'Crop',
    year: '4 plants',
    medium: 'Solanum lycopersicum, bamboo canes, terrace',
    text: 'Four plants on bamboo canes on the terrace, photographed in early autumn while still green. Each one will get its own progress notes here.',
    plants: sown('Tomato', 4),
  },
  {
    slug: 'eggplant',
    title: 'Aubergines',
    kind: 'Crop',
    year: '2 plants',
    medium: 'Solanum melongena',
    text: 'Two plants. Progress notes for each one will appear here.',
    plants: sown('Aubergine', 2),
  },
  {
    slug: 'zucchini',
    title: 'Courgettes',
    kind: 'Crop',
    year: '2 plants',
    medium: 'Cucurbita pepo',
    text: 'Two plants, and the flowers before the fruit. Progress notes for each one will appear here.',
    plants: sown('Courgette', 2),
  },
  {
    slug: 'pepper',
    title: 'Peppers',
    kind: 'Crop',
    year: '2 plants',
    medium: 'Capsicum annuum',
    text: 'Two plants, green first and red if left alone. Progress notes for each one will appear here.',
    plants: sown('Pepper', 2),
  },
  {
    slug: 'leek',
    title: 'Leeks',
    kind: 'Crop',
    year: '6 plants',
    medium: 'Allium porrum',
    text: 'Six in a row, slow and upright. Progress notes for each one will appear here.',
    plants: sown('Leek', 6),
  },
  {
    slug: 'lemon',
    title: 'Lemon tree',
    kind: 'Crop',
    year: '1 tree',
    medium: 'Citrus limon, in a pot',
    text: 'The one tree in the huerta. Its progress will be noted here.',
    plants: sown('Lemon tree', 1),
  },
  {
    slug: 'workbench',
    title: 'The workbench',
    kind: 'Workbench',
    year: 'Open',
    medium: 'Soldering station, multimeter, oscilloscope, breadboards',
    text: 'Where the hardware side of the projects gets built: a soldering iron, a multimeter, an oscilloscope and a box of parts that is never quite enough.',
    place: 'Workshop',
  },
  {
    slug: 'drawings',
    title: 'Drawing board',
    kind: 'Drawing',
    year: 'Soon',
    medium: 'Pencil, ink, paper',
    text: 'Drawings will be pinned here.',
    place: 'Workshop',
  },
  {
    slug: 'sketch-montgo',
    title: 'Montgó from the sea',
    kind: 'Drawing',
    year: 'Placeholder',
    medium: 'Stand-in until the real drawings arrive',
    text: 'A placeholder. The gallery will hold Daniel’s own photographs and drawings.',
  },
  {
    slug: 'sketch-lemon',
    title: 'Lemon',
    kind: 'Drawing',
    year: 'Placeholder',
    medium: 'Stand-in until the real drawings arrive',
    text: 'A placeholder. The gallery will hold Daniel’s own photographs and drawings.',
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
    slug: 'sfl',
    title: 'National Coordinator, Students For Liberty',
    kind: 'Service',
    year: '2016–18',
    medium: 'Volunteer',
    text: 'Coordinated a student network across Spain: a dozen groups, several hundred people, many events.',
    place: 'Education',
  },
  {
    slug: 'caritas',
    title: 'Night food distribution, Cáritas',
    kind: 'Service',
    year: '2021–22',
    medium: 'Volunteer',
    text: 'Delivering food at night to people living on the street.',
    place: 'Education',
  },
];

export const elsewhere = [
  { label: 'GitHub', handle: 'F-N-LL', href: 'https://github.com/F-N-LL' },
  { label: 'X', handle: '@zumodeia', href: 'https://x.com/zumodeia' },
  { label: 'LinkedIn', handle: 'daniel-fenoll', href: 'https://www.linkedin.com/in/daniel-fenoll' },
  { label: 'TikTok', handle: '@zumodeia', href: 'https://www.tiktok.com/@zumodeia' },
  { label: 'YouTube', handle: '@zumodeia', href: 'https://www.youtube.com/@zumodeia' },
  { label: 'Email', handle: 'dfenollapps@gmail.com', href: 'mailto:dfenollapps@gmail.com' },
  { label: 'CV', handle: 'PDF, one page', href: '/Daniel-Fenoll-CV.pdf' },
];

// What the juice box says. The tour plays once; after that, a hello.
export const cicerone = {
  intro: [
    'Hi! I’m Zumo, the juice box of zumodeia, and the cicerone of this site.',
    'I’ll show you Daniel’s universe. Here at home: the huerta, the workbench and the computer.',
    'Projects and work live inside the computer. Posts, links and pictures are up on the station: take the rocket.',
    'Drag or use the arrow keys to walk. Click a thing, or press Enter by it, to open it. Keys 1 to 5 jump around.',
  ],
  back: 'Welcome back! Click me for the tour again.',
  places: {
    Computer: 'Inside the computer: projects, work, and the studies in a corner.',
    Station: 'The station: posts, links and the gallery. The rocket takes you home.',
    Home: 'Home again.',
  } as Record<string, string>,
};
