import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

declare const process: { cwd: () => string }
declare function fetch(
  input: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  },
): Promise<{
          ok: boolean
          status: number
          json: () => Promise<unknown>
  text: () => Promise<string>
}>

type DevRequest = {
  method?: string
  setEncoding: (encoding: string) => void
  on: (event: 'data' | 'end' | 'error', cb: (chunk?: string) => void) => void
}

type DevResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

const eventSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'title',
    'venue',
    'district',
    'time',
    'endTime',
    'genre',
    'vibeTags',
    'ticketPrice',
    'verified',
    'socialProof',
    'activitySignal',
    'crowdSignal',
    'image',
    'eventUrl',
    'legitimacyNote',
    'whyGo',
    'riskNotes',
  ],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    venue: { type: 'string' },
    district: { type: 'string' },
    time: { type: 'string' },
    endTime: { type: 'string' },
    genre: { type: 'string' },
    vibeTags: {
      type: 'array',
      items: { type: 'string' },
    },
    ticketPrice: { type: 'number' },
    verified: { type: 'number' },
    socialProof: { type: 'string' },
    activitySignal: { type: 'string' },
    crowdSignal: { type: 'string' },
    image: { type: 'string' },
    eventUrl: { type: 'string' },
    legitimacyNote: { type: 'string' },
    whyGo: {
      type: 'array',
      items: { type: 'string' },
    },
    riskNotes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
}

const fallbackPlanSchema = {
  name: 'ask_buzo_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'prompt', 'reply', 'quickReplies', 'plan'],
    properties: {
      kind: { type: 'string', enum: ['clarify', 'plan'] },
      prompt: { type: 'string' },
      reply: { type: 'string' },
      quickReplies: {
        type: 'array',
        items: { type: 'string' },
      },
      plan: {
        type: ['object', 'null'],
        additionalProperties: false,
        required: [
          'title',
          'reply',
          'timeWindow',
          'budgetLabel',
          'confidence',
          'mainEvent',
          'stops',
          'whyThisFits',
          'trustSignals',
          'backups',
          'quickReplies',
        ],
        properties: {
          title: { type: 'string' },
          reply: { type: 'string' },
          timeWindow: { type: 'string' },
          budgetLabel: { type: 'string' },
          confidence: { type: 'number' },
          mainEvent: eventSchema,
          stops: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['kind', 'eyebrow', 'title', 'venue', 'time', 'reason'],
              properties: {
                kind: { type: 'string', enum: ['pre', 'main', 'after'] },
                eyebrow: { type: 'string' },
                title: { type: 'string' },
                venue: { type: 'string' },
                time: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          whyThisFits: {
            type: 'array',
            items: { type: 'string' },
          },
          trustSignals: {
            type: 'array',
            items: { type: 'string' },
          },
          backups: {
            type: 'array',
            items: eventSchema,
          },
          quickReplies: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
}

function readJson(req: DevRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk = '') => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', () => reject(new Error('request_error')))
  })
}

function sendJson(res: DevResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function extractOutputText(payload: unknown): string | null {
  const outputText = (payload as { output_text?: unknown }).output_text
  if (typeof outputText === 'string') return outputText

  const output = (payload as { output?: unknown }).output
  if (!Array.isArray(output)) return null
  for (const item of output) {
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      const text = (part as { text?: unknown }).text
      if (typeof text === 'string') return text
    }
  }
  return null
}

function openAIHealthPlugin(apiKey: string | undefined): Plugin {
  return {
    name: 'openai-health-local',
    configureServer(server) {
      server.middlewares.use('/api/openai-health', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json')

        if (!apiKey) {
          res.statusCode = 503
          res.end(JSON.stringify({ ok: false, reason: 'missing_key' }))
          return
        }

        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          })

          if (!response.ok) {
            res.statusCode = 502
            res.end(JSON.stringify({ ok: false, reason: `openai_${response.status}` }))
            return
          }

          res.end(JSON.stringify({ ok: true }))
        } catch {
          res.statusCode = 502
          res.end(JSON.stringify({ ok: false, reason: 'network_error' }))
        }
      })

      server.middlewares.use('/api/ask-buzo', async (req, res) => {
        const devReq = req as unknown as DevRequest
        const devRes = res as unknown as DevResponse

        if (devReq.method !== 'POST') {
          sendJson(devRes, 405, { ok: false, reason: 'method_not_allowed' })
          return
        }

        if (!apiKey) {
          sendJson(devRes, 503, { ok: false, reason: 'missing_key' })
          return
        }

        try {
          const body = (await readJson(devReq)) as {
            prompt?: unknown
            model?: unknown
            events?: unknown
            journey?: unknown
          }
          const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
          const model = typeof body.model === 'string' ? body.model.trim() : 'gpt-5.2'
          const events = Array.isArray(body.events) ? body.events : []
          const journey = typeof body.journey === 'object' && body.journey !== null ? body.journey : {}

          if (!prompt) {
            sendJson(devRes, 400, { ok: false, reason: 'missing_prompt' })
            return
          }

          const makeRequestBody = (withWebSearch: boolean) => ({
              model,
              instructions:
                `You are Buzo, a confident AI events and nightlife planner for Singapore. Create a Layla-style event planning experience: ask one concise clarification only if the user gave almost no useful context; otherwise return one complete night plan. ${
                  withWebSearch
                    ? 'Use web search to find current event, venue, listing, or official source pages that fit the user answers. Prefer real current source-backed events over invented names.'
                    : 'Web search failed or was unavailable, so generate a conservative POC plan and make every eventUrl a Google search URL for verification.'
                } Because no ticketing backend is connected, do not claim ticket inventory. Respect the user's budget strictly; if a real sourced option exceeds it, do not recommend it as the main move. Add eventUrl for each event: prefer an official event, venue, or reputable listing page if source-backed; otherwise use a Google search URL for the title + venue + Singapore so the user can verify. Add legitimacyNote for each event that clearly says whether it is source-backed or needs verification. If a result is more of a venue recommendation than a confirmed event, say that plainly. Use realistic signals such as venue activity, source fit, budget fit, and crowd risk. Use image URLs only from the provided imageLibrary. Recommend with conviction, explain trust signals, and keep the tone sharp, social, and useful. Return only strict JSON matching the schema.`,
              input: JSON.stringify({
                prompt,
                journey,
                today: new Date().toISOString().slice(0, 10),
                city: 'Singapore',
                seedExamples: events,
                imageLibrary: [
                  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=85',
                  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85',
                  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=85',
                  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
                  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=85',
                  'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=85',
                ],
              }),
              ...(withWebSearch
                ? {
              tools: [
                {
                  type: 'web_search_preview',
                  search_context_size: 'medium',
                  user_location: {
                    type: 'approximate',
                    country: 'SG',
                    city: 'Singapore',
                    region: 'Singapore',
                    timezone: 'Asia/Singapore',
                  },
                },
              ],
              tool_choice: 'auto',
                  }
                : {}),
              text: {
                format: {
                  type: 'json_schema',
                  ...fallbackPlanSchema,
                },
              },
            })

          const callOpenAI = async (withWebSearch: boolean) => {
            const response = await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(makeRequestBody(withWebSearch)),
            })

          if (!response.ok) {
            const errorPayload = await response.json().catch(async () => response.text().catch(() => null))
              throw new Error(`openai_${response.status}:${JSON.stringify(errorPayload).slice(0, 400)}`)
          }

          const payload = await response.json()
          const text = extractOutputText(payload)
          if (!text) {
              throw new Error('empty_output')
          }

            return JSON.parse(text)
          }

          let result: unknown
          try {
            result = await callOpenAI(true)
          } catch {
            result = await callOpenAI(false)
          }

          sendJson(devRes, 200, { ok: true, result })
        } catch (error) {
          sendJson(devRes, 502, {
            ok: false,
            reason: 'planner_error',
            detail: error instanceof Error ? error.message : String(error),
          })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), openAIHealthPlugin(env.OPENAI_API_KEY)],
    server: {
      host: true,
      port: 5180,
      strictPort: true,
    },
  }
})
