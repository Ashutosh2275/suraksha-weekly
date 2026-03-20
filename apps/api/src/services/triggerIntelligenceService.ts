import { TriggerEvent } from "../types.js";

const TRIGGER_SYNONYMS: Record<string, string> = {
  rain: "heavy_rain",
  heavy_rain: "heavy_rain",
  storm: "heavy_rain",
  flood: "heavy_rain",
  pollution: "severe_pollution",
  severe_pollution: "severe_pollution",
  smog: "severe_pollution",
  outage: "platform_outage",
  platform_outage: "platform_outage",
  downtime: "platform_outage",
  curfew: "curfew",
  local_restriction: "local_restriction"
};

function zoneSeed(zone: string): number {
  return [...zone.toLowerCase()].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function mockWeatherSignal(zone: string): { rainMm: number; sourceConfidence: number } {
  const seed = zoneSeed(zone);
  const rainMm = (seed % 130) + 5;
  const sourceConfidence = Math.min(0.98, 0.55 + (seed % 35) / 100);
  return { rainMm, sourceConfidence };
}

function mockAqiSignal(zone: string): { aqi: number; sourceConfidence: number } {
  const seed = zoneSeed(zone);
  const aqi = 120 + (seed % 260);
  const sourceConfidence = Math.min(0.97, 0.52 + (seed % 40) / 100);
  return { aqi, sourceConfidence };
}

function mockPlatformSignal(zone: string): { outageScore: number; sourceConfidence: number } {
  const seed = zoneSeed(zone);
  const outageScore = Math.min(1, 0.3 + (seed % 60) / 100);
  const sourceConfidence = Math.min(0.99, 0.58 + (seed % 30) / 100);
  return { outageScore, sourceConfidence };
}

function normalizeTriggerType(type: string): string {
  const normalized = type.trim().toLowerCase().replace(/\s+/g, "_");
  return TRIGGER_SYNONYMS[normalized] || normalized;
}

export interface TriggerIntakeInput {
  type: string;
  zone: string;
  confidence?: number;
  source?: "weather" | "aqi" | "platform" | "manual" | "synthetic";
  observedAt?: string;
  signals?: {
    rainMm?: number;
    aqi?: number;
    outageScore?: number;
  };
}

export interface TriggerIntelligenceResult {
  normalizedType: string;
  confidence: number;
  source: "weather" | "aqi" | "platform" | "manual" | "synthetic";
  adapter: "weather-mock" | "aqi-mock" | "fallback";
  degradedMode: boolean;
  snapshot: {
    rainMm?: number;
    aqi?: number;
    outageScore?: number;
    sourceConfidence?: number;
    notes?: string[];
  };
}

export function resolveTriggerIntelligence(input: TriggerIntakeInput): TriggerIntelligenceResult {
  const normalizedType = normalizeTriggerType(input.type);
  const source = input.source || "manual";
  const notes: string[] = [];

  const snapshot: TriggerIntelligenceResult["snapshot"] = {
    ...input.signals,
    notes
  };

  let adapter: TriggerIntelligenceResult["adapter"] = "fallback";
  let derivedConfidence: number | undefined;

  if (source === "weather") {
    const weather = mockWeatherSignal(input.zone);
    adapter = "weather-mock";
    snapshot.rainMm = snapshot.rainMm ?? weather.rainMm;
    snapshot.sourceConfidence = weather.sourceConfidence;
    derivedConfidence = weather.sourceConfidence;
    if ((snapshot.rainMm || 0) < 40) {
      notes.push("LOW_RAIN_SIGNAL");
    }
  } else if (source === "aqi") {
    const aqi = mockAqiSignal(input.zone);
    adapter = "aqi-mock";
    snapshot.aqi = snapshot.aqi ?? aqi.aqi;
    snapshot.sourceConfidence = aqi.sourceConfidence;
    derivedConfidence = aqi.sourceConfidence;
    if ((snapshot.aqi || 0) < 200) {
      notes.push("AQI_BELOW_ALERT_BAND");
    }
  } else if (source === "platform") {
    const platform = mockPlatformSignal(input.zone);
    adapter = "fallback";
    snapshot.outageScore = snapshot.outageScore ?? platform.outageScore;
    snapshot.sourceConfidence = platform.sourceConfidence;
    derivedConfidence = platform.sourceConfidence;
  } else {
    adapter = "fallback";
    snapshot.sourceConfidence = 0.72;
    derivedConfidence = 0.72;
    notes.push("NO_EXTERNAL_ADAPTER");
  }

  let degradedMode = false;
  if (source === "weather" && typeof snapshot.rainMm !== "number") {
    degradedMode = true;
    notes.push("WEATHER_SIGNAL_MISSING");
  }
  if (source === "aqi" && typeof snapshot.aqi !== "number") {
    degradedMode = true;
    notes.push("AQI_SIGNAL_MISSING");
  }
  if (source === "manual" || source === "synthetic") {
    degradedMode = true;
  }

  const baseConfidence = input.confidence ?? derivedConfidence ?? 0.7;
  const confidence = degradedMode ? Math.min(baseConfidence, 0.7) : Math.min(1, Math.max(0, baseConfidence));

  if (degradedMode) {
    notes.push("DEGRADED_MODE_ACTIVE");
  }

  return {
    normalizedType,
    confidence,
    source,
    adapter,
    degradedMode,
    snapshot
  };
}

export function buildTriggerEvent(input: TriggerIntakeInput & { id: string; createdAt: string }): TriggerEvent {
  const intel = resolveTriggerIntelligence(input);
  return {
    id: input.id,
    type: input.type,
    normalizedType: intel.normalizedType,
    source: intel.source,
    zone: input.zone,
    confidence: intel.confidence,
    adapter: intel.adapter,
    degradedMode: intel.degradedMode,
    observedAt: input.observedAt || input.createdAt,
    snapshot: intel.snapshot,
    createdAt: input.createdAt
  };
}
