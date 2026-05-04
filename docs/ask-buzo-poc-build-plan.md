# Ask Buzo POC Build Plan

## Goal

Build a standalone POC in `gr-ask-buzo` that replicates the strongest parts of the Layla.ai experience for Buzo:

> Conversation in, nightlife plan out.

The POC should prove the product shape before we wire it into the main Buzo app or backend. It should feel like an AI nightlife concierge, not an event listing page.

## Build Intent

I want to build **Ask Buzo as a Layla-style nightlife planning POC**:

> A user describes the night they want, Buzo asks for one missing constraint if needed, then returns a complete night plan with one confident main move, timing, budget, trust signals, social proof, and backups.

This should not feel like a generic AI chat demo or a prettier event list. The artifact we are testing is the **decision moment**:

- Can Buzo understand vague intent?
- Can Buzo reduce choices to one strong plan?
- Can Buzo explain why the plan is worth the user's night?
- Can Buzo make the next action feel obvious?

The first build should be a standalone, guest-first prototype inside `gr-ask-buzo`. It should use local mock data and deterministic planner logic so we can tune the product feel before involving auth, Supabase, Turso, OpenAI, Stripe, or real sharing.

### First POC Experience

The first POC should support this demo path:

1. User lands on a mobile-first Ask Buzo screen.
2. User sees a product-first prompt composer, not a marketing page.
3. User enters something like:
   - "I want a low-key live music night this Friday under $40"
   - "Start chill, end with hard techno"
   - "Something good tonight near Marina Bay"
4. If the prompt is too vague, Buzo asks one short clarification and shows quick replies.
5. Buzo generates a structured night plan:
   - plan title
   - time window
   - budget estimate
   - confidence / vibe score
   - recommended flow: before, main event, after/fallback
   - main event card
   - why this fits
   - trust and legitimacy notes
   - backup options
   - local-only actions: Interested, I'm going, Share plan, Open details

### What We Are Proving

We are proving whether Ask Buzo should become the primary Buzo product surface:

> Ask → clarify → generate plan → commit.

If this feels right, `gr-frontend` can later absorb the interaction model into `/ask-buzo`, and `gr-backend` can later expose a richer `discover.planNight` mutation.

## Source Context Read

### Layla.ai

Key product lesson from `docs/layla-ai-findings.md`:

- Layla starts with the product action, not marketing copy.
- The prompt box is the hero.
- The assistant asks clarifying questions before producing bad plans.
- Quick replies keep mobile interaction light.
- The output is a finished artifact: map, stops, hotels, itinerary, transport, booking actions.
- Trust appears after the core product promise is clear.

### `gr-frontend`

Current Buzo frontend already has many Layla-inspired pieces:

- Vite + React + TypeScript mobile-web app.
- Existing `/ask-buzo` route and `Tab = 'ask'`.
- Bottom nav already labels the tab as `Ask Buzo`.
- The current tab implementation renders `DiscoverTab`, so "Ask Buzo" already exists as an app surface.
- `WelcomeScreen` already has a Layla-style landing hero:
  - "Your night out. Planned in minutes."
  - Prompt composer.
  - Quick prompt chips.
  - FAQ, testimonials, product pillars.
- `DiscoverTab` already acts as the Ask Buzo chat surface:
  - Prompt composer.
  - Chat history drawer.
  - Quick prompts.
  - Loading state.
  - Live/offline badge.
  - Event card result.
  - Local fallback if backend/LLM is unavailable.
- `discoverAgent.ts` already has local fallback logic based on prompt keywords.
- `demoData.ts` already has Singapore event data, quick prompts, welcome copy, testimonials, and Buzo's Layla-inspired feature pillars.
- `PlanEventDetail` already has the visual DNA for a high-confidence event detail page:
  - Hero image.
  - Genre tags.
  - Venue/time/price pills.
  - AI vibe score.
  - Experience copy.
  - Audio preview.
  - "I'm going" and share actions.

Important frontend implication:

The eventual integration does not need a brand-new app concept. It needs the current Ask Buzo flow upgraded from "recommend one event" to "produce a complete night plan."

### `gr-backend`

Current backend shape:

- Cloudflare Workers API with Hono + tRPC.
- Supabase handles Auth, profiles, taste, badges, subscriptions, and lightweight user metadata.
- Turso is intended as the authoritative high-churn event store.
- `discover.recommend` is protected and currently accepts:
  - prompt
  - event summaries
  - returns `reply`, `suggestedEventId`, `locationQuery`
- The current LLM system prompt asks Buzo to recommend exactly one best-match event.
- `events.list` and `events.byId` read Turso first, with Supabase fallback.
- `plan.upcoming`, `plan.past`, and `feed.get` currently return empty placeholders because the old social/RSVP tables were removed.
- North-star data model recommends `user_event_plans` as the replacement persistence model for Interested / Going / Attended plan state.
- Turso `events` has the right event fields for the POC mental model: title, venue, district, event time, genre, category, city, verified score, image, host prompt, friends going, vibe tags, ticket price, reward/buzz, and optional coordinates.

Important backend implication:

For this POC, do not block on backend persistence. Build a self-contained prototype that can later map to:

- `events.list` for source event candidates.
- a richer future `discover.planNight` or upgraded `discover.recommend`.
- `user_event_plans` for "Interested" / "Going" persistence.

### `gr-north-star`

North-star product direction:

- Buzo is a decision engine for nightlife.
- Core question: "What should I do tonight that actually fits my taste and is worth going to?"
- Product principles:
  - Truth over volume.
  - Taste over search.
  - Real-time over static listings.
  - Conversational UX over browsing.
- Key use cases:
  - "What's happening tonight?"
  - "Plan my night."
  - "Is this event legit?"
  - Passive discovery through others' prompts and social signals.
- Architecture:
  - Buzo UI on Vercel.
  - Application API on Cloudflare Workers.
  - Supabase for auth/user/reference data with RLS.
  - Turso for events.
  - OpenClaw for ingestion.
- Data model recommends `user_event_plans` for upcoming/past plan state, with event details joined from Turso.
- Mascot identity frames Buzo as a "social navigator of the night" with echolocation as the metaphor: filter signal from noise, detect vibe, and recommend with conviction.

Important product implication:

The Ask Buzo POC should focus on "trusted decision and plan formation," not just chat. The output should make the user confident enough to commit.

## Build Boundary For `gr-ask-buzo`

This POC repo should intentionally be smaller than `gr-frontend`.

### Tech Stack

Use the same frontend stack shape as `gr-frontend` so the POC can migrate back cleanly:

- Vite.
- React.
- TypeScript.
- Framer Motion for UI transitions.
- Lucide React for icons.
- Plain/local CSS following the current Buzo mobile-web styling approach.
- Local TypeScript mock data and deterministic planner logic.

No backend is needed for the POC.

### Use

- Vite + React + TypeScript.
- Local CSS.
- Local mock nightlife data.
- Deterministic prompt parsing and plan generation.
- Mobile-first layout inspired by Layla and current Buzo UI.
- Optional desktop frame that still centers the phone-like product.

### Do Not Use Yet

- Supabase Auth.
- `gr-backend` tRPC calls.
- OpenAI API.
- Turso.
- Stripe.
- Real uploads.
- Real geolocation.
- Real share/send.
- Account creation.
- Backend server or API routes.

This keeps the POC focused on product feel. The backend and database integrations should come only after the interaction model is convincing.

## What We Should Build In `gr-ask-buzo`

### One-screen mobile-first POC

Build a standalone mobile web prototype with three states:

1. Landing / empty ask state.
2. Conversational clarification state.
3. Generated night plan state.

It should be usable without authentication, backend, Supabase, Turso, or OpenAI keys.

### Landing / Empty Ask State

The first screen should mirror the useful Layla pattern but be Buzo-native:

Headline:

> Ask Buzo where to go tonight.

Supporting copy:

> Tell me your city, mood, budget, and who you're with. I'll turn it into a night plan with credible events, timing, travel, and backups.

Prompt placeholder:

> "I want a low-key live music night this Friday under $40"

Quick chips:

- Tonight
- This weekend
- Near me
- Under $50
- Date night
- Bring friends
- Surprise me
- Dance all night

Primary feeling:

The user should understand immediately that Buzo is not a database. Buzo is a concierge that turns intent into a plan.

### Clarifying Question State

If the prompt is vague, Ask Buzo should ask one concise follow-up before producing the plan.

Example:

User:

> I want something good tonight.

Buzo:

> I can plan that. What kind of night are we aiming for?

Quick replies:

- Low-key
- Dance
- Live music
- Date night
- Group night

Second possible clarification:

- Budget?
- Area?
- Solo, date, or group?

POC rule:

Only ask at most one clarification step. This keeps the demo tight.

### Generated Night Plan State

This is the core artifact. It should feel like Layla's itinerary page compressed into a nightlife plan.

Plan output sections:

1. **Plan Summary**
   - Title, e.g. "Low-key jazz night in Tiong Bahru"
   - Date/time window.
   - Budget estimate.
   - Confidence score.

2. **Recommended Flow**
   - Stop 1: pre-event food/drink.
   - Stop 2: main gig/event.
   - Stop 3: optional afters or quieter fallback.

3. **Main Event Card**
   - Event image.
   - Event title.
   - Venue and district.
   - Time.
   - Price.
   - Genre/vibe tags.
   - Verification score.
   - Friends/social signal.

4. **Why This Fits**
   - 2-3 reasons tied to the user's prompt:
     - vibe
     - budget
     - distance/area
     - credibility
     - social proof

5. **Trust / Legitimacy**
   - "Verified lineup"
   - "Recent activity"
   - "Low turnout risk"
   - "Crowd fit"

6. **Backup Options**
   - 2 alternate events or venues.
   - Reason for each backup.

7. **Actions**
   - I'm interested
   - I'm going
   - Share plan
   - Open details

POC actions can be local UI only. No external form submission, ticket purchase, account creation, or real sharing is required.

## Data For POC

Use local mock data first. Seed 6-8 events across Singapore:

- Techno / club night in Marina Bay.
- Jazz night in Tiong Bahru.
- Cocktail/date-night venue in Raffles Place.
- Underground electronic night in Downtown Core.
- Indie/live band event.
- Comedy or arts/culture fallback.

Each mock event should include:

- `id`
- `title`
- `venue`
- `district`
- `time`
- `genre`
- `vibeTags`
- `ticketPrice`
- `verified`
- `socialProof`
- `image`
- `whyGo`
- `riskNotes`
- `lat/lng` optional

This can reuse the spirit of `gr-frontend/src/data/demoData.ts`, but `gr-ask-buzo` should be self-contained.

## Agent Logic For POC

Use deterministic local logic first:

- Parse prompt keywords:
  - jazz, techno, dance, date, group, cheap, under, tonight, weekend, Marina Bay, Tiong Bahru, CBD.
- Select best matching event.
- Generate a plan object from templates.
- Ask one clarification if the prompt is too broad.

Why local first:

- Faster demo.
- No API key required.
- No auth requirement.
- Easier to tune product feel before backend integration.

Later integration path:

- Replace local planner with `discover.planNight`.
- Or extend `discover.recommend` output from one event into a full `NightPlan`.

Potential future backend output:

```ts
type NightPlan = {
  reply: string
  title: string
  confidence: number
  budgetLabel: string
  timeWindow: string
  stops: Array<{
    kind: 'pre' | 'main' | 'after' | 'backup'
    title: string
    venue: string
    time: string
    reason: string
    eventId?: string
  }>
  mainEventId: string | null
  backupEventIds: string[]
  quickReplies: string[]
}
```

## UX Principles

### Product-first

The prompt box should be the product. Avoid a generic marketing landing page.

### Mobile-first

Design for a phone viewport first. This mirrors both Layla and current `gr-frontend`.

### Dense enough to decide

The output should contain enough information to make a decision without feeling like a wall of text.

### Trust over volume

Show 1 strong plan plus backups. Do not show a big event grid as the primary answer.

### Social proof belongs in the artifact

Even if mocked, show:

- Friends going.
- People with similar taste.
- Recent prompt/social activity.

This keeps the POC aligned with Buzo's north-star rather than becoming a generic AI search box.

## Recommended POC Screens

### Screen 1: Ask

- Buzo logo/wordmark.
- Headline.
- Prompt composer.
- Quick chips.
- Mini proof line: "Built for credible nights, not endless listings."

### Screen 2: Chat / Clarify

- User bubble.
- Buzo follow-up bubble.
- Quick replies.
- Persistent composer.

### Screen 3: Plan

- User bubble.
- Buzo summary.
- Plan card with timeline.
- Main event card.
- Why this fits.
- Backup options.
- Action bar.

### Optional Screen 4: Event Detail Drawer

If time permits:

- Reuse the `PlanEventDetail` mental model.
- Full image hero.
- Vibe score.
- Venue/time/price.
- Verification notes.
- "I'm going" CTA.

## What Not To Build Yet

Avoid for the first POC:

- Real login.
- Supabase migrations.
- Stripe.
- Real ticket checkout.
- Real sharing/posting.
- Browser geolocation permission.
- Full chat history persistence.
- Full map integration.
- Full social graph.

These are important later, but they will slow down the proof of the experience.

## Integration Plan After POC

### Frontend integration

If the POC works:

1. Bring the improved Ask flow back into `gr-frontend/src/views/discover/DiscoverTab.tsx` or split it into a dedicated `AskBuzoTab`.
2. Keep `/ask-buzo` as the route.
3. Keep the existing mobile shell and bottom nav.
4. Upgrade the current event-card answer into a `NightPlan` answer.
5. Route "Open details" to the existing `PlanEventDetail` overlay.

### Backend integration

1. Add a new tRPC mutation, likely `discover.planNight`.
2. Input:
   - prompt
   - cityId
   - optional taste profile
   - candidate events
3. Output:
   - structured `NightPlan`
4. Keep LLM API keys server-side only in Cloudflare Workers.
5. Use Turso events as source candidates.
6. Use Supabase only for authenticated user/taste/plan state.

### Persistence integration

When ready:

- `I'm interested` / `I'm going` should write to `user_event_plans`.
- Upcoming/Past plan lists should join Supabase plan rows to Turso event rows.
- Feed/social signals can later be derived from plan activity, prompt activity, and city-level trends.

## Success Criteria For This POC

The POC succeeds if a user can:

1. Open the page and instantly understand what Buzo does.
2. Enter a vague or specific nightlife request.
3. Get either a useful clarification or a credible plan.
4. Understand why the plan fits.
5. See one main recommendation plus fallback options.
6. Feel confident enough to tap "I'm going" or "Share plan" even if those actions are local-only.

## Build Order

1. Scaffold standalone Vite React app in `gr-ask-buzo`.
2. Add local mock event data.
3. Implement deterministic planner logic.
4. Build mobile-first Ask screen.
5. Build clarification state.
6. Build generated plan artifact.
7. Add local-only actions and event detail drawer if time permits.
8. Run build/typecheck.
9. Test visually in browser at mobile and desktop widths.

## Open Questions

- Should the POC visually stay close to current Buzo dark/plum/orange, or explore a cleaner Layla-like light-first style?
- Should the POC require sign-in simulation, or should it be fully guest-first?
- Should the first demo city be Singapore only?
- Should "Share plan" create a local modal preview, or remain a disabled/coming-soon action?
- Should we prototype a map strip, or keep route/timing as text first?

## Current Recommendation

Build the first POC as a **guest-first, Singapore-only, mobile-first, local-data prototype**.

Keep the visual language close enough to Buzo that it can migrate back into `gr-frontend`, but let the interaction model be more Layla-like:

> Ask → clarify if needed → generate a complete night plan → commit/share.

This is the fastest way to test whether "Ask Buzo" should become the main product surface.
