import { beforeAll, expect, test } from "bun:test";
import { advance, createWorld, intervene, loadSimulation, type State } from "../src/simulation";

beforeAll(() => loadSimulation(new URL("../public/simulation.wasm", import.meta.url)));

function days(state: State, count: number) {
  for (let i = 0; i < count; i++) state = advance(state);
  return state;
}

test("the shipped Wasm replays seeded settlements exactly", () => {
  expect(days(createWorld(4294967295), 72)).toEqual(days(createWorld(4294967295), 72));
  expect(createWorld(4294967295).seed).toBe(4294967295);
  expect(createWorld(1)).not.toEqual({ ...createWorld(2), seed: 1 });
});

test("forks retain their own history when their turns are interleaved", () => {
  const origin = Object.freeze(days(createWorld(981), 5));
  let sun = intervene(origin, "sun");
  let rain = intervene(origin, "rain");
  for (let i = 0; i < 4; i++) {
    sun = advance(sun);
    rain = advance(rain);
  }
  expect(rain.water).toBeGreaterThan(sun.water);
  expect(sun.food).toBeGreaterThan(rain.food);
  expect(sun).toEqual(days(intervene(origin, "sun"), 4));
  expect(origin).toEqual(days(createWorld(981), 5));
});

test("powers affect resources and the following days of weather", () => {
  const state = createWorld(945);
  const bloom = intervene(state, "bloom");
  const storm = intervene(state, "storm");
  expect(bloom.food).toBeGreaterThan(state.food);
  expect(bloom.faith).toBeGreaterThan(state.faith);
  expect(storm.population).toBeLessThan(state.population);
  expect(storm.water).toBeGreaterThan(state.water);
  const followingDay = advance(storm);
  expect(followingDay.weather).toBe("storm");
  expect(followingDay.weatherDays).toBe(storm.weatherDays - 1);
});
