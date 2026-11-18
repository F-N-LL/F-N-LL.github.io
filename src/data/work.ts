// What the computer on the desk holds: one folder per job. Opening a folder
// shows the work as a small game screen: a `plant` is a factory, machines
// joined by belts the way a factory game draws a production line; a `map` is a
// world map, levels along a road that the students walk. A folder with
// neither yet shows a placeholder.

export type Machine = {
  id: string;
  name: string; // on the machine, short
  sub: string; // under it, in small type
  icon: 'docs' | 'rust' | 'vault' | 'lens' | 'screen' | 'brain' | 'pen' | 'people' | 'chat' | 'crate' | 'flag' | 'book' | 'atom' | 'trophy' | 'branch' | 'hex' | 'check' | 'rocket';
  x: number; // grid cell of its top-left corner (the grid is 30 × 15)
  y: number;
  w?: number; // in cells, 5 if left out
  h?: number; // in cells, 3 if left out
  tone?: 'ochre' | 'blue' | 'olive' | 'red' | 'cream';
  text: string; // what it does, and what I did there
  result?: string; // what it puts out
};
// A belt runs through grid points; items ride it from the first to the last.
export type Belt = { from: string; to: string; path: [number, number][]; slow?: boolean };
// On a world map: the worlds are tinted ground, the levels are machines (2 × 2
// unless told otherwise) and the road runs through them; side roads lead off it.
export type World = { name: string; sub: string; x: number; y: number; w: number; h: number; tone: 'ochre' | 'blue' | 'olive' | 'red' };
export type WorldMap = { worlds: World[]; levels: Machine[]; road: [number, number][]; sides: [number, number][][]; walkers: number };

export type Folder = {
  slug: string;
  name: string; // on the folder
  title: string;
  org: string;
  period: string;
  stack?: string[];
  lead?: string;
  stats?: { value: string; label: string }[];
  hint?: string; // what the inspector says before anything is picked
  plant?: { machines: Machine[]; belts: Belt[] };
  map?: WorldMap;
};

export const folders: Folder[] = [
  {
    slug: 'tui',
    name: 'TUI',
    title: 'Fullstack Software Engineer',
    org: 'TUI Group',
    period: 'Jun 2024 – now',
    stack: ['Rust', 'Python', 'Vue', 'Vuetify', 'AWS Lambda', 'DynamoDB', 'S3', 'OpenSearch', 'Amazon Bedrock', 'GitLab CI', 'Docker'],
    lead: 'TUI Archive, built from scratch: the first document archive the TUI Group runs itself, for every one of its more than a thousand companies, and the platform its AI and HR services plug into.',
    stats: [
      { value: '300M+', label: 'documents' },
      { value: '50,000+', label: 'users' },
      { value: '1,000+', label: 'companies' },
      { value: '<200 ms', label: 'search' },
    ],
    hint: 'Documents come in from the companies, get screened, filed and searched; the AI works on top of the archive, and the pipeline ships it all.',
    plant: {
      machines: [
        {
          id: 'companies',
          name: 'TUI Group',
          sub: 'Every company',
          icon: 'docs',
          x: 1,
          y: 2,
          tone: 'cream',
          text: 'Every kind of document from every company in the group: airlines, hotels, cruise lines and tour operators among them. One archive for all of it.',
          result: '1,000+ companies',
        },
        {
          id: 'ingest',
          name: 'Ingest',
          sub: 'Rust on Lambda',
          icon: 'rust',
          x: 8,
          y: 2,
          tone: 'red',
          text: 'Critical services in Rust on AWS Lambda: they screen what comes in and keep fallbacks ready for the services around them. The group used to pay outside providers for this; it is the first time it is done in-house.',
          result: 'Built in-house',
        },
        {
          id: 'store',
          name: 'Archive',
          sub: 'S3 · DynamoDB',
          icon: 'vault',
          x: 15,
          y: 2,
          tone: 'ochre',
          text: 'From scratch: S3 keeps the files, DynamoDB the record of each one, with retention rules and access behind IAM.',
          result: '300M+ documents',
        },
        {
          id: 'search',
          name: 'Search',
          sub: 'OpenSearch · RAG',
          icon: 'lens',
          x: 22,
          y: 2,
          tone: 'blue',
          text: 'OpenSearch underneath: search across large documents, natural-language search, and the retrieval (RAG) the AI reads from.',
          result: 'Under 200 ms',
        },
        {
          id: 'front',
          name: 'Web portal',
          sub: 'Vue · Vuetify',
          icon: 'screen',
          x: 22,
          y: 8,
          tone: 'cream',
          text: 'The portal, from scratch in Vue and Vuetify, just upgraded to Vuetify 4.2. Its product and design decided with the stakeholders, from the first conversation to production.',
          result: '50,000+ users',
        },
        {
          id: 'agents',
          name: 'AI infra',
          sub: 'Amazon Bedrock',
          icon: 'brain',
          x: 15,
          y: 8,
          tone: 'olive',
          text: 'The AI layer, on Amazon Bedrock: the agentic infrastructure the development team builds with, and the agents that plug into the archive.',
          result: 'For the whole team',
        },
        {
          id: 'contracts',
          name: 'Contracts',
          sub: 'Agent',
          icon: 'pen',
          x: 7,
          y: 6.5,
          h: 2,
          tone: 'olive',
          text: 'Contract management end to end: it drafts the documents, answers questions about them and keeps track of each one.',
        },
        {
          id: 'hr',
          name: 'HR',
          sub: 'OCR · AI',
          icon: 'people',
          x: 7,
          y: 9,
          h: 2,
          tone: 'olive',
          text: 'OCR and AI anonymise documents before they go into HR processes.',
        },
        {
          id: 'support',
          name: 'App support',
          sub: 'Agent',
          icon: 'chat',
          x: 7,
          y: 11.5,
          h: 2,
          tone: 'olive',
          text: 'Helps developers and users work out what went wrong, and files the report when one is needed.',
        },
        {
          id: 'pipeline',
          name: 'Pipeline',
          sub: 'GitLab CI · Docker',
          icon: 'crate',
          x: 0.5,
          y: 7,
          w: 5.5,
          tone: 'cream',
          text: 'Everything ships through GitLab CI/CD in Docker containers: eight to ten repositories behind the archive, more than a million lines of code.',
          result: '1M+ lines of code',
        },
      ],
      belts: [
        { from: 'companies', to: 'ingest', path: [[6, 3.5], [8, 3.5]] },
        { from: 'ingest', to: 'store', path: [[13, 3.5], [15, 3.5]] },
        { from: 'store', to: 'search', path: [[20, 3.5], [22, 3.5]] },
        { from: 'search', to: 'front', path: [[24.5, 5], [24.5, 8]] },
        { from: 'store', to: 'agents', path: [[17.5, 5], [17.5, 8]], slow: true },
        { from: 'agents', to: 'contracts', path: [[15, 8.6], [13.5, 8.6], [13.5, 7.5], [12, 7.5]], slow: true },
        { from: 'agents', to: 'hr', path: [[15, 10], [12, 10]], slow: true },
        { from: 'agents', to: 'support', path: [[16.5, 11], [16.5, 12.5], [12, 12.5]], slow: true },
        { from: 'pipeline', to: 'ingest', path: [[3.25, 7], [3.25, 6], [10.5, 6], [10.5, 5]], slow: true },
      ],
    },
  },
  {
    slug: 'immune',
    name: 'IMMUNE',
    title: 'Instructor, Master in Web Development',
    org: 'IMMUNE Technology Institute',
    period: 'Feb 2024 – Apr 2025',
    stack: ['JavaScript', 'React', 'Node', 'Git', 'Testing', 'OpenAI', 'Claude', 'Mistral'],
    lead: 'Three online modules of a month each, designed from scratch: JavaScript, React and AI for developers. Thirty students in two cohorts, of every background and age.',
    stats: [
      { value: '30', label: 'students' },
      { value: '2', label: 'cohorts' },
      { value: '3', label: 'modules' },
      { value: '1 mo', label: 'each, online' },
    ],
    hint: 'The road through the master: a world a month, with stops along the way, and the final project at the end. The students are the ones walking it.',
    map: {
      worlds: [
        { name: 'World 1', sub: 'JavaScript · month 1', x: 3.5, y: 1.5, w: 6.5, h: 8, tone: 'ochre' },
        { name: 'World 2', sub: 'React · month 2', x: 10.5, y: 1.5, w: 6.5, h: 8, tone: 'blue' },
        { name: 'World 3', sub: 'AI for devs · month 3', x: 17.5, y: 1.5, w: 6.5, h: 8, tone: 'olive' },
      ],
      levels: [
        {
          id: 'enrol',
          name: 'Start',
          sub: '30 students',
          icon: 'flag',
          x: 1,
          y: 6,
          tone: 'cream',
          text: 'Thirty students in two cohorts, of every background and age, all starting from the same place.',
          result: '2 cohorts',
        },
        {
          id: 'js',
          name: 'JavaScript',
          sub: 'Month 1',
          icon: 'book',
          x: 6,
          y: 4,
          tone: 'ochre',
          text: 'The language from the ground up, in a month of live online classes. Designed from scratch.',
          result: 'The foundations',
        },
        {
          id: 'react',
          name: 'React',
          sub: 'Month 2',
          icon: 'atom',
          x: 13,
          y: 6,
          tone: 'blue',
          text: 'Building interfaces with React: components, state and whole applications. Designed from scratch.',
          result: 'Real interfaces',
        },
        {
          id: 'ai',
          name: 'AI for devs',
          sub: 'Month 3',
          icon: 'brain',
          x: 20,
          y: 4,
          tone: 'olive',
          text: 'Working with model APIs and building apps with LLMs inside them, across OpenAI, Claude and Mistral. Designed from scratch.',
          result: 'OpenAI · Claude · Mistral',
        },
        {
          id: 'final',
          name: 'Final project',
          sub: 'Code review',
          icon: 'trophy',
          x: 25.5,
          y: 5,
          w: 3,
          h: 3,
          tone: 'red',
          text: 'Each student’s own project, the code reviewed along the way and the work reviewed at the end.',
          result: 'Every project reviewed',
        },
        { id: 'git', name: 'Git', sub: 'Along the way', icon: 'branch', x: 4, y: 11.5, tone: 'cream', text: 'Version control with Git, part of the work from the start.' },
        { id: 'node', name: 'Node', sub: 'Along the way', icon: 'hex', x: 8, y: 11.5, tone: 'cream', text: 'JavaScript on the server, with Node.' },
        { id: 'testing', name: 'Testing', sub: 'Along the way', icon: 'check', x: 12, y: 11.5, tone: 'cream', text: 'Testing the code they write.' },
        { id: 'deploy', name: 'Deploy', sub: 'Along the way', icon: 'rocket', x: 16, y: 11.5, tone: 'cream', text: 'Putting their work online for others to use.' },
      ],
      road: [[2, 7], [4.5, 7], [4.5, 5], [7, 5], [10.5, 5], [10.5, 7], [14, 7], [17.5, 7], [17.5, 5], [21, 5], [24, 5], [24, 6.5], [27, 6.5]],
      sides: [
        [[5, 11.5], [5, 10.4], [4.5, 10.4], [4.5, 7]],
        [[9, 11.5], [9, 10.4], [10.5, 10.4], [10.5, 7]],
        [[13, 11.5], [13, 10.4], [14, 10.4], [14, 8]],
        [[17, 11.5], [17, 10.4], [17.5, 10.4], [17.5, 7]],
      ],
      walkers: 8,
    },
  },
  { slug: 'afconsulting', name: 'AF Consulting', title: 'Software Developer', org: 'AF Consulting', period: 'Jun 2022 – Sep 2023' },
  { slug: 'fibsen', name: 'fibsen', title: 'Developer & Designer, founding team', org: 'fibsen', period: 'Jun 2019 – Jan 2020' },
];
