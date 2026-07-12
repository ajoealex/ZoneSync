import { useEffect, useMemo, useState } from 'react';
import { formatDateLabel, formatOffset, parseTimeInput, shiftDateString } from '../lib/timezone';

const fieldLabelClass = 'text-sm font-semibold text-slate-500';
const fieldInputClass =
  'min-h-9 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 px-2.5 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10';

export default function TimeSearch({ zones, baseDate, onSearch }) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [format, setFormat] = useState('24');
  const [time, setTime] = useState('');
  const [meridiem, setMeridiem] = useState('AM');
  const [dayOffset, setDayOffset] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!zones.some(zone => zone.id === zoneId)) {
      setZoneId(zones[0]?.id ?? '');
    }
  }, [zones, zoneId]);

  const dayOptions = useMemo(
    () => [
      { value: '-1', label: `${formatDateLabel(shiftDateString(baseDate, -1))} · Previous day` },
      { value: '0', label: `${formatDateLabel(baseDate)} · Base day` },
      { value: '1', label: `${formatDateLabel(shiftDateString(baseDate, 1))} · Next day` }
    ],
    [baseDate]
  );

  function handleSubmit(event) {
    event.preventDefault();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    const parsed = parseTimeInput(time, format, meridiem);
    if (!parsed) {
      setError(format === '24' ? 'Enter a time like 14:30.' : 'Enter a time like 02:30.');
      return;
    }

    setError('');
    onSearch(zone, parsed.hour, parsed.minute, Number(dayOffset));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2.5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="searchZone" className={fieldLabelClass}>
          Find time in
        </label>
        <select
          id="searchZone"
          value={zoneId}
          onChange={event => setZoneId(event.target.value)}
          className={`${fieldInputClass} min-w-52`}
        >
          {zones.map(zone => (
            <option key={zone.id} value={zone.id}>
              {zone.name} ({formatOffset(zone.offsetMinutes)})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="searchDate" className={fieldLabelClass}>
          On date
        </label>
        <select
          id="searchDate"
          value={dayOffset}
          onChange={event => setDayOffset(event.target.value)}
          className={`${fieldInputClass} min-w-44`}
        >
          {dayOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>Format</span>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setFormat('24')}
            className={`min-h-9 px-3 text-sm font-semibold transition ${
              format === '24' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            24h
          </button>
          <button
            type="button"
            onClick={() => setFormat('12')}
            className={`min-h-9 px-3 text-sm font-semibold transition border-l border-slate-200 ${
              format === '12' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            12h
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="searchTime" className={fieldLabelClass}>
          Time
        </label>
        <input
          id="searchTime"
          type="text"
          inputMode="numeric"
          value={time}
          onChange={event => setTime(event.target.value)}
          placeholder={format === '24' ? 'e.g. 14:30' : 'e.g. 02:30'}
          className={`${fieldInputClass} w-28`}
        />
      </div>

      {format === '12' && (
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>&nbsp;</span>
          <select
            value={meridiem}
            onChange={event => setMeridiem(event.target.value)}
            className={fieldInputClass}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        className="min-h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 text-sm font-semibold whitespace-nowrap shadow-sm shadow-indigo-600/20 transition"
      >
        Go to time
      </button>

      {error && <span className="text-rose-600 text-sm">{error}</span>}
    </form>
  );
}
