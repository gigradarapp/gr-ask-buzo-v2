export const ASK_BUZO_V2_BASE_PATH = '/ask-buzo-v2'

export const ASK_BUZO_V2_PROMPTS = [
  'any good jazz tonight near Tiong Bahru ?',
  'best techno tonight in Marina Bay?',
  'who is going to neon pulse tonight?',
] as const

export const ASK_BUZO_DEFAULT_PLACEHOLDER = 'Chat with BUZO...'

export type AskBuzoModelOption = {
  id: string
  label: string
  hint: string
}

export const ASK_BUZO_MODEL_OPTIONS: AskBuzoModelOption[] = [
  { id: 'gpt-4.1-mini', label: '4.1 Mini', hint: 'Fast' },
  { id: 'gpt-4.1', label: '4.1', hint: 'Balanced' },
  { id: 'gpt-5.2', label: '5.2', hint: 'Smart' },
  { id: 'gpt-5.2-mini', label: '5.2 Mini', hint: 'Fast smart' },
]

export type AskBuzoJourneyKey = 'area' | 'budget' | 'vibe' | 'crew'

export const ASK_BUZO_JOURNEY_STEPS: Array<{
  key: AskBuzoJourneyKey
  eyebrow: string
  title: string
  options: string[]
}> = [
  {
    key: 'area',
    eyebrow: 'Step 1',
    title: 'Where do you want to go?',
    options: ['Central Singapore', 'Marina Bay', 'Tiong Bahru', 'Bugis', 'Jalan Besar', 'Surprise me'],
  },
  {
    key: 'budget',
    eyebrow: 'Step 2',
    title: 'How much should the night cost?',
    options: ['Under $30', 'Under $50', 'Under $80', 'Flexible if worth it'],
  },
  {
    key: 'vibe',
    eyebrow: 'Step 3',
    title: 'What kind of energy do you want?',
    options: ['Low-key music', 'Date night', 'Dance later', 'Hidden gems', 'Group-friendly', 'Something unusual'],
  },
  {
    key: 'crew',
    eyebrow: 'Step 4',
    title: 'Who is going?',
    options: ['Solo', 'Couple', 'Small group', 'Mixed group', 'Not sure yet'],
  },
]

export const ASK_BUZO_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=85'
