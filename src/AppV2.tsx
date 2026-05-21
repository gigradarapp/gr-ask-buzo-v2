import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Sun,
  User,
} from 'lucide-react'

type Tab = 'discover' | 'ask' | 'plan' | 'favorites' | 'profile'

const BASE_PATH = '/ask-buzo-v2'

const ASK_PROMPTS = [
  'any good jazz tonight near Tiong Bahru ?',
  'best techno tonight in Marina Bay?',
  'who is going to neon pulse tonight?',
]

function tabFromPath(pathname: string): Tab {
  if (pathname === BASE_PATH || pathname === `${BASE_PATH}/` || pathname === `${BASE_PATH}/ask`) return 'ask'
  if (pathname === `${BASE_PATH}/discover`) return 'discover'
  if (pathname === `${BASE_PATH}/plan`) return 'plan'
  if (pathname === `${BASE_PATH}/favorites`) return 'favorites'
  if (pathname === `${BASE_PATH}/profile`) return 'profile'
  return 'ask'
}

function pathForTab(tab: Tab): string {
  if (tab === 'ask') return BASE_PATH
  return `${BASE_PATH}/${tab}`
}

export function AppV2() {
  const [tab, setTab] = useState<Tab>(() => tabFromPath(window.location.pathname))
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const pathname = window.location.pathname
    if (!pathname.startsWith(BASE_PATH)) {
      window.history.replaceState({}, '', BASE_PATH)
      setTab('ask')
      return
    }

    const onPopState = () => setTab(tabFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const goTab = (nextTab: Tab) => {
    const nextPath = pathForTab(nextTab)
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
    setTab(nextTab)
  }

  const heading = useMemo(() => {
    if (tab === 'discover') return 'Discover'
    if (tab === 'plan') return 'Plan'
    if (tab === 'favorites') return 'Favorites'
    if (tab === 'profile') return 'Profile'
    return 'Chat With Buzo...'
  }, [tab])

  const subheading = useMemo(() => {
    if (tab === 'ask') return 'Venues, lineups, areas, or budget — replies show up here.'
    return 'UI cloned from gr-frontend. This section is intentionally non-functional for now.'
  }, [tab])

  return (
    <div className="v2-page">
      <div className="v2-shell">
        <header className="v2-topbar">
          <div className="v2-brand">B</div>
          <div className="v2-topbar-actions">
            <button type="button" className="v2-icon-btn" aria-label="Toggle theme">
              <Sun size={16} aria-hidden />
            </button>
            <button
              type="button"
              className={`v2-icon-btn${tab === 'favorites' ? ' v2-icon-btn-active' : ''}`}
              aria-label="Favorites"
              onClick={() => goTab('favorites')}
            >
              <Heart size={16} aria-hidden />
            </button>
            <button
              type="button"
              className={`v2-icon-btn${tab === 'profile' ? ' v2-icon-btn-active' : ''}`}
              aria-label="Profile"
              onClick={() => goTab('profile')}
            >
              <User size={16} aria-hidden />
            </button>
          </div>
        </header>

        <div className="v2-subheader">
          <button type="button" className="v2-icon-btn" aria-label="More options">
            <MoreHorizontal size={18} aria-hidden />
          </button>
          <button type="button" className="v2-chat-menu" aria-label="Start new chat">
            <span>New chat</span>
            <ChevronDown size={16} aria-hidden />
          </button>
        </div>

        <main className="v2-content">
          <div className="v2-empty-state">
            <h1>{heading}</h1>
            <p>{subheading}</p>
          </div>
        </main>

        {tab === 'ask' && (
          <footer className="v2-ask-footer">
            <div className="v2-try-row">
              <p>Try asking</p>
              <div className="v2-chip-strip-wrap">
                <button type="button" className="v2-scroll-btn" aria-label="Scroll left">
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <div className="v2-chip-strip" role="list" aria-label="Suggested prompts">
                  {ASK_PROMPTS.map((item) => (
                    <button key={item} type="button" role="listitem" className="v2-chip" onClick={() => setPrompt(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <button type="button" className="v2-scroll-btn" aria-label="Scroll right">
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </div>

            <div className="v2-composer" role="group" aria-label="Ask Buzo">
              <button type="button" className="v2-composer-icon" aria-label="Attach file">
                <Paperclip size={18} aria-hidden />
              </button>
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Chat With Buzo..."
                aria-label="Ask Buzo prompt"
              />
              <button type="button" className="v2-send-btn" aria-label="Send">
                <Send size={18} aria-hidden />
              </button>
            </div>
          </footer>
        )}

        <nav className="v2-bottom-nav" aria-label="Main tabs">
          <button
            type="button"
            className={tab === 'discover' ? 'v2-nav-item active' : 'v2-nav-item'}
            onClick={() => goTab('discover')}
          >
            <Search size={20} aria-hidden />
            <span>Discover</span>
          </button>
          <button type="button" className={tab === 'ask' ? 'v2-nav-item active' : 'v2-nav-item'} onClick={() => goTab('ask')}>
            <MessageCircle size={20} aria-hidden />
            <span>Ask Buzo</span>
          </button>
          <button type="button" className={tab === 'plan' ? 'v2-nav-item active' : 'v2-nav-item'} onClick={() => goTab('plan')}>
            <Calendar size={20} aria-hidden />
            <span>Plan</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
