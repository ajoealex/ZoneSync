import { useEffect, useState } from 'react';
import ControlsPanel from './components/ControlsPanel';
import ZoneChips from './components/ZoneChips';
import SliderToolbar from './components/SliderToolbar';
import TimeSearch from './components/TimeSearch';
import TimezoneTable from './components/TimezoneTable';
import {
  buildTableRows,
  computeDateKey,
  computeInstantForIndex,
  createDefaultZones,
  createZoneId,
  DAY_ROWS,
  exportCsv as exportCsvFile,
  findIndexForZoneTime,
  formatOffset,
  formatZoneTime,
  indexForNow,
  loadStoredState,
  localDateValue,
  saveState,
  TOTAL_ROWS
} from './lib/timezone';

function initialState() {
  const stored = loadStoredState();
  const zones = stored && stored.zones.length > 0 ? stored.zones : createDefaultZones();
  return { zones, baseDate: localDateValue() };
}

export default function App() {
  const [initial] = useState(initialState);
  const [zones, setZones] = useState(initial.zones);
  const [baseDate, setBaseDate] = useState(initial.baseDate);
  const [status, setStatus] = useState('');
  const [sliderIndex, setSliderIndex] = useState(DAY_ROWS);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    saveState(zones);
  }, [zones]);

  useEffect(() => {
    setStatus(`${TOTAL_ROWS} rows generated for ${zones.length} timezone column${zones.length === 1 ? '' : 's'}.`);
  }, [zones, baseDate]);

  useEffect(() => {
    jumpToNow({ silent: true, scrollIntoView: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      const today = localDateValue();
      if (baseDate !== today) {
        setBaseDate(today);
      }
      jumpToNow({ silent: true });
    }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, baseDate, zones]);

  function jumpToNow({ silent = false, scrollIntoView = false } = {}) {
    const referenceZone = zones[0];
    setSliderIndex(indexForNow(baseDate, referenceZone));
    if (scrollIntoView) setScrollSignal(s => s + 1);
    if (!silent) setStatus(`Jumped to current time (${referenceZone.name}).`);
  }

  function handleBaseDateChange(nextDate) {
    setLive(false);
    setBaseDate(nextDate);
  }

  function handleTimeNow() {
    setLive(true);
    const today = localDateValue();
    if (baseDate !== today) {
      setBaseDate(today);
    }
    jumpToNow({ scrollIntoView: true });
  }

  function handleToggleLive() {
    if (live) {
      setLive(false);
      return;
    }
    handleTimeNow();
  }

  function handleSearchJump(searchZone, hour, minute, dayOffset = 0) {
    const referenceZone = zones[0];
    const rawIndex = findIndexForZoneTime(baseDate, referenceZone, searchZone, hour, minute, dayOffset);
    const index = Math.min(TOTAL_ROWS - 1, Math.max(0, rawIndex));

    setLive(false);
    setSliderIndex(index);
    setScrollSignal(s => s + 1);

    const instantUtc = computeInstantForIndex(baseDate, referenceZone, index);
    const referenceDateKey = computeDateKey(instantUtc, referenceZone.offsetMinutes);
    const { dateText, timeText } = formatZoneTime(instantUtc, searchZone, referenceDateKey);

    const outOfRange = rawIndex !== index;
    setStatus(
      `Jumped to ${timeText} on ${dateText} in ${searchZone.name} (rounded to nearest 5 minutes)${
        outOfRange ? ' — closest available row shown.' : '.'
      }`
    );
  }

  function addZone(name, offsetMinutes) {
    const trimmedName = name.trim() || formatOffset(offsetMinutes);
    const duplicate = zones.some(
      zone => zone.name.toLowerCase() === trimmedName.toLowerCase() && zone.offsetMinutes === offsetMinutes
    );

    if (duplicate) {
      setStatus(`${trimmedName} is already present.`);
      return;
    }

    setZones(prev => [...prev, { id: createZoneId(), name: trimmedName, offsetMinutes }]);
    setStatus(`${trimmedName} added.`);
  }

  function removeZone(id) {
    if (zones.length === 1) {
      setStatus('At least one timezone column must remain.');
      return;
    }
    setZones(prev => prev.filter(zone => zone.id !== id));
  }

  function moveZone(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setZones(prev => {
      const fromIndex = prev.findIndex(zone => zone.id === draggedId);
      const toIndex = prev.findIndex(zone => zone.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function restoreDefaults() {
    localStorage.removeItem('timezoneDateTimeTable.zones.v1');
    setZones(createDefaultZones());
    setBaseDate(localDateValue());
    setStatus('Default view restored.');
  }

  function handleExport() {
    exportCsvFile(zones, baseDate, buildTableRows(zones, baseDate));
  }

  return (
    <main className="max-w-[1500px] mx-auto p-6 sm:p-8 text-slate-800">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-bold tracking-tight text-slate-900">ZoneSync</h1>
          <p className="text-slate-500 mt-1.5">
            Generate a full-day comparison table in fixed 5-minute increments. Each column represents a UTC offset.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleLive}
          aria-pressed={live}
          title={
            live
              ? 'Live tracking is on — following the current time every 10 seconds.'
              : 'Turn on live tracking to keep following the current time.'
          }
          className={`min-h-9 shrink-0 rounded-lg px-3.5 text-sm font-semibold whitespace-nowrap transition inline-flex items-center gap-2 ${
            live
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
          {live ? 'Live' : 'Go live'}
        </button>
      </div>

      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-12px_rgba(15,23,42,0.12)] mb-5">
        <ControlsPanel
          baseDate={baseDate}
          onBaseDateChange={handleBaseDateChange}
          onAdd={addZone}
          onReset={restoreDefaults}
          onExport={handleExport}
          onStatus={setStatus}
        />
        <ZoneChips zones={zones} onRemove={removeZone} onReorder={moveZone} />
        <div className="mt-3 min-h-5 text-sm text-slate-500">{status}</div>
      </section>

      <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-12px_rgba(15,23,42,0.12)] mb-5 flex flex-col gap-4">
        <SliderToolbar zones={zones} baseDate={baseDate} sliderIndex={sliderIndex} onTimeNow={handleTimeNow} />
        <div className="border-t border-slate-100 pt-4">
          <TimeSearch zones={zones} baseDate={baseDate} onSearch={handleSearchJump} />
        </div>
      </section>

      <TimezoneTable
        zones={zones}
        baseDate={baseDate}
        sliderIndex={sliderIndex}
        setSliderIndex={setSliderIndex}
        onManualSeek={() => setLive(false)}
        moveZone={moveZone}
        scrollSignal={scrollSignal}
      />
    </main>
  );
}
