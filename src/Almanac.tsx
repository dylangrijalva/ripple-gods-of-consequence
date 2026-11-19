import { useId, useState } from 'react'
import { CloudRain, Sun, Sprout, CloudLightning, UsersRound, Wheat, Droplets, Sparkles, GitFork, ArrowRight, ArrowUpRight, CalendarDays, type LucideIcon } from 'lucide-react'
import { intervene, type State, type Power } from './simulation'
import { nextDays } from './chronicle'

export type Metric = 'population' | 'food' | 'water' | 'faith'
export const metrics: { id: Metric, label: string, unit: string, Icon: LucideIcon }[] = [
  { id: 'population', label: 'Population', unit: 'villagers', Icon: UsersRound },
  { id: 'food', label: 'Food', unit: 'units', Icon: Wheat },
  { id: 'water', label: 'Water', unit: 'units', Icon: Droplets },
  { id: 'faith', label: 'Faith', unit: '/ 100', Icon: Sparkles },
]
export const powers: {id: Power, name: string, description: string, past: string, Icon: LucideIcon}[] = [
  { id: 'rain', name: 'Call rain', description: 'Fill the reservoirs and water the soil.', past: 'Rain fell over the island.', Icon: CloudRain },
  { id: 'sun', name: 'Bring sunshine', description: 'Ripen the crops. Water stores fall.', past: 'Sunlight warmed the fields.', Icon: Sun },
  { id: 'bloom', name: 'Bless harvest', description: 'Feed the village and deepen its faith.', past: 'A blessing filled the granaries.', Icon: Sprout },
  { id: 'storm', name: 'Summon storm', description: 'Flood the fields and scatter villagers.', past: 'A storm swept through the village.', Icon: CloudLightning },
]
export function signed(delta: number) {
  return delta > 0 ? '+' + delta : delta.toString()
}

function HistoryChart({ history, alternate, metric }: {history: State[], alternate?: State[], metric: Metric}) {
  const [hover, setHover] = useState<number | null>(null)
  const id = useId().replace(/:/g, '')
  const length = history.length
  const active = hover === null ? length - 1 : Math.min(hover, length - 1)
  const values = [...history, ...(alternate ?? [])].map(s => s[metric])
  const min = Math.max(0, Math.min(...values) - 2)
  const max = Math.max(min + 5, Math.max(...values) + 2)
  const x = (i: number) => 8 + (i / Math.max(1, length - 1)) * 304
  const y = (n: number) => 99 - (n - min) / (max - min) * 88
  const line = (states: State[]) => states.map((s, i) => (i ? 'L' : 'M') + x(i) + ',' + y(s[metric])).join(' ')
  return <div className="history-chart">
    <div className="chart-report"><span>Day {history[active].day}</span><b>{history[active][metric]}{alternate && <em> / {alternate[active][metric]}</em>}</b></div>
    <div className="plot" onPointerMove={event => {
      const box = event.currentTarget.getBoundingClientRect()
      setHover(Math.round(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * (length - 1)))
    }} onPointerLeave={() => setHover(null)}>
      <svg viewBox="0 0 320 106" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2a7465" stopOpacity=".24"/><stop offset="1" stopColor="#2a7465" stopOpacity=".01"/></linearGradient></defs>
        {[14, 42, 70, 98].map(v => <path key={v} d={`M0 ${v} H320`} stroke="#c4c7b7" strokeDasharray="2 4"/>)}
        <path d={line(history) + ` L${x(length - 1)},103 L8,103Z`} fill={`url(#${id})`}/>
        <path d={line(history)} fill="none" stroke="#357b68" strokeWidth="2.7" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
        {alternate && <path d={line(alternate)} fill="none" stroke="#b66c35" strokeWidth="2.7" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>}
        <path d={`M${x(active)} 5 V103`} stroke="#657e72" strokeDasharray="3 5"/>
        <circle cx={x(active)} cy={y(history[active][metric])} r="3.3" fill="#357b68" stroke="#fff"/>
        {alternate && <circle cx={x(active)} cy={y(alternate[active][metric])} r="3.3" fill="#b66c35" stroke="#fff"/>}
      </svg>
      <input type="range" aria-label="Inspect chart day" aria-valuetext={`Day ${history[active].day}, ${history[active][metric]} ${metric}`} min="0" max={length - 1} value={active} onChange={e => setHover(Number(e.target.value))}/>
    </div>
    <div className="chart-axis"><span>Day {history[0].day}</span><span>Day {history[length - 1].day}</span></div>
  </div>
}

export function Civilization({history}: {history: State[]}) {
  const [metric, select] = useState<Metric>('population')
  const current = history[history.length - 1]
  const start = history[0]
  const {label, unit} = metrics.find(m => m.id === metric)!
  return <>
    <p className="panel-intro">Follow the villagers and the stores they depend on.</p>
    <div className="metric-grid">
      {metrics.map(({id, label, Icon}) => <button className={'metric-card ' + (metric === id ? 'chosen' : '')} aria-pressed={metric === id} key={id} onClick={() => select(id)}>
        <span><Icon size={17}/>{label}</span><strong>{current[id].toLocaleString()}</strong>
      </button>)}
    </div>
    <section className="chart-card"><div className="section-caption"><span className="tiny-line"/> Settlement history</div>
      <h3>{label} over time</h3>
      <HistoryChart history={history} metric={metric}/>
      <div className="chart-foot"><ArrowUpRight size={17}/><strong>{signed(current[metric] - start[metric])}</strong> {unit === '/ 100' ? 'faith' : unit} since day {start.day}</div>
    </section>
  </>
}

type Comparison = {base: State[], branch: State[], power: Power}

export function Timelines({current}: {current: State}) {
  const [fork, setFork] = useState<State | null>(null)
  const [power, select] = useState<Power>('bloom')
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [metric, setMetric] = useState<Metric>('population')
  function createBranch() {
    setFork(current)
    setComparison(null)
  }
  function compare() {
    if (fork) setComparison({base: nextDays(fork, 7), branch: nextDays(intervene(fork, power), 7), power})
  }
  return <>
    <p className="panel-intro">Give one branch a god power and see where the two islands stand seven days later.</p>
    {!fork ? <div className="fork-empty"><GitFork size={48} strokeWidth={1}/><h3>One island, two futures</h3><p>Start both timelines from your island on day {current.day}.</p><button className="primary dark" onClick={createBranch}>Create a branch <ArrowRight size={17}/></button></div> :
    <>
      <div className="branch-origin"><GitFork size={22}/><div><small>Common origin</small><strong>Day {fork.day}</strong></div><button className="text-button" onClick={createBranch}>Refork today</button></div>
      <div className="section-caption"><span className="tiny-line"/> Branch intervention</div>
      <div className="branch-powers">{powers.map(({id, Icon, name}) => <button key={id} aria-label={name} aria-pressed={power === id} className={power === id ? 'chosen' : ''} onClick={() => {select(id); setComparison(null)}}><Icon size={19}/><span>{name}</span></button>)}</div>
      {!comparison && <button className="primary dark full" onClick={compare}>Compare outcomes <ArrowRight size={16}/></button>}
      {comparison && <div className="comparison">
        <div className="chart-title"><div className="section-caption"><CalendarDays size={13}/> Day {comparison.base[7].day}</div><h3>Seven days later</h3></div>
        <table><thead><tr><th>Measure</th><th>Untouched</th><th>Branch</th></tr></thead><tbody>{metrics.map(({id, label}) => <tr key={id}><th>{label}</th><td>{comparison.base[7][id]}</td><td>{comparison.branch[7][id]} <small>({signed(comparison.branch[7][id] - comparison.base[7][id])})</small></td></tr>)}</tbody></table>
        <div className="compare-select"><label htmlFor="comparison-metric">Compare</label><select id="comparison-metric" value={metric} onChange={e => setMetric(e.target.value as Metric)}>{metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
        <div className="series-legend"><span>Untouched</span><span>Branch</span></div>
        <HistoryChart history={comparison.base} alternate={comparison.branch} metric={metric}/>
      </div>}
    </>}
  </>
}
