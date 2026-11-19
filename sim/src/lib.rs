//! A deterministic island economy. Each calculation uses a single island snapshot.

#![cfg(any(target_arch = "wasm32", test))]

const CLEAR: i32 = 0;
const RAIN: i32 = 1;
const SUN: i32 = 2;
const BLOOM: i32 = 3;
const STORM: i32 = 4;

#[repr(C)]
#[derive(Clone, Copy, Default, Debug, Eq, PartialEq)]
pub struct Island {
    seed: u32,
    day: i32,
    population: i32,
    food: i32,
    water: i32,
    faith: i32,
    weather: i32,
    weather_days: i32,
    soil: i32,
    growth: i32,
}

fn season_noise(seed: u32, day: i32) -> u32 {
    let mut value = seed ^ (day as u32).wrapping_mul(0x9e3779b9);
    value = (value ^ (value >> 16)).wrapping_mul(0x21f0aaad);
    value = (value ^ (value >> 15)).wrapping_mul(0x735a2d97);
    value ^ (value >> 15)
}

impl Island {
    fn settle(seed: u32) -> Self {
        let variety = season_noise(seed, 1);
        Self {
            seed,
            day: 1,
            population: 34 + (variety % 16) as i32,
            food: 85 + ((variety >> 8) % 38) as i32,
            water: 72 + ((variety >> 16) % 26) as i32,
            faith: 48,
            weather: CLEAR,
            weather_days: 2,
            soil: 60,
            growth: 0,
        }
    }

    fn next_day(&mut self) {
        self.day = self.day.saturating_add(1);
        let variation = season_noise(self.seed, self.day);
        if self.weather_days == 0 {
            self.weather = match variation % 16 {
                0 => STORM,
                1..=4 => RAIN,
                5..=9 => SUN,
                _ => CLEAR,
            };
            self.weather_days = 2 + ((variation >> 8) % 3) as i32;
        }
        self.weather_days -= 1;

        let (rainfall, extra_food, soil_change) = match self.weather {
            RAIN => (16, 0, 4),
            SUN => (0, 6, -4),
            BLOOM => (5, 11, 2),
            STORM => (19, -8, -3),
            _ => (6, 2, -1),
        };
        let demand = (self.population + 5) / 6;
        self.soil = (self.soil + soil_change).clamp(0, 100);
        // Stored water keeps dry fields productive until the cistern runs low.
        let harvest = 2 + self.soil / 12 + extra_food + (variation % 5) as i32;
        let rationed_harvest = if self.water < demand * 2 { harvest / 2 } else { harvest };
        self.food = (self.food + rationed_harvest - demand).clamp(0, 300);
        self.water = (self.water + rainfall + ((variation >> 12) % 4) as i32 - demand).clamp(0, 250);

        let short_rations = self.food < demand || self.water < demand;
        if short_rations {
            self.faith = (self.faith - 3).max(0);
            self.population = (self.population - 1).max(0);
            self.growth = 0;
        } else if self.population > 0 {
            let surplus = self.food > demand * 4 && self.water > demand * 4;
            self.growth += if surplus { 3 + self.faith / 22 } else { 1 };
            self.population += self.growth / 12;
            self.growth %= 12;
        }
    }

    fn invoke(&mut self, power: i32) {
        let (food, water, soil, faith, days) = match power {
            RAIN => (2, 32, 10, 4, 5),
            SUN => (18, -12, -5, 3, 4),
            BLOOM => (30, -4, 18, 8, 6),
            STORM => (-26, 28, -10, -14, 3),
            _ => return,
        };
        self.weather = power;
        self.weather_days = days;
        self.food = (self.food + food).clamp(0, 300);
        self.water = (self.water + water).clamp(0, 250);
        self.soil = (self.soil + soil).clamp(0, 100);
        self.faith = (self.faith + faith).clamp(0, 100);
        if power == STORM {
            self.population = (self.population - (1 + self.population / 30)).max(0);
            self.growth = 0;
        }
    }
}

// The JavaScript host copies an entire Island into this exchange buffer before a
// transition and copies the result out immediately. Timelines live in the host.
#[cfg(target_arch = "wasm32")]
mod abi {
    use super::Island;
    use std::mem::MaybeUninit;

    static mut EXCHANGE: MaybeUninit<Island> = MaybeUninit::zeroed();

    #[no_mangle]
    pub extern "C" fn snapshot_ptr() -> *mut Island {
        std::ptr::addr_of_mut!(EXCHANGE).cast()
    }

    #[no_mangle]
    pub extern "C" fn settle(seed: u32) {
        unsafe { snapshot_ptr().write(Island::settle(seed)) }
    }

    #[no_mangle]
    pub extern "C" fn next_day() {
        unsafe { (*snapshot_ptr()).next_day() }
    }

    #[no_mangle]
    pub extern "C" fn invoke(power: i32) {
        unsafe { (*snapshot_ptr()).invoke(power) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sunshine_and_rain_change_the_following_harvest() {
        let mut wet = Island::settle(871);
        let mut dry = wet;
        wet.invoke(RAIN);
        dry.invoke(SUN);
        for _ in 0..3 {
            wet.next_day();
            dry.next_day();
        }
        assert!(wet.water > dry.water);
        assert!(wet.soil > dry.soil);
        assert!(dry.food > wet.food);
        assert_eq!(wet.day, 4);
    }

    #[test]
    fn varying_weather_preserves_resource_and_population_bounds() {
        for seed in 0..32 {
            let mut island = Island::settle(seed);
            for _ in 0..1500 {
                island.next_day();
                assert!((0..=300).contains(&island.food));
                assert!((0..=250).contains(&island.water));
                assert!((0..=100).contains(&island.soil));
                assert!((0..=100).contains(&island.faith));
                assert!(island.population >= 0);
            }
        }
    }
}
