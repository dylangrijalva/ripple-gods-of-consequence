import { useId, useState } from 'react'
import { CloudRain, Sun, Sprout, CloudLightning, UsersRound, Wheat, Droplets, Sparkles, GitFork, ArrowRight, CalendarDays, type LucideIcon } from 'lucide-react'
import { intervene, type State, type Power } from './simulation'
import { nextDays } from './chronicle'

export type Metric = 'population' | 'food' | 'water' | 'faith'
export const metrics: { id: Metric, label: string, Icon: LucideIcon }[] = [
  { id: 'population', label: 'Population', Icon: UsersRound },
  { id: 'food', label: 'Food', Icon: Wheat },
  { id: 'water', label: 'Water', Icon: Droplets },
  { id: 'faith', label: 'Faith', Icon: Sparkles },
]
export const powers: {id: Power, name: string, shortName: string, description: string, past: string, Icon: LucideIcon}[] = [
  { id: 'rain', name: 'Send rain', shortName: 'Rain', description: 'Five days of rain water the fields and refill the cistern.', past: 'Rain soaked the fields.', Icon: CloudRain },
  { id: 'sun', name: 'Bring out the sun', shortName: 'Sun', description: 'Four sunny days ripen the wheat. The village draws on stored water.', past: 'The sun came out over the wheat fields.', Icon: Sun },
  { id: 'bloom', name: 'Bless the harvest', shortName: 'Blessing', description: 'The village gains food and faith. The next six harvests bring in more grain.', past: 'The wheat came in early.', Icon: Sprout },
  { id: 'storm', name: 'Send a storm', shortName: 'Storm', description: 'Three days of heavy rain spoil food and cost the village lives.', past: 'A storm struck the village.', Icon: CloudLightning },
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
      <input type="range" aria-label="Day on chart" aria-valuetext={alternate
        ? `Day ${history[active].day}, ${metric} with no new power ${history[active][metric]}, with the power ${alternate[active][metric]}`
        : `Day ${history[active].day}, ${metric} ${history[active][metric]}`} min="0" max={length - 1} value={active} onChange={e => setHover(Number(e.target.value))}/>
    </div>
    <div className="chart-axis"><span>Day {history[0].day}</span><span>Day {history[length - 1].day}</span></div>
  </div>
}

export function Civilization({history}: {history: State[]}) {
  const [metric, select] = useState<Metric>('population')
  const current = history[history.length - 1]
  const start = history[0]
  const {label} = metrics.find(m => m.id === metric)!
  return <>
    <p className="panel-intro">Choose a number to see how it changed day by day.</p>
    <div className="metric-grid">
      {metrics.map(({id, label, Icon}) => <button className={'metric-card ' + (metric === id ? 'chosen' : '')} aria-pressed={metric === id} key={id} onClick={() => select(id)}>
        <span><Icon size={17}/>{label}</span><strong>{current[id].toLocaleString()}</strong>
      </button>)}
    </div>
    <section className="chart-card">
      <h3>{label} by day</h3>
      <HistoryChart history={history} metric={metric}/>
      <div className="chart-foot">Change since day {start.day} <strong>{signed(current[metric] - start[metric])}</strong></div>
    </section>
  </>
}

type Comparison = {base: State[], branch: State[]}

export function Timelines({current}: {current: State}) {
  const [fork, setFork] = useState<State | null>(null)
  const [power, select] = useState<Power>('bloom')
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [metric, setMetric] = useState<Metric>('population')
  function createBranch() {
    setFork(current)
    setComparison(null)
  }
  const chosenPower = powers.find(p => p.id === power)!
  function compare() {
    if (fork) setComparison({base: nextDays(fork, 7), branch: nextDays(intervene(fork, power), 7)})
  }
  return <>
    {!fork ? <div className="fork-empty"><GitFork size={36} strokeWidth={1.5}/><h3>Branch from day {current.day}</h3><p>Give one copy of the island a power and leave the other alone. See how each village fares over the next week.</p><button className="primary dark" onClick={createBranch}>Start a branch <ArrowRight size={17}/></button></div> :
    <>
      <div className="branch-origin"><GitFork size={22}/><div><small>Starting day</small><strong>{fork.day}</strong></div><button className="text-button" onClick={createBranch}>Use today instead</button></div>
      <div className="section-caption" id="branch-power-label">Power to try</div>
      <div className="branch-powers" role="group" aria-labelledby="branch-power-label">{powers.map(({id, Icon, description, shortName}) => <button key={id} title={description} aria-pressed={power === id} className={power === id ? 'chosen' : ''} onClick={() => {select(id); setComparison(null)}}><Icon size={19}/><span>{shortName}</span></button>)}</div>
      {!comparison && <button className="primary dark full" onClick={compare}>Run one week <ArrowRight size={16}/></button>}
      {comparison && <div className="comparison">
        <div className="chart-title"><h3>After one week</h3><div className="section-caption"><CalendarDays size={13}/> Day {comparison.base[7].day}</div></div>
        <table><thead><tr><th>Village totals</th><th>No new power</th><th>{chosenPower.shortName}</th></tr></thead><tbody>{metrics.map(({id, label}) => <tr key={id}><th>{label}</th><td>{comparison.base[7][id]}</td><td>{comparison.branch[7][id]} <small>({signed(comparison.branch[7][id] - comparison.base[7][id])})</small></td></tr>)}</tbody></table>
        <div className="compare-select"><label htmlFor="comparison-metric">Show on chart</label><select id="comparison-metric" value={metric} onChange={e => setMetric(e.target.value as Metric)}>{metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
        <div className="series-legend"><span>No new power</span><span>{chosenPower.shortName}</span></div>
        <HistoryChart history={comparison.base} alternate={comparison.branch} metric={metric}/>
      </div>}
    </>}
  </>
}
