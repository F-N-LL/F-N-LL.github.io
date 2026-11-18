// What the computer on the desk holds: one folder per job. Opening a folder
// shows its factory, the work laid out as machines joined by belts, the way a
// factory game draws a production line. A folder with no `plant` yet shows a
// placeholder.

export type Machine = {
  id: string;
  name: string; // on the machine, short
  sub: string; // under it, in small type
  icon: 'docs' | 'rust' | 'vault' | 'lens' | 'screen' | 'brain' | 'pen' | 'people' | 'chat' | 'crate';
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

export type Folder = {
  slug: string;
  name: string; // on the folder
  title: string;
  org: string;
  period: string;
  stack?: string[];
  lead?: string;
  stats?: { value: string; label: string }[];
  plant?: { machines: Machine[]; belts: Belt[] };
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
  { slug: 'immune', name: 'IMMUNE', title: 'Instructor, Master in Web Development', org: 'IMMUNE Technology Institute', period: 'Feb 2024 – Apr 2025' },
  { slug: 'afconsulting', name: 'AF Consulting', title: 'Software Developer', org: 'AF Consulting', period: 'Jun 2022 – Sep 2023' },
  { slug: 'fibsen', name: 'fibsen', title: 'Developer & Designer, founding team', org: 'fibsen', period: 'Jun 2019 – Jan 2020' },
];
