import { useState } from 'react';

const PRESETS = [
  { name: 'GMT+0', offset: 0 },
  { name: 'IST', offset: 330 },
  { name: 'SGT', offset: 480 }
];

const fieldLabelClass = 'text-sm font-semibold text-slate-500';
const fieldInputClass =
  'min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 text-slate-900 px-2.5 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10';
const primaryButtonClass =
  'min-h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 whitespace-nowrap shadow-sm shadow-indigo-600/20 transition';
const secondaryButtonClass =
  'min-h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-3 text-sm font-semibold transition';

export default function ControlsPanel({ baseDate, onBaseDateChange, onAdd, onReset, onExport, onStatus }) {
  const [name, setName] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');

  function handleAdd() {
    const hoursValue = Number(hours);
    const minutesValue = Number(minutes);

    if (!Number.isFinite(hoursValue) || hoursValue < -14 || hoursValue > 14) {
      onStatus('Offset hours must be between -14 and +14.');
      return;
    }

    const sign = hoursValue < 0 ? -1 : 1;
    const total = hoursValue * 60 + sign * minutesValue;

    if (total < -14 * 60 || total > 14 * 60) {
      onStatus('The total UTC offset must be between UTC-14:00 and UTC+14:00.');
      return;
    }

    onAdd(name, total);
    setName('');
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="baseDate" className={fieldLabelClass}>
            Base date
          </label>
          <input
            id="baseDate"
            type="date"
            value={baseDate}
            onChange={event => onBaseDateChange(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="timezoneName" className={fieldLabelClass}>
            Name (optional)
          </label>
          <input
            id="timezoneName"
            type="text"
            placeholder="Example: IST"
            value={name}
            onChange={event => setName(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="offsetHours" className={fieldLabelClass}>
            UTC offset hours
          </label>
          <input
            id="offsetHours"
            type="number"
            min={-14}
            max={14}
            step={1}
            value={hours}
            onChange={event => setHours(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="offsetMinutes" className={fieldLabelClass}>
            Additional minutes
          </label>
          <select
            id="offsetMinutes"
            value={minutes}
            onChange={event => setMinutes(event.target.value)}
            className={fieldInputClass}
          >
            <option value="0">00</option>
            <option value="15">15</option>
            <option value="30">30</option>
            <option value="45">45</option>
          </select>
        </div>

        <button type="button" onClick={handleAdd} className={primaryButtonClass}>
          Add timezone
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3.5">
        {PRESETS.map(preset => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onAdd(preset.name, preset.offset)}
            className={secondaryButtonClass}
          >
            Add {preset.name}
          </button>
        ))}
        <button type="button" onClick={onReset} className={secondaryButtonClass}>
          Reset to local timezone
        </button>
        <button type="button" onClick={onExport} className={secondaryButtonClass}>
          Export CSV
        </button>
      </div>
    </div>
  );
}
