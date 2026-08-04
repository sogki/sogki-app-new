import { CloudSun } from 'lucide-react';
import AdminCard from '../AdminCard';
import type { LifeWeather } from '../../../lib/lifeDashboard/types';

type LifeWeatherProps = {
  weather: LifeWeather;
};

export default function LifeWeatherWidget({ weather }: LifeWeatherProps) {
  return (
    <AdminCard id="widget-weather" title="Weather" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">{weather.location}</p>
          <p className="mt-1 text-3xl font-semibold font-mono text-white tabular-nums">
            {weather.temperatureC}°
          </p>
          <p className="mt-1 text-sm text-gray-400">{weather.condition}</p>
          <p className="mt-2 text-xs text-gray-500">
            H {weather.highC}° · L {weather.lowC}°
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-purple-500/10 p-3 text-purple-300">
          <CloudSun size={22} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/5 pt-4">
        {weather.forecast.map((day) => (
          <div key={day.day} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-center">
            <p className="text-[11px] text-gray-500">{day.day}</p>
            <p className="mt-1 text-xs font-mono text-gray-200 tabular-nums">
              {day.highC}°
            </p>
            <p className="text-[10px] text-gray-600">{day.condition}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-600">Mock data — ready for weather API later.</p>
    </AdminCard>
  );
}
