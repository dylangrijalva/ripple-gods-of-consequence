const weatherKinds = ["clear", "rain", "sun", "bloom", "storm"] as const;
type Weather = (typeof weatherKinds)[number];
export type Power = Exclude<Weather, "clear">;

export interface State {
  seed: number;
  day: number;
  population: number;
  food: number;
  water: number;
  faith: number;
  weather: Weather;
  weatherDays: number;
  soil: number;
  growth: number;
}

interface Engine {
  memory: WebAssembly.Memory;
  snapshot_ptr(): number;
  settle(seed: number): void;
  next_day(): void;
  invoke(power: number): void;
}

let engine: Engine | undefined;
let loading: Promise<void> | undefined;

async function initialize(source: string | URL) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Island simulation could not load (HTTP ${response.status}).`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
  const { memory, snapshot_ptr, settle, next_day, invoke } = instance.exports;
  if (
    !(memory instanceof WebAssembly.Memory) ||
    typeof snapshot_ptr !== "function" ||
    typeof settle !== "function" ||
    typeof next_day !== "function" ||
    typeof invoke !== "function"
  ) throw new Error("The island simulation is incompatible with this client.");
  engine = { memory, snapshot_ptr, settle, next_day, invoke } as Engine;
}

export function loadSimulation(source: string | URL = "/simulation.wasm"): Promise<void> {
  loading ??= initialize(source).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

function loaded(): Engine {
  if (!engine) throw new Error("Load the island simulation before starting a world.");
  return engine;
}

function snapshot(engine: Engine) {
  // The ten 32-bit words follow Island's repr(C) field order in sim/src/lib.rs.
  return new Uint32Array(engine.memory.buffer, engine.snapshot_ptr(), 10);
}

function read(engine: Engine): State {
  const [seed, day, population, food, water, faith, kind, weatherDays, soil, growth] = snapshot(engine);
  return { seed, day, population, food, water, faith, weather: weatherKinds[kind], weatherDays, soil, growth };
}

function restore(state: State) {
  const engine = loaded();
  snapshot(engine).set([
    state.seed, state.day, state.population, state.food, state.water, state.faith,
    weatherKinds.indexOf(state.weather), state.weatherDays, state.soil, state.growth,
  ]);
  return engine;
}

export function createWorld(seed: number): State {
  const engine = loaded();
  engine.settle(seed >>> 0);
  return read(engine);
}

export function advance(state: State): State {
  const engine = restore(state);
  engine.next_day();
  return read(engine);
}

export function intervene(state: State, power: Power): State {
  const engine = restore(state);
  engine.invoke(weatherKinds.indexOf(power));
  return read(engine);
}
