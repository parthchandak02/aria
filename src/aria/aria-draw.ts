// Draws one Aria frame in scene coordinates. The runtime paints the Background; this is foreground.

import { aqiBand, POLLUTANTS, type AirData, type PollutantKey } from "./air-data";
import type { AriaSettings } from "./aria-settings";

const SANS = "'Avenir Next', 'Futura', 'Century Gothic', 'Helvetica Neue', Arial, sans-serif";

function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ariaInk(settings: Pick<AriaSettings, "background" | "includeBackground">): string {
  if (!settings.includeBackground) return "#F1F3F5";
  return luminance(settings.background) > 0.5 ? "#12161D" : "#F1F3F5";
}

export function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  return `rgba(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)}, ${alpha})`;
}

/** Colour for a pollutant level relative to its WHO guideline. */
export function ratioColor(ratio: number): string {
  if (ratio < 0.5) return "#3FB68B";
  if (ratio < 1) return "#E6C229";
  if (ratio < 2) return "#F08A24";
  return "#E5484D";
}

/** Small deterministic PRNG (mulberry32) so the field is stable for a place. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Number of dots in the field: proportional to the level relative to its guideline. */
export function particleCount(value: number, guideline: number): number {
  return Math.round(Math.min(3000, Math.max(60, (value / guideline) * 900)));
}

export function focusValue(data: AirData, focus: PollutantKey): number {
  return data.current[focus];
}

function tracked(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, spacing: number): void {
  let cursor = x;
  for (const char of text) {
    context.fillText(char, cursor, y);
    cursor += context.measureText(char).width + spacing;
  }
}

function localClock(data: AirData): string {
  const time = data.current.time.split("T")[1] ?? "";
  return time.slice(0, 5);
}

function wrap(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/** Centre and radius of the AQI status light, in scene units; shared with tests. */
export function statusLight(width: number, height: number): { r: number; x: number; y: number } {
  const u = Math.min(width / 1920, height / 1080);
  return { r: 46 * u, x: 96 * u + 470 * u, y: 96 * u + 22 * u + 30 * u + 70 * u + 120 * u };
}

export function drawAria(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, settings: AriaSettings, data: AirData): void {
  const u = Math.min(width / 1920, height / 1080);
  const ink = ariaInk(settings);
  const muted = withAlpha(ink, 0.6);
  const faint = withAlpha(ink, 0.14);
  const margin = 96 * u;
  const band = aqiBand(data.current.usAqi);
  context.save();
  context.textBaseline = "alphabetic";
  context.textAlign = "left";

  // ── Left column: place, AQI, band, pollutant gauges ──
  const left = margin;
  let y = margin + 22 * u;
  context.fillStyle = muted;
  context.font = `600 ${20 * u}px ${SANS}`;
  tracked(context, `${(settings.placeName ?? "Custom place").toUpperCase()}  ·  LOCAL ${localClock(data)}`, left, y, 2.6 * u);
  y += 30 * u;
  context.font = `${19 * u}px ${SANS}`;
  const lat = `${Math.abs(settings.latitude).toFixed(1)}°${settings.latitude >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(settings.longitude).toFixed(1)}°${settings.longitude >= 0 ? "E" : "W"}`;
  context.fillText(`${lat}  ${lng}  ·  ${data.timezone}`, left, y);

  y += 70 * u;
  context.font = `600 ${18 * u}px ${SANS}`;
  tracked(context, "US AIR QUALITY INDEX", left, y, 2.4 * u);
  y += 196 * u;
  // Status light in the AQI band colour, beside the number
  const light = statusLight(width, height);
  context.fillStyle = withAlpha(band.color, 0.18);
  context.beginPath();
  context.arc(light.x, light.y, light.r * 1.6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = band.color;
  context.beginPath();
  context.arc(light.x, light.y, light.r, 0, Math.PI * 2);
  context.fill();
  context.font = `200 ${220 * u}px ${SANS}`;
  context.fillText(String(Math.round(data.current.usAqi)), left - 10 * u, y);
  y += 56 * u;
  context.font = `600 ${34 * u}px ${SANS}`;
  context.fillText(band.label, left, y);
  y += 38 * u;
  context.fillStyle = muted;
  context.font = `${21 * u}px ${SANS}`;
  for (const line of wrap(context, band.note, 520 * u)) {
    context.fillText(line, left, y);
    y += 28 * u;
  }

  y += 42 * u;
  const gaugeWidth = 520 * u;
  const rows: { guideline: number; label: string; value: number }[] = [
    ...(["pm25", "pm10", "no2", "ozone"] as const).map((key) => ({ guideline: POLLUTANTS[key].guideline, label: POLLUTANTS[key].label, value: data.current[key] })),
    { guideline: 4000, label: "CO", value: data.current.carbonMonoxide },
  ];
  for (const row of rows) {
    const ratio = row.value / row.guideline;
    const focused = row.label === POLLUTANTS[settings.focus].label;
    context.fillStyle = focused ? ink : muted;
    context.font = `${focused ? 600 : 400} ${21 * u}px ${SANS}`;
    context.fillText(row.label, left, y);
    context.textAlign = "right";
    context.fillText(`${row.value.toFixed(row.value < 10 ? 1 : 0)} µg/m³`, left + gaugeWidth, y);
    context.textAlign = "left";
    const barY = y + 12 * u;
    context.fillStyle = faint;
    context.fillRect(left, barY, gaugeWidth, 6 * u);
    context.fillStyle = ratioColor(ratio);
    context.fillRect(left, barY, gaugeWidth * Math.min(1, ratio / 3), 6 * u);
    // WHO guideline tick at one third of the gauge
    context.fillStyle = withAlpha(ink, 0.7);
    context.fillRect(left + gaugeWidth / 3 - u, barY - 5 * u, 2 * u, 16 * u);
    y += 62 * u;
  }
  context.fillStyle = withAlpha(ink, 0.45);
  context.font = `${16 * u}px ${SANS}`;
  context.fillText("Tick marks the WHO guideline; the bar runs to three times it.", left, y - 14 * u);

  // ── Particle field for the chosen pollutant ──
  const fieldLeft = width * 0.42;
  const fieldRight = width - margin;
  const fieldTop = margin + 70 * u;
  const fieldBottom = height * 0.62;
  const pollutant = POLLUTANTS[settings.focus];
  const value = focusValue(data, settings.focus);
  const ratio = value / pollutant.guideline;
  const color = ratioColor(ratio);
  context.fillStyle = ink;
  context.font = `600 ${26 * u}px ${SANS}`;
  context.fillText(`${pollutant.label}  ${value.toFixed(1)} µg/m³`, fieldLeft, margin + 22 * u);
  context.fillStyle = muted;
  context.font = `${20 * u}px ${SANS}`;
  context.fillText(`${pollutant.name} · ${ratio.toFixed(1)}× the WHO guideline · one dot ≈ ${(pollutant.guideline / 900).toFixed(3)} µg/m³`, fieldLeft, margin + 52 * u);

  const random = seededRandom(Math.round((settings.latitude + 90) * 1000) * 7919 + Math.round((settings.longitude + 180) * 1000));
  const count = particleCount(value, pollutant.guideline);
  const fieldW = fieldRight - fieldLeft;
  const fieldH = fieldBottom - fieldTop;
  for (let i = 0; i < count; i += 1) {
    // Soft clustering: average two uniforms horizontally, three vertically
    const px = fieldLeft + ((random() + random()) / 2) * fieldW;
    const py = fieldTop + ((random() + random() + random()) / 3) * fieldH;
    const r = (1.2 + random() * 3.2) * u;
    context.fillStyle = withAlpha(color, 0.25 + random() * 0.6);
    context.beginPath();
    context.arc(px, py, r, 0, Math.PI * 2);
    context.fill();
  }

  // ── 48-hour forecast of the chosen pollutant ──
  const chartTop = height * 0.68;
  const chartBottom = height - margin - 10 * u;
  const series = data.hourly[settings.focus];
  const hours = Math.min(48, series.length);
  const scaleMax = Math.max(pollutant.guideline * 2, ...series.slice(0, hours));
  const slot = fieldW / Math.max(1, hours);
  const nowIndex = Math.max(0, data.hourly.time.findIndex((time) => time >= data.current.time.slice(0, 13)));
  for (let i = 0; i < hours; i += 1) {
    const h = (series[i] / scaleMax) * (chartBottom - chartTop - 20 * u);
    context.fillStyle = withAlpha(aqiBand(data.hourly.usAqi[i] ?? 0).color, i < nowIndex ? 0.35 : 0.85);
    context.fillRect(fieldLeft + i * slot + slot * 0.18, chartBottom - h, slot * 0.64, h);
  }
  const guideY = chartBottom - (pollutant.guideline / scaleMax) * (chartBottom - chartTop - 20 * u);
  context.strokeStyle = withAlpha(ink, 0.6);
  context.lineWidth = 1.5 * u;
  context.setLineDash([6 * u, 6 * u]);
  context.beginPath();
  context.moveTo(fieldLeft, guideY);
  context.lineTo(fieldRight, guideY);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = muted;
  context.font = `${16 * u}px ${SANS}`;
  context.textAlign = "right";
  context.fillText("WHO", fieldLeft - 12 * u, guideY + 5 * u);
  context.textAlign = "left";
  const nowX = fieldLeft + nowIndex * slot + slot / 2;
  context.strokeStyle = ink;
  context.lineWidth = 2 * u;
  context.beginPath();
  context.moveTo(nowX, chartTop);
  context.lineTo(nowX, chartBottom);
  context.stroke();
  context.fillStyle = ink;
  context.font = `600 ${17 * u}px ${SANS}`;
  context.fillText("now", nowX + 8 * u, chartTop + 14 * u);
  context.fillStyle = muted;
  context.font = `${16 * u}px ${SANS}`;
  context.fillText("today", fieldLeft, chartBottom + 26 * u);
  context.fillText("tomorrow", fieldLeft + 24 * slot, chartBottom + 26 * u);

  context.fillStyle = withAlpha(ink, 0.4);
  context.font = `${15 * u}px ${SANS}`;
  context.fillText(`Data: Open-Meteo Air Quality (CAMS) · ${data.source === "live" ? "live" : "offline sample"}`, left, height - margin + 30 * u);
  context.restore();
}
