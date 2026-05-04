import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  PencilLine,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { events as eventCandidates, landingPillars, quickPrompts, spotlightNights, type BuzoEvent } from './data'
import { type NightPlan, type PlannerResult, type PlanStop } from './planner'

const defaultPlaceholder = 'ask buzo...'

type Commitment = 'none' | 'interested' | 'going'
type OpenAIHealth = 'checking' | 'healthy' | 'missing-key' | 'error'
type ModelOption = {
  id: string
  label: string
  hint: string
}

type JourneyKey = 'area' | 'budget' | 'vibe' | 'crew'
type JourneyAnswers = Partial<Record<JourneyKey, string>>

type LivePlanPayload = {
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

type LivePlannerResult =
  | {
      kind: 'clarify'
      prompt: string
      reply: string
      quickReplies: string[]
      plan: null
    }
  | {
      kind: 'plan'
      prompt: string
      reply: string
      quickReplies: string[]
      plan: LivePlanPayload
    }

const modelOptions: ModelOption[] = [
  { id: 'gpt-4.1-mini', label: '4.1 Mini', hint: 'Fast' },
  { id: 'gpt-4.1', label: '4.1', hint: 'Balanced' },
  { id: 'gpt-5.2', label: '5.2', hint: 'Smart' },
  { id: 'gpt-5.2-mini', label: '5.2 Mini', hint: 'Fast smart' },
]

const journeySteps: Array<{
  key: JourneyKey
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

const fallbackImage =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=85'

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 88
  const normalized = value > 0 && value <= 1 ? value * 100 : value
  return Math.max(60, Math.min(99, Math.round(normalized)))
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'buzo-live-event'
}

function eventVerifyUrl(event: BuzoEvent) {
  if (event.eventUrl?.startsWith('http')) return event.eventUrl
  return `https://www.google.com/search?q=${encodeURIComponent(`${event.title} ${event.venue} Singapore event`)}`
}

function eventLegitimacyNote(event: BuzoEvent) {
  return (
    event.legitimacyNote ||
    'AI-generated POC recommendation. Open the source link to verify the current listing before going.'
  )
}

function sanitizeLiveEvent(event: BuzoEvent, fallback: BuzoEvent): BuzoEvent {
  return {
    id: event.id || slugify(event.title || fallback.title),
    title: event.title || fallback.title,
    venue: event.venue || fallback.venue,
    district: event.district || fallback.district,
    time: event.time || fallback.time,
    endTime: event.endTime || fallback.endTime,
    genre: event.genre || fallback.genre,
    vibeTags: event.vibeTags?.length ? event.vibeTags.slice(0, 4) : fallback.vibeTags,
    ticketPrice: Number.isFinite(event.ticketPrice) ? Math.max(0, Math.round(event.ticketPrice)) : fallback.ticketPrice,
    verified: Number.isFinite(event.verified) ? clampConfidence(event.verified) : fallback.verified,
    socialProof: event.socialProof || fallback.socialProof,
    activitySignal: event.activitySignal || fallback.activitySignal,
    crowdSignal: event.crowdSignal || fallback.crowdSignal,
    image: event.image || fallback.image || fallbackImage,
    eventUrl: event.eventUrl?.startsWith('http') ? event.eventUrl : eventVerifyUrl(event.title ? event : fallback),
    legitimacyNote: eventLegitimacyNote(event),
    whyGo: event.whyGo?.length ? event.whyGo.slice(0, 4) : fallback.whyGo,
    riskNotes: event.riskNotes?.length ? event.riskNotes.slice(0, 3) : fallback.riskNotes,
  }
}

function buildJourneyPrompt(answers: JourneyAnswers, freeText?: string) {
  const parts = [
    `Area: ${answers.area ?? 'open to Singapore'}`,
    `Budget: ${answers.budget ?? 'not specified'}`,
    `Vibe: ${answers.vibe ?? 'surprise me'}`,
    `Crew: ${answers.crew ?? 'not specified'}`,
  ]
  if (freeText?.trim()) parts.push(`Extra request: ${freeText.trim()}`)
  return `Plan my event night. ${parts.join('. ')}.`
}

function findFirstMissingStep(answers: JourneyAnswers) {
  const index = journeySteps.findIndex((step) => !answers[step.key])
  return index === -1 ? journeySteps.length - 1 : index
}

function inferJourneyAnswers(intent: string): JourneyAnswers {
  const prompt = intent.toLowerCase()
  const answers: JourneyAnswers = {}

  if (prompt.includes('marina bay')) answers.area = 'Marina Bay'
  else if (prompt.includes('tiong bahru')) answers.area = 'Tiong Bahru'
  else if (prompt.includes('bugis')) answers.area = 'Bugis'
  else if (prompt.includes('jalan besar')) answers.area = 'Jalan Besar'
  else if (prompt.includes('central') || prompt.includes('cbd') || prompt.includes('near me')) {
    answers.area = 'Central Singapore'
  }

  const budgetMatch = prompt.match(/(?:under|below|less than|within|budget)\s*\$?(\d{2,3})/)
  if (budgetMatch) {
    const budget = Number(budgetMatch[1])
    if (budget <= 30) answers.budget = 'Under $30'
    else if (budget <= 50) answers.budget = 'Under $50'
    else if (budget <= 80) answers.budget = 'Under $80'
    else answers.budget = 'Flexible if worth it'
  } else if (prompt.includes('cheap') || prompt.includes('budget')) {
    answers.budget = 'Under $50'
  }

  if (prompt.includes('date') || prompt.includes('couple') || prompt.includes('romantic')) {
    answers.vibe = 'Date night'
    answers.crew = 'Couple'
  } else if (prompt.includes('dance') || prompt.includes('club') || prompt.includes('techno')) {
    answers.vibe = 'Dance later'
  } else if (prompt.includes('hidden') || prompt.includes('gem') || prompt.includes('unusual')) {
    answers.vibe = 'Hidden gems'
  } else if (prompt.includes('low-key') || prompt.includes('lowkey') || prompt.includes('jazz') || prompt.includes('live music')) {
    answers.vibe = 'Low-key music'
  } else if (prompt.includes('group') || prompt.includes('friends') || prompt.includes('mixed')) {
    answers.vibe = 'Group-friendly'
  }

  if (!answers.crew) {
    if (prompt.includes('solo') || prompt.includes('alone')) answers.crew = 'Solo'
    else if (prompt.includes('couple')) answers.crew = 'Couple'
    else if (prompt.includes('mixed group')) answers.crew = 'Mixed group'
    else if (prompt.includes('group') || prompt.includes('friends')) answers.crew = 'Small group'
  }

  return answers
}

function quickPromptAnswers(label: string): JourneyAnswers {
  if (label === 'Under $50') return { budget: 'Under $50' }
  if (label === 'Date night') return { vibe: 'Date night', crew: 'Couple' }
  if (label === 'Dance all night') return { vibe: 'Dance later' }
  if (label === 'Bring friends') return { vibe: 'Group-friendly', crew: 'Small group' }
  return {}
}

function hydrateLiveResult(result: LivePlannerResult): PlannerResult {
  if (result.kind === 'clarify') {
    return {
      kind: 'clarify',
      prompt: result.prompt,
      reply: result.reply,
      quickReplies: result.quickReplies.slice(0, 4).map((reply) => ({
        label: reply,
        value: reply,
      })),
    }
  }

  const mainEvent = sanitizeLiveEvent(result.plan.mainEvent, eventCandidates[0])
  const backups = result.plan.backups
    .map((event, index) => sanitizeLiveEvent(event, eventCandidates[index + 1] ?? eventCandidates[0]))
    .filter((event) => event.id !== mainEvent.id)
    .slice(0, 2)

  return {
    kind: 'plan',
    prompt: result.prompt,
    plan: {
      title: result.plan.title,
      reply: result.plan.reply || result.reply,
      timeWindow: result.plan.timeWindow,
      budgetLabel: result.plan.budgetLabel,
      confidence: clampConfidence(result.plan.confidence),
      mainEvent,
      stops: result.plan.stops.slice(0, 4),
      whyThisFits: result.plan.whyThisFits.slice(0, 4),
      trustSignals: result.plan.trustSignals.slice(0, 4),
      backups,
      quickReplies: result.plan.quickReplies.slice(0, 4),
    },
  }
}

function BuzoMark() {
  return (
    <div className="brand-lockup" aria-label="Buzo">
      <div className="brand-mark">B</div>
      <span>Buzo</span>
    </div>
  )
}

function EventMiniCard({
  event,
  label,
  onOpen,
}: {
  event: BuzoEvent
  label: string
  onOpen: (event: BuzoEvent) => void
}) {
  return (
    <article className="event-mini-card">
      <img src={event.image} alt="" decoding="async" />
      <span className="event-mini-label">{label}</span>
      <strong>{event.title}</strong>
      <span className="event-mini-meta">
        {event.venue} · {event.time}
      </span>
      <div className="event-mini-actions">
        <button type="button" onClick={() => onOpen(event)}>
          Details
        </button>
        <a href={eventVerifyUrl(event)}>
          Verify
          <ExternalLink size={13} strokeWidth={2.4} aria-hidden />
        </a>
      </div>
    </article>
  )
}

function SpotlightCard({
  title,
  subtitle,
  image,
  onClick,
}: {
  title: string
  subtitle: string
  image: string
  onClick: () => void
}) {
  return (
    <button className="spotlight-card" type="button" onClick={onClick}>
      <img src={image} alt="" decoding="async" />
      <span>{title}</span>
      <strong>{subtitle}</strong>
      <em>
        Start planning
        <ArrowRight size={15} strokeWidth={2.4} aria-hidden />
      </em>
    </button>
  )
}

function PlanTimeline({ plan }: { plan: NightPlan }) {
  return (
    <section className="plan-section">
      <div className="section-title-row">
        <CalendarClock size={18} strokeWidth={2.25} aria-hidden />
        <h2>Recommended flow</h2>
      </div>
      <div className="timeline">
        {plan.stops.map((stop) => (
          <article className={`timeline-stop timeline-stop--${stop.kind}`} key={`${stop.kind}-${stop.title}`}>
            <div className="timeline-dot" aria-hidden />
            <div>
              <span className="timeline-eyebrow">{stop.eyebrow}</span>
              <h3>{stop.title}</h3>
              <p className="timeline-meta">
                {stop.venue} · {stop.time}
              </p>
              <p>{stop.reason}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MainEventCard({
  event,
  onOpen,
}: {
  event: BuzoEvent
  onOpen: (event: BuzoEvent) => void
}) {
  return (
    <article className="main-event-card">
      <div className="main-event-image-wrap">
        <img src={event.image} alt="" decoding="async" />
        <div className="event-score-pill">
          <ShieldCheck size={14} strokeWidth={2.4} aria-hidden />
          {event.verified}% match signal
        </div>
      </div>
      <div className="main-event-body">
        <div className="tag-row">
          <span>{event.genre}</span>
          {event.vibeTags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <h2>{event.title}</h2>
        <div className="event-facts">
          <span>
            <MapPin size={14} aria-hidden />
            {event.venue}, {event.district}
          </span>
          <span>
            <Clock size={14} aria-hidden />
            {event.time} - {event.endTime}
          </span>
          <span>
            <Ticket size={14} aria-hidden />${event.ticketPrice} SGD
          </span>
          <span>
            <Users size={14} aria-hidden />
            {event.socialProof}
          </span>
        </div>
        <p className="legitimacy-note">{eventLegitimacyNote(event)}</p>
        <div className="event-action-row">
          <button className="details-button" type="button" onClick={() => onOpen(event)}>
            Open details
            <ArrowRight size={16} strokeWidth={2.4} aria-hidden />
          </button>
          <a className="source-link" href={eventVerifyUrl(event)}>
            View event
            <ExternalLink size={15} strokeWidth={2.4} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  )
}

function GeneratedPlan({
  plan,
  commitment,
  setCommitment,
  onOpenEvent,
}: {
  plan: NightPlan
  commitment: Commitment
  setCommitment: (commitment: Commitment) => void
  onOpenEvent: (event: BuzoEvent) => void
}) {
  return (
    <motion.div
      className="plan-output"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className="plan-hero-card">
        <div className="plan-hero-top">
          <span className="assistant-pill">
            <Sparkles size={14} strokeWidth={2.4} aria-hidden />
            Buzo plan
          </span>
          <span className="confidence-pill">{plan.confidence}% confidence</span>
        </div>
        <h1>{plan.title}</h1>
        <p>{plan.reply}</p>
        <div className="plan-stats">
          <span>
            <Clock size={15} aria-hidden />
            {plan.timeWindow}
          </span>
          <span>
            <Ticket size={15} aria-hidden />
            {plan.budgetLabel}
          </span>
        </div>
        <p className="source-caution">
          OpenAI web-assisted POC plan. Use the event links to verify the latest listing before going.
        </p>
      </section>

      <PlanTimeline plan={plan} />

      <section className="plan-section">
        <div className="section-title-row">
          <Zap size={18} strokeWidth={2.25} aria-hidden />
          <h2>Main move</h2>
        </div>
        <MainEventCard event={plan.mainEvent} onOpen={onOpenEvent} />
      </section>

      <section className="plan-section two-column-section">
        <article className="reason-card">
          <h2>Why this fits</h2>
          <ul>
            {plan.whyThisFits.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>
        <article className="reason-card reason-card--trust">
          <h2>Trust signals</h2>
          <ul>
            {plan.trustSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="plan-section">
        <div className="section-title-row">
          <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
          <h2>Backups</h2>
        </div>
        <div className="backup-grid">
          {plan.backups.map((event, index) => (
            <EventMiniCard
              key={event.id}
              event={event}
              label={index === 0 ? 'Softer fallback' : 'Different energy'}
              onOpen={onOpenEvent}
            />
          ))}
        </div>
      </section>

      <div className="commit-bar" aria-label="Plan actions">
        <button
          type="button"
          className={commitment === 'interested' ? 'commit-secondary commit-on' : 'commit-secondary'}
          onClick={() => setCommitment(commitment === 'interested' ? 'none' : 'interested')}
        >
          {commitment === 'interested' ? <Check size={17} aria-hidden /> : null}
          Interested
        </button>
        <button
          type="button"
          className={commitment === 'going' ? 'commit-primary commit-on' : 'commit-primary'}
          onClick={() => setCommitment(commitment === 'going' ? 'none' : 'going')}
        >
          {commitment === 'going' ? <Check size={17} aria-hidden /> : null}
          I&apos;m going
        </button>
        <button type="button" className="commit-icon" aria-label="Share plan">
          <Share2 size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </motion.div>
  )
}

function EventDrawer({ event, onClose }: { event: BuzoEvent | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {event ? (
        <motion.div
          className="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="event-drawer"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${event.title} details`}
          >
            <button className="drawer-close" type="button" onClick={onClose} aria-label="Close details">
              <X size={18} aria-hidden />
            </button>
            <img className="drawer-image" src={event.image} alt="" decoding="async" />
            <div className="drawer-content">
              <div className="tag-row">
                <span>{event.genre}</span>
                <span>{event.verified}% match signal</span>
              </div>
              <h2>{event.title}</h2>
              <p className="drawer-meta">
                {event.venue}, {event.district} · {event.time} - {event.endTime}
              </p>
              <p>{event.crowdSignal}</p>
              <p className="legitimacy-note">{eventLegitimacyNote(event)}</p>
              <a className="source-link source-link--drawer" href={eventVerifyUrl(event)}>
                View / verify event
                <ExternalLink size={15} strokeWidth={2.4} aria-hidden />
              </a>
              <div className="drawer-grid">
                <div>
                  <span>Entry</span>
                  <strong>${event.ticketPrice} SGD</strong>
                </div>
                <div>
                  <span>Signal</span>
                  <strong>{event.verified}%</strong>
                </div>
              </div>
              <h3>Risk notes</h3>
              <ul>
                {event.riskNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function App() {
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<PlannerResult | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [commitment, setCommitment] = useState<Commitment>('none')
  const [selectedEvent, setSelectedEvent] = useState<BuzoEvent | null>(null)
  const [openAIHealth, setOpenAIHealth] = useState<OpenAIHealth>('checking')
  const [selectedModel, setSelectedModel] = useState(modelOptions[0].id)
  const [liveNotice, setLiveNotice] = useState<string | null>(null)
  const [journeyAnswers, setJourneyAnswers] = useState<JourneyAnswers>({})
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0)
  const [hasStartedJourney, setHasStartedJourney] = useState(false)
  const [landingIntent, setLandingIntent] = useState('')
  const [isJourneyReplyPending, setIsJourneyReplyPending] = useState(false)
  const journeyDelayRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const hasPlan = result?.kind === 'plan'
  const canSubmit = inputValue.trim().length >= 3

  const currentPlan = useMemo(() => (result?.kind === 'plan' ? result.plan : null), [result])
  const activeJourneyStep = journeySteps[activeJourneyIndex]
  const completedJourneyCount = journeySteps.filter((step) => journeyAnswers[step.key]).length
  const isJourneyComplete = completedJourneyCount === journeySteps.length
  const placeholder =
    isJourneyReplyPending
      ? 'Buzo is thinking...'
      : hasStartedJourney && !result && !isThinking && !isJourneyComplete && activeJourneyStep
      ? `Answer: ${activeJourneyStep.title.toLowerCase()}`
      : defaultPlaceholder

  useEffect(() => {
    let cancelled = false

    async function checkOpenAI() {
      try {
        const response = await fetch('/api/openai-health')
        const payload = (await response.json().catch(() => null)) as
          | { ok?: unknown; reason?: unknown }
          | null

        if (cancelled) return

        if (response.ok && payload?.ok === true) {
          setOpenAIHealth('healthy')
        } else if (payload?.reason === 'missing_key') {
          setOpenAIHealth('missing-key')
        } else {
          setOpenAIHealth('error')
        }
      } catch {
        if (!cancelled) setOpenAIHealth('error')
      }
    }

    void checkOpenAI()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`
  }, [inputValue])

  useEffect(() => {
    return () => {
      if (journeyDelayRef.current) window.clearTimeout(journeyDelayRef.current)
    }
  }, [])

  const openAIHealthLabel =
    openAIHealth === 'healthy'
      ? 'OpenAI Connected'
      : openAIHealth === 'missing-key'
        ? 'OpenAI key missing'
        : openAIHealth === 'error'
          ? 'OpenAI offline'
          : 'Checking OpenAI'

  const runPlanner = async (prompt: string, journey: JourneyAnswers = journeyAnswers) => {
    const clean = prompt.trim()
    if (!clean) return
    setIsThinking(true)
    setCommitment('none')
    setLiveNotice(null)

    try {
      const response = await fetch('/api/ask-buzo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: clean,
          model: selectedModel,
          journey,
          events: [],
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { ok?: unknown; reason?: unknown; result?: LivePlannerResult }
        | null

      if (!response.ok || payload?.ok !== true || !payload.result) {
        throw new Error(typeof payload?.reason === 'string' ? payload.reason : 'planner_error')
      }

      setResult(hydrateLiveResult(payload.result))
      setInputValue('')
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'planner_error'
      setResult(null)
      setInputValue('')
      setLiveNotice(
        reason === 'missing_key'
          ? 'OpenAI key missing. Add it to .env to generate live plans.'
          : 'Live planner could not generate this plan. Try again or switch model.',
      )
    } finally {
      setIsThinking(false)
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    if (!hasStartedJourney && !result && !isThinking) {
      startJourney(inputValue.trim())
      return
    }
    if (hasStartedJourney && !result && !isThinking && !isJourneyComplete && activeJourneyStep) {
      selectJourneyOption(activeJourneyStep.key, inputValue.trim())
      setInputValue('')
      return
    }
    void runPlanner(inputValue)
  }

  const useClarifyingReply = (value: string) => {
    const basePrompt = result?.prompt ?? 'Plan tonight'
    void runPlanner(`${basePrompt}. Make it ${value}.`)
  }

  const buildFromJourney = (answers: JourneyAnswers = journeyAnswers, freeText = inputValue) => {
    void runPlanner(buildJourneyPrompt(answers, freeText || landingIntent), answers)
  }

  const startJourney = (intent = '', presetAnswers?: JourneyAnswers) => {
    const inferredAnswers = presetAnswers ?? inferJourneyAnswers(intent)
    const nextStepIndex = findFirstMissingStep(inferredAnswers)
    setLiveNotice(null)
    setLandingIntent(intent)
    setJourneyAnswers(inferredAnswers)
    setActiveJourneyIndex(nextStepIndex)
    setIsJourneyReplyPending(false)
    setInputValue('')
    setHasStartedJourney(true)

    if (Object.keys(inferredAnswers).length === journeySteps.length) {
      buildFromJourney(inferredAnswers, intent)
    }

    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const selectJourneyOption = (key: JourneyKey, value: string) => {
    if (isJourneyReplyPending) return
    if (journeyDelayRef.current) window.clearTimeout(journeyDelayRef.current)

    setLiveNotice(null)
    const nextAnswers = { ...journeyAnswers, [key]: value }
    setJourneyAnswers(nextAnswers)

    const isComplete = journeySteps.every((step) => nextAnswers[step.key])
    setIsJourneyReplyPending(true)

    journeyDelayRef.current = window.setTimeout(() => {
      setIsJourneyReplyPending(false)
      setActiveJourneyIndex(findFirstMissingStep(nextAnswers))

      if (isComplete) {
        buildFromJourney(nextAnswers)
      }
    }, 1000)
  }

  const startNewChat = () => {
    setResult(null)
    setInputValue('')
    setCommitment('none')
    setLiveNotice(null)
    setSelectedEvent(null)
    setJourneyAnswers({})
    setActiveJourneyIndex(0)
    setHasStartedJourney(false)
    setLandingIntent('')
    setIsJourneyReplyPending(false)
    if (journeyDelayRef.current) window.clearTimeout(journeyDelayRef.current)
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  return (
    <div className="app-shell">
      <main className={hasPlan ? 'phone-shell phone-shell--plan' : 'phone-shell'}>
        <header className="topbar">
          <BuzoMark />
          <div className="topbar-actions">
            <span className={`topbar-pill topbar-pill--${openAIHealth}`}>
              {openAIHealthLabel}
            </span>
            <label className="model-select">
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                aria-label="Select ChatGPT model"
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} strokeWidth={2.5} aria-hidden />
            </label>
            <button className="new-chat-button" type="button" onClick={startNewChat} aria-label="Start new chat">
              <PencilLine size={15} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </header>

        <div className="scroll-area">
          {liveNotice ? <div className="live-notice">{liveNotice}</div> : null}

          {!result && !isThinking && !hasStartedJourney ? (
            <motion.section
              className="hero-state"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="hero-orbit" aria-hidden>
                <div className="orbit-card orbit-card--one">Live</div>
                <div className="orbit-card orbit-card--two">Worth it</div>
                <div className="orbit-card orbit-card--three">Backup</div>
              </div>
              <p className="eyebrow">AI events planner</p>
              <h1>Your night out. Planned in minutes.</h1>
              <p className="hero-copy">
                Ask Buzo where to go tonight. I&apos;ll turn your mood, budget, and crew into
                a credible plan with timing, social proof, and backups.
              </p>
              <button className="hero-start-button" type="button" onClick={() => startJourney()}>
                Start planning
                <ArrowRight size={17} strokeWidth={2.5} aria-hidden />
              </button>
              <div className="proof-strip">
                <span>
                  <ShieldCheck size={15} aria-hidden />
                  Guided first
                </span>
                <span>
                  <Zap size={15} aria-hidden />
                  Live AI picks
                </span>
                <span>
                  <Users size={15} aria-hidden />
                  Backups included
                </span>
              </div>
              <section className="spotlight-section" aria-labelledby="spotlight-heading">
                <h2 id="spotlight-heading">Where to go next</h2>
                <div className="spotlight-row">
                  {spotlightNights.map((night) => (
                    <SpotlightCard
                      key={night.title}
                      title={night.title}
                      subtitle={night.subtitle}
                      image={night.image}
                      onClick={() => startJourney(night.prompt)}
                    />
                  ))}
                </div>
              </section>
              <section className="landing-pillars" aria-label="How Buzo helps">
                {landingPillars.map((pillar) => (
                  <article key={pillar.title}>
                    <h2>{pillar.title}</h2>
                    <p>{pillar.body}</p>
                  </article>
                ))}
              </section>
            </motion.section>
          ) : null}

          {!result && !isThinking && hasStartedJourney ? (
            <motion.section
              className="chat-thread onboarding-chat"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="bubble bubble-buzo">
                {landingIntent && completedJourneyCount > 0
                  ? `Got it: "${landingIntent}". I pulled out what I can, so I’ll only ask what’s missing.`
                  : landingIntent
                    ? `Got it: "${landingIntent}". Let’s go step by step so I don’t guess too early.`
                    : 'I’ll plan this like a proper event concierge. I’ll ask a few quick questions first, then use ChatGPT to build the live POC plan.'}
              </div>

              {journeySteps.map((step, index) => {
                const answer = journeyAnswers[step.key]
                const shouldShowQuestion = index === activeJourneyIndex && !isJourneyComplete
                const shouldShowAnsweredQuestion = Boolean(answer)

                return (
                  <div className="journey-message-group" key={step.key}>
                    {shouldShowQuestion || shouldShowAnsweredQuestion ? (
                      <div className="bubble bubble-buzo journey-question">
                        <span>{step.eyebrow}</span>
                        {step.title}
                      </div>
                    ) : null}
                    {answer ? <div className="bubble bubble-user">{answer}</div> : null}
                  </div>
                )
              })}

              {isJourneyReplyPending ? (
                <div className="bubble bubble-buzo typing journey-typing" aria-label="Buzo is thinking">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}

              {!isJourneyReplyPending && !isJourneyComplete && activeJourneyStep ? (
                <div className="journey-options journey-options--chat">
                  {activeJourneyStep.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={journeyAnswers[activeJourneyStep.key] === option ? 'journey-option selected' : 'journey-option'}
                      onClick={() => selectJourneyOption(activeJourneyStep.key, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}

              {!isJourneyReplyPending && isJourneyComplete ? (
                <div className="bubble bubble-buzo journey-ready">
                  Nice. I have enough context now: {journeyAnswers.area}, {journeyAnswers.budget},{' '}
                  {journeyAnswers.vibe}, {journeyAnswers.crew}. I&apos;m building the event plan.
                </div>
              ) : null}
            </motion.section>
          ) : null}

          {result?.kind === 'clarify' ? (
            <motion.section
              className="chat-thread"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bubble bubble-user">{result.prompt}</div>
              <div className="bubble bubble-buzo">{result.reply}</div>
              <div className="clarity-grid">
                {result.quickReplies.map((reply) => (
                  <button key={reply.label} type="button" onClick={() => useClarifyingReply(reply.value)}>
                    {reply.label}
                  </button>
                ))}
              </div>
            </motion.section>
          ) : null}

          {isThinking ? (
            <motion.section className="chat-thread" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bubble bubble-user">Planning your night...</div>
              <div className="bubble bubble-buzo typing">
                <span />
                <span />
                <span />
              </div>
            </motion.section>
          ) : null}

          {currentPlan ? (
            <GeneratedPlan
              plan={currentPlan}
              commitment={commitment}
              setCommitment={setCommitment}
              onOpenEvent={setSelectedEvent}
            />
          ) : null}
        </div>

        <footer className="composer-footer">
          {!hasStartedJourney && !hasPlan && !result ? (
            <div className="quick-row" aria-label="Quick prompts">
              {quickPrompts.map((item) => (
                <button key={item.label} type="button" onClick={() => startJourney(item.label, quickPromptAnswers(item.label))}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          {hasPlan ? (
            <div className="quick-row quick-row--plan" aria-label="Plan refinements">
              {currentPlan?.quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => void runPlanner(`${result.prompt}. ${reply}.`)}
                >
                  {reply}
                </button>
              ))}
            </div>
          ) : null}
          <div className="composer">
            <button className="composer-plus" type="button" aria-label="Attach context">
              <ChevronDown size={18} aria-hidden />
            </button>
            <textarea
              ref={textareaRef}
              value={inputValue}
              placeholder={placeholder}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
              rows={1}
              aria-label="Describe your night"
            />
            <button
              className="send-button"
              type="button"
              disabled={!canSubmit || isThinking || isJourneyReplyPending}
              onClick={handleSubmit}
              aria-label="Ask Buzo"
            >
              <Send size={18} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        </footer>
      </main>
      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
