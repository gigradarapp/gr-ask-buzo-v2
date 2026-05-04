export type BuzoEvent = {
  id: string
  title: string
  venue: string
  district: string
  time: string
  endTime: string
  genre: string
  vibeTags: string[]
  ticketPrice: number
  verified: number
  socialProof: string
  activitySignal: string
  crowdSignal: string
  image: string
  eventUrl?: string
  legitimacyNote?: string
  whyGo: string[]
  riskNotes: string[]
}

export type QuickPrompt = {
  label: string
  prompt: string
}

export const quickPrompts: QuickPrompt[] = [
  {
    label: 'Create a new night',
    prompt: 'Something good tonight near central Singapore under $50',
  },
  {
    label: 'Inspire me where to go',
    prompt: 'Surprise me with one night out that feels worth it',
  },
  {
    label: 'Date night',
    prompt: 'Plan a low-key date night with live music and cocktails under $80',
  },
  {
    label: 'Dance all night',
    prompt: 'Start chill, end with hard techno around Marina Bay',
  },
  {
    label: 'Bring friends',
    prompt: 'Where should a mixed group go tonight if some want drinks and some want music?',
  },
  {
    label: 'Under $50',
    prompt: 'Credible gigs tonight under $50 with no door surprises',
  },
]

export type SpotlightNight = {
  title: string
  subtitle: string
  prompt: string
  image: string
}

export const spotlightNights: SpotlightNight[] = [
  {
    title: 'Friends - Marina Bay crawl',
    subtitle: 'Drinks first, dance later',
    prompt: 'Where should a mixed group go tonight near Marina Bay if we want drinks first and dancing later?',
    image:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Couples - Jazz and cocktails',
    subtitle: 'Low-key, warm, under $80',
    prompt: 'Plan a low-key date night with live music and cocktails under $80',
    image:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: 'Solo - Late neon',
    subtitle: 'One strong stop, no chaos',
    prompt: 'I am solo tonight. Give me one credible late-night move that feels safe and worth it',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85',
  },
]

export const landingPillars = [
  {
    title: 'Tailor-made',
    body: 'Mood, budget, area, and who you are with shape the plan.',
  },
  {
    title: 'Cheaper',
    body: 'Clear entry expectations and backups before you commit.',
  },
  {
    title: 'Hidden gems',
    body: 'Smaller rooms, off-path gigs, and signals worth the detour.',
  },
  {
    title: 'No surprises',
    body: 'Timing, crowd risk, and legitimacy notes are part of the answer.',
  },
]

export const clarityReplies = [
  { label: 'Low-key', value: 'low-key live music and drinks under $50' },
  { label: 'Dance', value: 'dance night with high energy after 10pm' },
  { label: 'Date night', value: 'date night with atmosphere and easy conversation' },
  { label: 'Group night', value: 'group night with social proof and easy meetup flow' },
]

export const events: BuzoEvent[] = [
  {
    id: 'blue-note-session',
    title: 'The Blue Note Session',
    venue: 'BeBop Lounge',
    district: 'Tiong Bahru',
    time: '22:00',
    endTime: '00:30',
    genre: 'Jazz',
    vibeTags: ['Intimate', 'Vinyl audio', 'Low-key'],
    ticketPrice: 35,
    verified: 94,
    socialProof: 'Sarah and 3 similar-taste people saved this',
    activitySignal: 'Lineup reposted 2h ago, venue replies active',
    crowdSignal: 'Small room, seated edges, easy conversation before the second set',
    image:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=85',
    whyGo: [
      'Fits a low-key music mood without feeling sleepy.',
      'Entry stays under the common $50 ceiling.',
      'The room has enough signal to trust, but not enough hype to feel chaotic.',
    ],
    riskNotes: ['Small venue means late arrival may land you standing near the bar.'],
  },
  {
    id: 'marquee-after-dark',
    title: 'Marquee After Dark',
    venue: 'Marquee',
    district: 'Marina Bay',
    time: '22:30',
    endTime: '03:00',
    genre: 'Techno',
    vibeTags: ['Peak energy', 'Big room', 'Dance'],
    ticketPrice: 42,
    verified: 89,
    socialProof: '2 friends going, 18 saves from central Singapore',
    activitySignal: 'Fresh set-time story and recent promoter update',
    crowdSignal: 'High energy, louder crowd, best after 11pm',
    image:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85',
    whyGo: [
      'Strongest match for a dance-first prompt near Marina Bay.',
      'Budget stays just under $50 before drinks.',
      'Recent activity suggests the night is live, not a stale listing.',
    ],
    riskNotes: ['Commercial crowd; skip if the user wants underground-only.'],
  },
  {
    id: 'neon-noir',
    title: 'Neon Noir',
    venue: 'Neon Noir',
    district: 'Raffles Place',
    time: '19:30',
    endTime: '22:00',
    genre: 'Cocktail Bar',
    vibeTags: ['Date night', 'Smoked negroni', 'Conversation'],
    ticketPrice: 28,
    verified: 91,
    socialProof: '4 friends saved it for pre-gig drinks',
    activitySignal: 'Menu drop posted today, reservations moving',
    crowdSignal: 'Polished but not stiff, better before 9pm',
    image:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=85',
    whyGo: [
      'Good first stop when the prompt asks for atmosphere before music.',
      'Lower risk than starting the night at a loud venue.',
      'Central enough to bridge into Downtown Core or Marina Bay.',
    ],
    riskNotes: ['Not a main gig; use it as the pre-stop.'],
  },
  {
    id: 'neon-pulse',
    title: 'Neon Pulse: Architects',
    venue: 'The Obsidian Vault',
    district: 'Downtown Core',
    time: '23:00',
    endTime: '04:00',
    genre: 'Electronic',
    vibeTags: ['Underground', 'Live visuals', 'Hard groove'],
    ticketPrice: 45,
    verified: 92,
    socialProof: 'Marcus plus 4 high-overlap listeners are going',
    activitySignal: 'Artist posted soundcheck clip, venue confirmed door list',
    crowdSignal: 'Dense floor, serious listeners, strongest after midnight',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
    whyGo: [
      'Best fit for "start chill, end hard" because it peaks late.',
      'Verification and artist activity are stronger than most club listings.',
      'Works as a decisive main move instead of a long list of maybes.',
    ],
    riskNotes: ['May be intense for mixed groups unless they want a proper late finish.'],
  },
  {
    id: 'warehouse-choir',
    title: 'Warehouse Choir',
    venue: 'Room 043',
    district: 'Jalan Besar',
    time: '20:30',
    endTime: '23:15',
    genre: 'Indie Live',
    vibeTags: ['Live band', 'Warm crowd', 'Discovery'],
    ticketPrice: 30,
    verified: 87,
    socialProof: '9 saves from indie and arts profiles',
    activitySignal: 'Band posted rehearsal reel this afternoon',
    crowdSignal: 'Friendly room, early arrival matters',
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=85',
    whyGo: [
      'Good middle lane for users asking for live music without club intensity.',
      'Budget-friendly and easier for groups to enter together.',
      'Discovery value is higher than a mainstream default.',
    ],
    riskNotes: ['Earlier timing; not ideal if the user only goes out after 11pm.'],
  },
  {
    id: 'late-laughs',
    title: 'Late Laughs: Basement Set',
    venue: 'The Side Door',
    district: 'Bugis',
    time: '21:00',
    endTime: '22:45',
    genre: 'Comedy',
    vibeTags: ['Casual', 'Group-friendly', 'Low pressure'],
    ticketPrice: 24,
    verified: 83,
    socialProof: 'Good backup for mixed-taste groups',
    activitySignal: 'Host confirmed lineup this morning',
    crowdSignal: 'Easy seating, lower music commitment',
    image:
      'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=85',
    whyGo: [
      'Strong fallback when the group cannot agree on music.',
      'Cheap, social, and easy to leave room for a second stop.',
      'Lower planning risk than a loud venue for a mixed crowd.',
    ],
    riskNotes: ['Not a gig; present as a backup or pre-stop, not the headline.'],
  },
]
