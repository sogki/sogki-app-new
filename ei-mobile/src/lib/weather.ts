import * as Location from 'expo-location';
import type { LifeWeather } from './types';

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

/** WMO weather interpretation codes → short English label. */
export function conditionFromCode(code: number | undefined): string {
  if (code == null || Number.isNaN(code)) return 'Unknown';
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

async function reverseLabel(lat: number, lon: number): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const p = places[0];
    if (!p) return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const city = p.city || p.subregion || p.district || p.name;
    const area = p.region;
    if (city && area && city !== area) return `${city}, ${area}`;
    if (city) return city;
    if (area) return area;
    if (p.postalCode) return p.postalCode;
  } catch {
    /* fall through */
  }
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

export async function fetchWeatherAt(
  lat: number,
  lon: number,
  locationLabel?: string
): Promise<LifeWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=4`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = (await res.json()) as OpenMeteoResponse;

  const temp = Math.round(data.current?.temperature_2m ?? 0);
  const code = data.current?.weather_code;
  const highs = data.daily?.temperature_2m_max ?? [];
  const lows = data.daily?.temperature_2m_min ?? [];
  const codes = data.daily?.weather_code ?? [];
  const days = data.daily?.time ?? [];

  const forecast = days.slice(0, 4).map((day, i) => ({
    day: dayLabel(day),
    highC: Math.round(highs[i] ?? temp),
    lowC: Math.round(lows[i] ?? temp),
    condition: conditionFromCode(codes[i]),
  }));

  const location = locationLabel?.trim() || (await reverseLabel(lat, lon));

  return {
    location,
    temperatureC: temp,
    condition: conditionFromCode(code),
    highC: Math.round(highs[0] ?? temp),
    lowC: Math.round(lows[0] ?? temp),
    forecast,
  };
}

/**
 * Live weather for the device’s current position.
 * Falls back to IP-based coords if GPS permission is denied.
 */
export async function fetchLiveWeather(): Promise<LifeWeather> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status === 'granted') {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return fetchWeatherAt(pos.coords.latitude, pos.coords.longitude);
  }

  // Network geo fallback (city-level, not GPS)
  const ipRes = await fetch('https://ipapi.co/json/', {
    headers: { Accept: 'application/json' },
  });
  if (!ipRes.ok) {
    throw new Error('Location permission is off and network location failed.');
  }
  const geo = (await ipRes.json()) as {
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
  };
  if (geo.latitude == null || geo.longitude == null) {
    throw new Error('Could not determine your location for weather.');
  }
  const label = [geo.city, geo.region].filter(Boolean).join(', ') || undefined;
  return fetchWeatherAt(geo.latitude, geo.longitude, label);
}
