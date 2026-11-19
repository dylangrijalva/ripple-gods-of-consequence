import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Check, ChevronRight, MapPin, GitFork, Globe2, Landmark, MousePointer2, Pause, Play, SkipForward, Sparkles, Sun, X } from 'lucide-react'
import { World } from './World'
import { loadSimulation, type Power } from './simulation'
import { advanceChronicle, castPower, loadChronicle, saveChronicle, type Chronicle } from './chronicle'
import { Civilization, metrics, powers, Timelines } from './Almanac'
import './app.css'

const views = [
  {id: 'world', title: 'Island', Icon: Globe2}, {id: 'powers', title: 'Powers', Icon: Sparkles},
  {id: 'civilization', title: 'Village', Icon: Landmark}, {id: 'timelines', title: 'Timelines', Icon: GitFork},
] as const
type View = typeof views[number]['id']
const shortcuts = [
  ['1 to 4', 'Switch between the four tabs'],
  ['Space', 'Pause or resume the clock'],
  ['.', 'Step forward one day'],
  ['Esc', 'Close the panel or return to the menu'],
  ['?', 'Show these controls'],
]

function Dialog({onClose, children}: {onClose: () => void, children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className="guide paper" onCancel={onClose} aria-labelledby="guide-title" onClick={e => {if (e.target === e.currentTarget) onClose()}}>
    <div className="guide-inner"><button className="icon-button close" aria-label="Close instructions" onClick={onClose}><X size={18}/></button>{children}</div>
  </dialog>
}

export default function App() {
  const [chronicle, update] = useState<Chronicle | null>(null)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState('')
  const [ready, setReady] = useState(false)
  const [menu, setMenu] = useState(true)
  const [view, setView] = useState<View>('world')
  const [guide, showGuide] = useState(false)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [effect, setEffect] = useState<{power: Power, serial: number} | null>(null)
  const hasEntered = useRef(false)
  const onReady = useCallback(() => setReady(true), [])
  useEffect(() => {
    const abort = new AbortController()
    async function boot() {
      try {
        const [reply] = await Promise.all([fetch('/api/world', {signal: abort.signal}), loadSimulation()])
        if (!reply.ok) throw new Error('Cannot load island')
        const data = await reply.json()
        if (!Number.isInteger(data.seed) || typeof data.name !== 'string') throw new Error('Invalid island')
        if (abort.signal.aborted) return
        setName(data.name)
        update(loadChronicle(data.seed))
      } catch {
        if (!abort.signal.aborted) setProblem("The island didn't load. Check your connection, then reload the game.")
      }
    }
    void boot()
    return () => abort.abort()
  }, [])
  useEffect(() => { if (chronicle) saveChronicle(chronicle) }, [chronicle])
  const step = useCallback(() => update(previous => previous && advanceChronicle(previous)), [])
  useEffect(() => {
    if (menu || guide || !running || !ready) return
    const timer = window.setInterval(step, 5600 / speed)
    return () => window.clearInterval(timer)
  }, [menu, guide, running, speed, step, ready])
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat || (e.target instanceof HTMLElement && e.target.matches('input,select,textarea'))) return
      if (guide) return
      if (e.key === '?') { e.preventDefault(); showGuide(true); return }
      if (menu) return
      if (e.key === 'Escape') { if (view !== 'world') setView('world'); else setMenu(true); return }
      if (e.code === 'Space' && !(e.target instanceof HTMLElement && e.target.closest('button'))) {e.preventDefault(); setRunning(value => !value)}
      if (e.key === '.') step()
      if (['1','2','3','4'].includes(e.key)) setView(views[Number(e.key) - 1].id)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menu, view, guide, step])
  const state = chronicle?.history[chronicle.history.length - 1]
  if (!state || !chronicle) return <main data-ready="false" className="boot">
    <img src="/ripple-mark.svg" width="64" height="64" alt=""/><h1>Ripple</h1><p role="status">{problem || 'Loading your island…'}</p>
    {problem && <button className="primary" onClick={() => window.location.reload()}>Reload game</button>}
  </main>
  function enter() { hasEntered.current = true; setView('world'); setMenu(false) }
  function cast(power: Power) {
    update(previous => previous && castPower(previous, power))
    setEffect(previous => ({power, serial: (previous?.serial ?? 0) + 1}))
  }
  const lastPower = chronicle.lastPower
  const panelOpen = !menu && view !== 'world'
  const panelTitle = view === 'powers' ? 'God powers' : view === 'timelines' ? 'Timelines' : 'Village records'
  const weather = state.weather === 'clear' ? 'Clear' : state.weather === 'sun' ? 'Sunshine' : state.weather === 'bloom' ? 'Harvest blessing' : state.weather === 'storm' ? 'Storm' : 'Rain'
  const WeatherIcon = powers.find(p => p.id === state.weather)?.Icon ?? Sun
  return <main className={'game ' + (menu ? 'menu' : 'playing') + (panelOpen ? ' panel-open' : '')} data-ready={ready}>
    <div className="world-stage"><World seed={state.seed} population={state.population} menu={menu} effect={effect} onReady={onReady}/></div>
    {menu ? <>
      <header className="menu-header">
        <div className="menu-mark"><img src="/ripple-mark.svg" height="43" width="43" alt=""/></div>
        <button className="help-link" onClick={() => showGuide(true)}><BookOpen size={16}/> How to play</button>
      </header>
      <div className="menu-intro">
        <h1>Ripple<span>Gods of Consequence</span></h1>
        <p>{name} grows its own wheat. You decide whether the fields get rain or another day of sun.</p>
        <button className="primary enter" disabled={!ready} onClick={enter}>{!ready ? 'Loading island…' : hasEntered.current ? 'Resume' : 'Play'}<ArrowRight size={18}/></button>
      </div>
      <footer className="menu-footer"><div><MapPin size={17}/><span>{name}</span></div><span>Day {state.day} · {state.population} {state.population === 1 ? 'villager' : 'villagers'}</span></footer>
    </> : <>
      <header className="masthead">
        <button className="wordmark" aria-label="Return to main menu" onClick={() => setMenu(true)}><img src="/ripple-mark.svg" height="36" width="36" alt=""/><span>Ripple</span></button>
        <nav className="views" aria-label="Island views">{views.map(({id,title,Icon}) => <button key={id} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}><Icon size={17}/><span>{title}</span></button>)}</nav>
        <button className="guide-button" aria-label="How to play" onClick={() => showGuide(true)}><BookOpen size={17}/><span>How to play</span></button>
      </header>
      <div className="map-ui">
        <div className="map-heading"><h1>{name}</h1>
          <div className="map-status"><span className={'status-dot ' + (running ? '' : 'paused')}/>Day {state.day} <i/>{running ? 'Running' : 'Paused'}</div>
        </div>
        <div className="weather-chip"><WeatherIcon size={16}/>{weather}</div>
        <div className="map-tools"><div className="camera-hint"><MousePointer2 size={14}/><span>Drag to rotate <i>·</i> Scroll to zoom</span></div>
          <div className="time-controls">
            <button className="clock-toggle" aria-label={running ? 'Pause time' : 'Resume time'} onClick={() => setRunning(!running)}>{running ? <Pause size={15}/> : <Play size={15}/>}</button>
            <button title="Change clock speed" aria-label={`Clock speed ${speed}×. Change speed`} onClick={() => setSpeed(speed === 4 ? 1 : speed * 2)}>{speed}×</button>
            <button aria-label="Advance one day" onClick={step}><SkipForward size={15}/></button>
          </div>
        </div>
      </div>
      {panelOpen && <aside className={'inspector paper ' + view} aria-label={panelTitle}><div className="panel-top"><h2>{panelTitle}</h2>
        <button className="icon-button" aria-label={`Close ${panelTitle.toLowerCase()}`} onClick={() => setView('world')}><X size={17}/></button></div>
        {view === 'powers' && <><p className="panel-intro">Each power replaces the current weather as soon as you use it.</p>
          <div className="power-list">{powers.map(({id,name,Icon,description}) => <button aria-label={name} aria-describedby={`power-${id}-description`} key={id} className={'power ' + id + (lastPower?.power === id ? ' used' : '')} onClick={() => cast(id)}>
            <span className="power-icon"><Icon size={23} strokeWidth={1.55}/></span><span className="power-copy"><strong>{name}</strong><small id={`power-${id}-description`}>{description}</small></span><ChevronRight size={16}/></button>)}</div>
          <div role="status" aria-atomic="true">
            {lastPower && <div className="intervention">
              <div className="section-caption"><Check size={14}/> Last used on day {lastPower.day}</div>
              <p>{powers.find(p => p.id === lastPower.power)?.past}</p>
            </div>}
          </div>
        </>}
        {view === 'civilization' && <Civilization history={chronicle.history}/>}
        {view === 'timelines' && <Timelines current={state}/>}
      </aside>}
      <footer className="resource-bar" aria-label="Village totals">
        {metrics.map(({id,label,Icon}) => <div className={'resource ' + id} key={id}><Icon size={22} strokeWidth={1.65}/><div><span>{label}</span><strong>{state[id].toLocaleString()}{id === 'faith' && <small> / 100</small>}</strong></div></div>)}
      </footer>
    </>}
    {guide && <Dialog onClose={() => showGuide(false)}>
      <h2 id="guide-title">How to play</h2>
      <p>Keep an eye on the food and water. If either runs too low, the village starts losing people. You can try a power on a copy of the island in Timelines.</p>
      <h3>Look around</h3><p>Drag the map to turn the island. Use a mouse wheel or scroll on a trackpad to zoom.</p>
      <h3>Keyboard shortcuts</h3><dl>{shortcuts.map(([key,action]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl>
      <button className="primary dark full" onClick={() => showGuide(false)}>Back to {menu ? 'menu' : 'island'} <ArrowRight size={16}/></button>
    </Dialog>}
  </main>
}
