import { clarityReplies, events, type BuzoEvent } from './data'

export type PlanStop = {
  kind: 'pre' | 'main' | 'after'
  eyebrow: string
  title: string
  venue: string
  time: string
  reason: string
}

export type NightPlan = {
  title: string
  reply: string
  timeWindow: string
  budgetLabel: string
  confidence: number
  mainEvent: BuzoEvent
  stops: PlanStop[]
  whyThisFits: string[]
  trustSignals: string[]
  backups: BuzoEvent[]
  quickReplies: string[]
}

export type PlannerResult =
  | {
      kind: 'clarify'
      prompt: string
      reply: string
      quickReplies: typeof clarityReplies
    }
  | {
      kind: 'plan'
      prompt: string
      plan: NightPlan
    }

const vaguePrompts = new Set(['tonight', 'this weekend', 'near me', 'surprise me'])

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function includesAny(prompt: string, words: string[]) {
  return words.some((word) => prompt.includes(word))
}

function budgetFromPrompt(prompt: string) {
  const match = prompt.match(/(?:under|below|less than|\$)\s*\$?(\d{2,3})/)
  if (!match) return null
  return Number(match[1])
}

function scoreEvent(event: BuzoEvent, prompt: string) {
  let score = event.verified

  const genre = event.genre.toLowerCase()
  const tags = event.vibeTags.join(' ').toLowerCase()
  const area = event.district.toLowerCase()
  const title = event.title.toLowerCase()
  const haystack = `${genre} ${tags} ${area} ${title}`
  const budget = budgetFromPrompt(prompt)

  if (budget != null) {
    score += event.ticketPrice <= budget ? 16 : -18
  }

  if (includesAny(prompt, ['jazz', 'live music', 'low-key', 'lowkey', 'chill'])) {
    score += includesAny(haystack, ['jazz', 'live band', 'low-key', 'intimate']) ? 30 : -4
  }
  if (includesAny(prompt, ['techno', 'dance', 'club', 'hard', 'electronic'])) {
    score += includesAny(haystack, ['techno', 'electronic', 'dance', 'hard groove', 'peak']) ? 32 : -6
  }
  if (includesAny(prompt, ['date', 'couple', 'romantic', 'cocktail'])) {
    score += includesAny(haystack, ['date night', 'cocktail', 'conversation', 'jazz']) ? 30 : -8
  }
  if (includesAny(prompt, ['group', 'friends', 'mixed'])) {
    score += includesAny(haystack, ['group-friendly', 'casual', 'big room', 'comedy']) ? 22 : 3
  }
  if (includesAny(prompt, ['marina bay'])) {
    score += area.includes('marina bay') ? 24 : -4
  }
  if (includesAny(prompt, ['tiong bahru'])) {
    score += area.includes('tiong bahru') ? 24 : -4
  }
  if (includesAny(prompt, ['raffles', 'cbd', 'central'])) {
    score += includesAny(area, ['raffles', 'downtown', 'bugis']) ? 15 : 0
  }
  if (includesAny(prompt, ['cheap', 'budget', 'under'])) {
    score += event.ticketPrice <= 35 ? 12 : -6
  }

  return score
}

function chooseMainEvent(prompt: string) {
  return [...events].sort((a, b) => scoreEvent(b, prompt) - scoreEvent(a, prompt))[0]
}

function choosePreStop(main: BuzoEvent, prompt: string): BuzoEvent {
  if (includesAny(prompt, ['date', 'cocktail', 'start chill', 'chill'])) {
    return events.find((event) => event.id === 'neon-noir') ?? main
  }
  if (includesAny(prompt, ['group', 'friends', 'mixed'])) {
    return events.find((event) => event.id === 'late-laughs') ?? main
  }
  return events.find((event) => event.id === 'neon-noir') ?? main
}

function chooseAfterStop(main: BuzoEvent, prompt: string): BuzoEvent {
  if (main.id !== 'neon-pulse' && includesAny(prompt, ['hard', 'late', 'dance', 'techno'])) {
    return events.find((event) => event.id === 'neon-pulse') ?? main
  }
  if (main.id !== 'marquee-after-dark' && includesAny(prompt, ['marina bay', 'club'])) {
    return events.find((event) => event.id === 'marquee-after-dark') ?? main
  }
  return main.id === 'blue-note-session'
    ? events.find((event) => event.id === 'neon-noir') ?? main
    : events.find((event) => event.id === 'blue-note-session') ?? main
}

function makePlanTitle(main: BuzoEvent, prompt: string) {
  if (includesAny(prompt, ['date', 'couple'])) return `Date night around ${main.district}`
  if (includesAny(prompt, ['group', 'friends'])) return `Group-ready night in ${main.district}`
  if (includesAny(prompt, ['techno', 'dance', 'hard'])) return `Dance-forward night near ${main.district}`
  if (includesAny(prompt, ['jazz', 'live', 'low-key', 'chill'])) return `Low-key live night in ${main.district}`
  return `Worth-it night around ${main.district}`
}

function buildPlan(prompt: string): NightPlan {
  const main = chooseMainEvent(prompt)
  const pre = choosePreStop(main, prompt)
  const after = chooseAfterStop(main, prompt)
  const backups = events
    .filter((event) => event.id !== main.id && event.id !== pre.id && event.id !== after.id)
    .sort((a, b) => scoreEvent(b, prompt) - scoreEvent(a, prompt))
    .slice(0, 2)

  const totalBudget = main.ticketPrice + (pre.id !== main.id ? Math.min(pre.ticketPrice, 32) : 0)
  const confidence = Math.min(98, Math.round((scoreEvent(main, prompt) + main.verified) / 2))

  const stops: PlanStop[] = [
    {
      kind: 'pre',
      eyebrow: 'Start',
      title: pre.id === main.id ? 'Arrive early and settle in' : pre.title,
      venue: pre.venue,
      time: pre.id === main.id ? '30 min before doors' : pre.time,
      reason:
        pre.id === main.id
          ? 'This venue rewards early arrival, especially if you want the best spot.'
          : `Use ${pre.venue} as the low-friction warm-up before the main move.`,
    },
    {
      kind: 'main',
      eyebrow: 'Main move',
      title: main.title,
      venue: main.venue,
      time: main.time,
      reason: main.whyGo[0],
    },
    {
      kind: 'after',
      eyebrow: 'If the night has legs',
      title: after.id === main.id ? 'Stay for the late set' : after.title,
      venue: after.venue,
      time: after.id === main.id ? main.endTime : after.time,
      reason:
        after.id === main.id
          ? 'The signal gets stronger later, so there is no need to bounce too soon.'
          : `Good fallback if ${main.venue} feels too packed or wraps early.`,
    },
  ]

  return {
    title: makePlanTitle(main, prompt),
    reply: `This is the move I would make: anchor the night around ${main.title}, then keep one clean backup nearby.`,
    timeWindow: `${stops[0].time} → ${main.endTime}`,
    budgetLabel: `About $${totalBudget} before transport`,
    confidence,
    mainEvent: main,
    stops,
    whyThisFits: main.whyGo,
    trustSignals: [main.activitySignal, main.crowdSignal, main.socialProof],
    backups,
    quickReplies: ['Make it cheaper', 'More underground', 'Add food first', 'Show a softer option'],
  }
}

export function planNight(rawPrompt: string): PlannerResult {
  const prompt = normalize(rawPrompt)

  if (!prompt || prompt.length < 4) {
    return {
      kind: 'clarify',
      prompt: rawPrompt,
      reply: 'I can plan that. What kind of night are we aiming for?',
      quickReplies: clarityReplies,
    }
  }

  const tooVague =
    vaguePrompts.has(prompt) ||
    (prompt.length < 22 &&
      !includesAny(prompt, [
        'jazz',
        'techno',
        'dance',
        'date',
        'group',
        'friend',
        'live',
        'cheap',
        'under',
        'marina',
        'tiong',
      ]))

  if (tooVague) {
    return {
      kind: 'clarify',
      prompt: rawPrompt,
      reply: 'I can plan that. Give me one signal so I do not send you somewhere random.',
      quickReplies: clarityReplies,
    }
  }

  return {
    kind: 'plan',
    prompt: rawPrompt.trim(),
    plan: buildPlan(prompt),
  }
}
