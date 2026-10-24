import * as React from "react";
import {
  ToolcraftApp,
  type ToolcraftPanelActionHandler,
} from "@/toolcraft/runtime/react";
import { appComposition } from "../app/app-composition";
import { AirCanvas } from "../components/AirCanvas";

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

const PRESETS: Record<string, { latitude: number; longitude: number }> = {
  presetSF: { latitude: 37.77, longitude: -122.42 },
  presetBeijing: { latitude: 39.9, longitude: 116.4 },
  presetDelhi: { latitude: 28.6, longitude: 77.2 },
  presetSydney: { latitude: -33.86, longitude: 151.2 },
};

const handlePanelAction: ToolcraftPanelActionHandler = ({ action, dispatch }) => {
  const preset = PRESETS[action.value];
  if (!preset) return;
  dispatch({ type: "controls.setValue", target: "latitude", value: preset.latitude, label: "Latitude" });
  dispatch({ type: "controls.setValue", target: "longitude", value: preset.longitude, label: "Longitude" });
};

export function AppHome(): React.JSX.Element {
  const quietZoneRef = React.useRef<((data: any) => void) | null>(null);
  const [qzVisible, setQzVisible] = React.useState(false);
  const [qzData, setQzData] = React.useState<{
    aqi: number;
    pm25: string;
    pm10: string;
    ozone: string;
    no2: string;
    co: string;
    location: string;
    source: string;
  } | null>(null);
  const qzTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hero and stamp state
  const [aqiDisplay, setAqiDisplay] = React.useState("--");
  const [stampText, setStampText] = React.useState(
    "Open-Meteo Air Quality -- loading..."
  );

  // Shared data ref (canvas writes here, route reads for chrome)
  const airDataRef = React.useRef<AirData | null>(null);

  const showQuietZone = React.useCallback((data: any) => {
    setQzData({
      aqi: data.aqi,
      pm25: data.pm25.toFixed(1) + " µg/m3",
      pm10: data.pm10.toFixed(1) + " µg/m3",
      ozone: data.ozone.toFixed(1) + " µg/m3",
      no2: data.no2.toFixed(1) + " µg/m3",
      co: Math.round(data.co) + " µg/m3",
      location: data.location,
      source: data.isFallback ? "fallback (computed)" : "open-meteo.com",
    });
    setQzVisible(true);
    if (qzTimerRef.current) clearTimeout(qzTimerRef.current);
    qzTimerRef.current = setTimeout(() => setQzVisible(false), 3000);
  }, []);

  React.useEffect(() => {
    quietZoneRef.current = showQuietZone;
    return () => {
      quietZoneRef.current = null;
    };
  }, [showQuietZone]);

  return (
    <div className="relative w-full h-full">
      <ToolcraftApp
        schema={appComposition.schema}
        canvasContent={
          <AirCanvas
            quietZoneRef={quietZoneRef}
            airDataRef={airDataRef}
            onDataUpdate={(data: AirData) => {
              setAqiDisplay(String(data.aqi));
              setStampText(
                `Open-Meteo Air Quality -- ${data.locationName} -- AQI ${data.aqi} -- ${
                  data.isFallback ? "fallback" : "live"
                }`
              );
            }}
          />
        }
        renderDefaultCanvasMedia={false}
        onPanelAction={handlePanelAction}
      />

      {/* Chrome overlays */}
      <div id="hero-stats">
        <div className="hero-value">{aqiDisplay}</div>
        <div className="hero-label">air quality index (AQI)</div>
      </div>

      <div id="data-stamp">{stampText}</div>

      <div id="desc">
        Air quality visualized as a living atmospheric landscape -- PM2.5 particles drift and glow, AQI drives the scene color
      </div>

      <div id="legend">
        <span style={{ color: "#76ff03" }}>clean</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        <span style={{ color: "#ffab00" }}>moderate</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        <span style={{ color: "#ff6d00" }}>unhealthy</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        <span style={{ color: "#dd2c00" }}>hazardous</span>
        <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
        tap for details
      </div>

      <div id="quiet-zone" className={qzVisible ? "visible" : ""}>
        {qzData && (
          <div className="qz-card">
            <div className="qz-title">Air Quality -- {qzData.location}</div>
            <div className="qz-row">
              <span className="qz-label">AQI</span>
              <span className="qz-value">{qzData.aqi}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">PM2.5</span>
              <span className="qz-value">{qzData.pm25}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">PM10</span>
              <span className="qz-value">{qzData.pm10}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">Ozone</span>
              <span className="qz-value">{qzData.ozone}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">NO2</span>
              <span className="qz-value">{qzData.no2}</span>
            </div>
            <div className="qz-row">
              <span className="qz-label">CO</span>
              <span className="qz-value">{qzData.co}</span>
            </div>
            <a
              className="qz-link"
              href="https://open-meteo.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Data: {qzData.source} &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
