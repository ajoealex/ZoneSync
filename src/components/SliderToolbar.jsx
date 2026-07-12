import { useMemo } from 'react';
import { computeDateKey, computeInstantForIndex, formatZoneTime } from '../lib/timezone';

export default function SliderToolbar({ zones, baseDate, sliderIndex, onTimeNow }) {
  const summary = useMemo(() => {
    if (!baseDate || zones.length === 0) return '';
    const referenceZone = zones[0];
    const instantUtc = computeInstantForIndex(baseDate, referenceZone, sliderIndex);
    const referenceDateKey = computeDateKey(instantUtc, referenceZone.offsetMinutes);

    return zones
      .map(zone => {
        const { dateText, timeText, dayShift } = formatZoneTime(instantUtc, zone, referenceDateKey);
        const shiftLabel = dayShift === 1 ? ' (+1 day)' : dayShift === -1 ? ' (-1 day)' : '';
        return `${zone.name} ${dateText} ${timeText}${shiftLabel}`;
      })
      .join('   |   ');
  }, [zones, baseDate, sliderIndex]);

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <button
        type="button"
        onClick={onTimeNow}
        className="min-h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 text-sm font-semibold whitespace-nowrap shadow-sm shadow-indigo-600/20 transition"
      >
        Time Now
      </button>
      <input
        type="text"
        readOnly
        value={summary}
        aria-label="Time at slider position across timezones"
        className="flex-1 min-w-60 min-h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 px-3 font-mono text-sm tabular-nums"
      />
    </div>
  );
}
