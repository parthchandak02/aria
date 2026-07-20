# aria

Air quality visualized as a living atmospheric landscape. PM2.5 particles drift and glow like bioluminescent fireflies, while AQI drives the scene color from green (clean) through amber to red (hazardous).

**Visual Style:** Dark — Midnight (forest bioluminescence adapted for air quality — deep green bg, neon green particles, warm amber/orange/red for unhealthy air)

**Data Source:** Open-Meteo Air Quality API (free, no auth, CORS-friendly)

**How it works:**
- AQI (european_aqi) drives background haze color — green (#76ff03) for clean air, amber for moderate, red for hazardous
- PM2.5 concentration controls particle count, size, and glow intensity
- Ozone adds an upper-atmosphere haze layer
- Carbon monoxide affects particle drift speed
- Three-layer particle rendering (outer glow + solid core + bright center spot) creates bioluminescent effect on the dark forest background
- Toolcraft sliders let you explore air quality globally (lat/lng) and adjust visual density/speed
- Tap anywhere to reveal the full pollutant breakdown (AQI, PM2.5, PM10, Ozone, NO2, CO)

**GitHub:** https://github.com/parthchandak02/aria

**Live:** https://aria.parthchandak.info

**Tech:** Canvas 2D on Pixel Point Toolcraft + Vite. Hosted on Cloudflare Pages.
