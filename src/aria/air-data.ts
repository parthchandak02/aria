// Air quality data for Aria: Open-Meteo Air Quality API, cached per place, with an offline fallback.

export const AIR_QUALITY_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

export const POLLUTANTS = {
  no2: { apiKey: "nitrogen_dioxide", guideline: 25, label: "NO₂", name: "Nitrogen dioxide", unit: "µg/m³" },
  ozone: { apiKey: "ozone", guideline: 100, label: "O₃", name: "Ozone", unit: "µg/m³" },
  pm10: { apiKey: "pm10", guideline: 45, label: "PM10", name: "Coarse particles", unit: "µg/m³" },
  pm25: { apiKey: "pm2_5", guideline: 15, label: "PM2.5", name: "Fine particles", unit: "µg/m³" },
} as const;

export type PollutantKey = keyof typeof POLLUTANTS;
export const POLLUTANT_KEYS = ["pm25", "pm10", "no2", "ozone"] as const satisfies readonly PollutantKey[];

export type AirData = {
  current: Record<PollutantKey, number> & { carbonMonoxide: number; time: string; usAqi: number };
  hourly: { time: string[]; usAqi: number[] } & Record<PollutantKey, number[]>;
  source: "fallback" | "live";
  timezone: string;
  utcOffsetSeconds: number;
};

export type AqiBand = { color: string; label: string; max: number; note: string };

/** US EPA AQI bands. */
export const AQI_BANDS: readonly AqiBand[] = [
  { color: "#3FB68B", label: "Good", max: 50, note: "Air quality is satisfactory; little or no risk." },
  { color: "#E6C229", label: "Moderate", max: 100, note: "Acceptable; a few unusually sensitive people may be affected." },
  { color: "#F08A24", label: "Unhealthy for sensitive groups", max: 150, note: "Sensitive groups may feel effects; most people will not." },
  { color: "#E5484D", label: "Unhealthy", max: 200, note: "Everyone may begin to feel effects; limit long exertion outdoors." },
  { color: "#9B5DE5", label: "Very unhealthy", max: 300, note: "Health alert: everyone may experience more serious effects." },
  { color: "#B23A48", label: "Hazardous", max: Infinity, note: "Emergency conditions: everyone is more likely to be affected." },
];

export function aqiBand(aqi: number): AqiBand {
  return AQI_BANDS.find((band) => aqi <= band.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

function series(json: Record<string, unknown>, key: string): number[] {
  const values = (json as Record<string, unknown[]>)[key];
  return Array.isArray(values) ? values.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : 0)) : [];
}

export function parseAirQualityResponse(json: unknown): AirData | null {
  if (!json || typeof json !== "object") return null;
  const data = json as { current?: Record<string, unknown>; hourly?: Record<string, unknown>; timezone?: unknown; utc_offset_seconds?: unknown };
  if (!data.current || !data.hourly || !Array.isArray(data.hourly.time)) return null;
  const n = (key: string) => (typeof data.current?.[key] === "number" ? (data.current[key] as number) : 0);
  return {
    current: { carbonMonoxide: n("carbon_monoxide"), no2: n("nitrogen_dioxide"), ozone: n("ozone"), pm10: n("pm10"), pm25: n("pm2_5"), time: String(data.current.time ?? ""), usAqi: n("us_aqi") },
    hourly: {
      no2: series(data.hourly, "nitrogen_dioxide"),
      ozone: series(data.hourly, "ozone"),
      pm10: series(data.hourly, "pm10"),
      pm25: series(data.hourly, "pm2_5"),
      time: (data.hourly.time as unknown[]).map(String),
      usAqi: series(data.hourly, "us_aqi"),
    },
    source: "live",
    timezone: typeof data.timezone === "string" ? data.timezone : "UTC",
    utcOffsetSeconds: typeof data.utc_offset_seconds === "number" ? data.utc_offset_seconds : 0,
  };
}

/** Typical clean-air day used when the API cannot be reached (clearly labelled on the poster). */
export function fallbackAirData(): AirData {
  const hours = Array.from({ length: 48 }, (_, i) => i);
  const wave = (base: number, amp: number) => hours.map((i) => Math.round((base + amp * Math.sin((i / 24) * Math.PI * 2 - 1.2)) * 10) / 10);
  return {
    current: { carbonMonoxide: 160, no2: 9, ozone: 60, pm10: 9, pm25: 6, time: "2026-06-21T12:00", usAqi: 32 },
    hourly: { no2: wave(10, 6), ozone: wave(60, 25), pm10: wave(10, 4), pm25: wave(6, 3), time: hours.map((i) => `2026-06-${21 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`), usAqi: wave(32, 12) },
    source: "fallback",
    timezone: "UTC",
    utcOffsetSeconds: 0,
  };
}

export function airDataKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(1)},${longitude.toFixed(1)}`;
}

const cache = new Map<string, AirData>();
const pending = new Map<string, Promise<AirData>>();

export function getCachedAirData(latitude: number, longitude: number): AirData | null {
  return cache.get(airDataKey(latitude, longitude)) ?? null;
}

export function loadAirData(latitude: number, longitude: number, fetcher: typeof fetch = (...args) => fetch(...args)): Promise<AirData> {
  const key = airDataKey(latitude, longitude);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const url =
    `${AIR_QUALITY_API}?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}` +
    "&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide" +
    "&hourly=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&forecast_days=2&timezone=auto";
  const request = fetcher(url)
    .then((response) => response.json())
    .then((json) => parseAirQualityResponse(json) ?? fallbackAirData())
    .catch(() => fallbackAirData())
    .then((data) => {
      cache.set(key, data);
      pending.delete(key);
      return data;
    });
  pending.set(key, request);
  return request;
}

export function clearAirDataCache(): void {
  cache.clear();
  pending.clear();
}
