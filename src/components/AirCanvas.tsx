import * as React from "react";
import { useToolcraft, useToolcraftValue } from "@/toolcraft/runtime/react";

// --- Midnight palette adapted for air quality ---
const PALETTE = {
  bg: "#0a0f0d",
  layer: "#0f1a14",
  deepGreen: "#1b5e20",
  green: "#2e7d32",
  neonGreen: "#76ff03",
  bioGreen: "#b2ff59",
  warmAmber: "#ffab00",
  warmOrange: "#ff6d00",
  warmRed: "#dd2c00",
  text: "rgba(255,255,255,0.5)",
  textBright: "rgba(255,255,255,0.75)",
};

// --- AQI color mapping (European AQI: 0-100, green -> yellow -> orange -> red) ---
function aqiColor(aqi: number): string {
  if (aqi <= 20) return PALETTE.neonGreen;
  if (aqi <= 40) return "#aeea00"; // yellow-green
  if (aqi <= 60) return PALETTE.warmAmber;
  if (aqi <= 80) return PALETTE.warmOrange;
  return PALETTE.warmRed;
}

function aqiHaze(aqi: number): string {
  if (aqi <= 20) return "rgba(118,255,3,0.02)";
  if (aqi <= 40) return "rgba(174,234,0,0.04)";
  if (aqi <= 60) return "rgba(255,171,0,0.06)";
  if (aqi <= 80) return "rgba(255,109,0,0.08)";
  return "rgba(221,44,0,0.12)";
}

// --- Open-Meteo Air Quality endpoint ---
const AQ_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

interface AirData {
  aqi: number;
  pm25: number;
  pm10: number;
  ozone: number;
  no2: number;
  co: number;
  isFallback: boolean;
  locationName: string;
}

function getLocationName(lat: number, lng: number): string {
  // Simple location labels for presets
  const R = 2;
  if (Math.abs(lat - 37.77) < R && Math.abs(lng - -122.42) < R) return "San Francisco";
  if (Math.abs(lat - 39.9) < R && Math.abs(lng - 116.4) < R) return "Beijing";
  if (Math.abs(lat - 28.6) < R && Math.abs(lng - 77.2) < R) return "Delhi";
  if (Math.abs(lat - -33.86) < R && Math.abs(lng - 151.2) < R) return "Sydney";
  if (Math.abs(lat - 48.85) < R && Math.abs(lng - 2.35) < R) return "Paris";
  if (Math.abs(lat - 51.5) < R && Math.abs(lng - -0.12) < R) return "London";
  if (Math.abs(lat - 35.67) < R && Math.abs(lng - 139.65) < R) return "Tokyo";
  return `${lat.toFixed(1)}deg, ${lng.toFixed(1)}deg`;
}

const FALLBACK_DATA: AirData = {
  aqi: 25,
  pm25: 8.5,
  pm10: 18.2,
  ozone: 65.4,
  no2: 12.1,
  co: 320.0,
  isFallback: true,
  locationName: "San Francisco",
};

// --- Particle system ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

function createParticle(W: number, H: number, speed: number): Particle {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed - speed * 0.2,
    size: 1 + Math.random() * 2.5,
    opacity: 0.15 + Math.random() * 0.4,
  };
}

interface Props {
  quietZoneRef?: React.MutableRefObject<((data: any) => void) | null>;
  airDataRef?: React.MutableRefObject<AirData | null>;
  onDataUpdate?: (data: AirData) => void;
}

export function AirCanvas({ quietZoneRef, airDataRef, onDataUpdate }: Props): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const airDataStateRef = React.useRef<AirData>(FALLBACK_DATA);
  const animRef = React.useRef<number>(0);
  const lastFetchRef = React.useRef<number>(0);
  const interactionRef = React.useRef<{ x: number; y: number; t: number } | null>(null);

  const particleDensity = (useToolcraftValue("particleDensity") as number) ?? 1.0;
  const driftSpeed = (useToolcraftValue("driftSpeed") as number) ?? 1.0;
  // The render loop is set up once, so it reads the sliders through refs to see changes.
  const particleDensityRef = React.useRef(particleDensity);
  const driftSpeedRef = React.useRef(driftSpeed);
  particleDensityRef.current = particleDensity;
  driftSpeedRef.current = driftSpeed;
  const onDataUpdateRef = React.useRef(onDataUpdate);
  onDataUpdateRef.current = onDataUpdate;
  const fetchIdRef = React.useRef(0);

  // --- Fetch air quality data ---
  const fetchAirData = React.useCallback(async (lat: number, lng: number) => {
    const fetchId = ++fetchIdRef.current;
    let data: AirData;
    try {
      const url = `${AQ_BASE}?latitude=${lat}&longitude=${lng}&current=european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.current) throw new Error("No data");
      data = {
        aqi: json.current.european_aqi ?? 0,
        pm25: json.current.pm2_5 ?? 0,
        pm10: json.current.pm10 ?? 0,
        ozone: json.current.ozone ?? 0,
        no2: json.current.nitrogen_dioxide ?? 0,
        co: json.current.carbon_monoxide ?? 0,
        isFallback: false,
        locationName: getLocationName(lat, lng),
      };
      lastFetchRef.current = performance.now();
    } catch {
      data = {
        ...FALLBACK_DATA,
        locationName: getLocationName(lat, lng),
      };
    }
    // Ignore responses for a location the user has already moved away from.
    if (fetchId !== fetchIdRef.current) return;
    airDataStateRef.current = data;
    if (airDataRef) airDataRef.current = data;
    onDataUpdateRef.current?.(data);
  }, [airDataRef]);

  const lat = (useToolcraftValue("latitude") as number) ?? 37.77;
  const lng = (useToolcraftValue("longitude") as number) ?? -122.42;

  // Fetch on mount and when location changes (debounced while a slider is dragged),
  // then refresh the current location every minute.
  React.useEffect(() => {
    const timeout = setTimeout(() => fetchAirData(lat, lng), 300);
    const interval = setInterval(() => fetchAirData(lat, lng), 60000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [lat, lng, fetchAirData]);

  // --- Fit the output to the viewport ---
  // The Toolcraft template defaults to a fixed 1920x1080 output, which is scaled down into the
  // workspace and leaves most of the screen black. Size the output to the window instead.
  const { dispatch } = useToolcraft();
  React.useEffect(() => {
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        dispatch({
          type: "canvas.setSize",
          size: { width: window.innerWidth, height: window.innerHeight, unit: "px" },
        });
        // The template's workspace has a 1024px minimum width; on narrower screens shift the
        // output so it lines up with the visible window instead of the workspace centre.
        const workspace = canvasRef.current?.closest<HTMLElement>('[class*="group/canvas"]');
        const overflow = workspace ? workspace.clientWidth - window.innerWidth : 0;
        dispatch({ type: "canvas.setOffset", offset: { x: -Math.max(0, overflow) / 2, y: 0 } });
        dispatch({ type: "canvas.zoomReset" });
      });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", fit);
    };
  }, [dispatch]);

  // --- Canvas render loop ---
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let W: number, H: number;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      const ctx = canvas!.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Init particles
    const particleCount = Math.floor(40 * particleDensityRef.current);
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(W, H, 0.6 * driftSpeedRef.current)
    );
    const particles = particlesRef.current;

    let lastTime = performance.now();

    function render(time: number) {
      const ctx = canvas!.getContext("2d")!;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const particleDensity = particleDensityRef.current;
      const driftSpeed = driftSpeedRef.current;
      const ad = airDataStateRef.current;
      const aqi = ad.aqi;
      const pm25 = ad.pm25;
      const coFactor = Math.min(ad.co / 2000, 1);

      // Resize particles if density changed
      const targetCount = Math.floor(40 * particleDensity);
      while (particles.length < targetCount) {
        particles.push(createParticle(W, H, 0.6 * driftSpeed));
      }
      while (particles.length > targetCount) {
        particles.pop();
      }

      // --- Background ---
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, W, H);

      // --- AQI haze layer ---
      const hazeColor = aqiHaze(aqi);
      ctx.fillStyle = hazeColor;
      ctx.fillRect(0, 0, W, H);

      // --- Ozone haze (upper atmosphere) ---
      const ozoneAlpha = Math.min(ad.ozone / 150, 0.15);
      const ozoneGrad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.8);
      const ozHue = ozoneAlpha > 0.08 ? "rgba(255,109,0," : "rgba(118,255,3,";
      ozoneGrad.addColorStop(0, `${ozHue}${ozoneAlpha})`);
      ozoneGrad.addColorStop(1, `${ozHue}0)`);
      ctx.fillStyle = ozoneGrad;
      ctx.fillRect(0, 0, W, H);

      // --- PM2.5 particles ---
      const speedFactor = driftSpeed * (0.5 + coFactor * 0.5);
      const sizeScale = Math.min(pm25 / 15, 1.5);

      for (const p of particles) {
        // Drift physics with slight updraft
        p.x += p.vx * speedFactor * dt * 60;
        p.y += p.vy * speedFactor * dt * 60;

        // Wrap around
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Small random perturbation
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;
        // Clamp velocity
        const maxV = 1.5 * speedFactor;
        p.vx = Math.max(-maxV, Math.min(maxV, p.vx));
        p.vy = Math.max(-maxV, Math.min(maxV, p.vy));

        // Color: tint toward warm if AQI high
        const warmTint = Math.min(aqi / 80, 1);
        const baseOpacity = p.opacity * (0.3 + 0.7 * Math.min(pm25 / 30, 1));
        const r = Math.floor(118 + warmTint * 137);
        const g = Math.floor(255 - warmTint * 200);
        const b = Math.floor(3 + warmTint * 0);
        const color = `rgba(${r},${g},${b},${baseOpacity})`;
        const sz = p.size * sizeScale;

        // Three-layer glow
        ctx.save();
        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 4);
        grad.addColorStop(0, `rgba(${r},${g},${b},${baseOpacity * 0.15})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = `rgba(255,255,255,${baseOpacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // --- Interaction glow (on tap) ---
      if (interactionRef.current) {
        const { x, y, t } = interactionRef.current;
        const elapsed = time - t;
        if (elapsed < 1000) {
          const progress = elapsed / 1000;
          const radius = 30 + progress * 60;
          const alpha = (1 - progress) * 0.3;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
          const aqiCol = aqiColor(aqi);
          grad.addColorStop(0, aqiCol.replace(")", `,${alpha})`).replace("rgb", "rgba"));
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          interactionRef.current = null;
        }
      }

      animRef.current = requestAnimationFrame(render);
    }

    // Pre-warm: set initial particles visible
    for (let i = 0; i < 3; i++) {
      // move a few frames forward so particles aren't all at (0,0)
      for (const p of particles) {
        p.x += p.vx * 2;
        p.y += p.vy * 2;
      }
    }

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []); // empty deps — canvas ref managed manually

  // --- Tap interaction ---
  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      interactionRef.current = { x, y, t: performance.now() };

      const ad = airDataStateRef.current;
      if (quietZoneRef?.current) {
        quietZoneRef.current({
          aqi: ad.aqi,
          pm25: ad.pm25,
          pm10: ad.pm10,
          ozone: ad.ozone,
          no2: ad.no2,
          co: ad.co,
          location: ad.locationName,
          isFallback: ad.isFallback,
        });
      }
    },
    [quietZoneRef]
  );

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: "manipulation", cursor: "crosshair" }}
      onClick={handleCanvasClick}
    />
  );
}
