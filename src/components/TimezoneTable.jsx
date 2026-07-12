import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildTableRows, formatOffset, TOTAL_ROWS } from '../lib/timezone';

const STEP_KEYS = { ArrowUp: -1, ArrowDown: 1, PageUp: -12, PageDown: 12 };

export default function TimezoneTable({
  zones,
  baseDate,
  sliderIndex,
  setSliderIndex,
  liveTrackingRef,
  moveZone,
  scrollSignal
}) {
  const wrapRef = useRef(null);
  const contentRef = useRef(null);
  const tableRef = useRef(null);
  const bandRef = useRef(null);
  const metricsRef = useRef({ rowHeight: 0, firstRowTop: 0 });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const layoutBandRef = useRef(() => {});

  const [bandBox, setBandBox] = useState({ left: 0, top: 0, width: 0, height: 0, visible: false });
  const [zoneRects, setZoneRects] = useState([]);

  const rows = useMemo(() => buildTableRows(zones, baseDate), [zones, baseDate]);
  const activeRow = rows[Math.min(sliderIndex, rows.length - 1)];

  function layoutBand() {
    const table = tableRef.current;
    const content = contentRef.current;
    if (!table || !content) return;

    const tbody = table.tBodies[0];
    if (!tbody || !tbody.rows.length) {
      setBandBox(box => ({ ...box, visible: false }));
      return;
    }

    const contentRect = content.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const firstRowRect = tbody.rows[0].getBoundingClientRect();

    const rowHeight = firstRowRect.height;
    const firstRowTop = firstRowRect.top - contentRect.top;
    const left = tableRect.left - contentRect.left;
    const width = tableRect.width;

    metricsRef.current = { rowHeight, firstRowTop };

    const clampedIndex = Math.min(TOTAL_ROWS - 1, Math.max(0, sliderIndex));

    setBandBox({ left, width, height: rowHeight, top: firstRowTop + clampedIndex * rowHeight, visible: true });

    const headerRow = table.tHead.rows[0];
    setZoneRects(
      zones.map((zone, i) => {
        const th = headerRow.cells[i + 1];
        if (!th) return { left: 0, width: 0 };
        const thRect = th.getBoundingClientRect();
        return {
          left: thRect.left - contentRect.left - left,
          width: thRect.width
        };
      })
    );
  }

  layoutBandRef.current = layoutBand;

  useLayoutEffect(() => {
    layoutBandRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, baseDate]);

  useEffect(() => {
    const handleResize = () => layoutBandRef.current();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    const { rowHeight, firstRowTop } = metricsRef.current;
    setBandBox(box => ({ ...box, top: firstRowTop + sliderIndex * rowHeight }));
  }, [sliderIndex]);

  useEffect(() => {
    if (!scrollSignal) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { rowHeight, firstRowTop } = metricsRef.current;
    const targetTop = firstRowTop + sliderIndex * rowHeight;
    const desiredScrollTop = targetTop - wrap.clientHeight / 2 + rowHeight / 2;
    wrap.scrollTo({ top: Math.max(0, desiredScrollTop), behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSignal]);

  function handlePointerDown(event) {
    liveTrackingRef.current = false;
    draggingRef.current = true;
    bandRef.current.setPointerCapture(event.pointerId);
    const bandRect = bandRef.current.getBoundingClientRect();
    dragOffsetRef.current = event.clientY - bandRect.top;
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!draggingRef.current) return;
    const contentRect = contentRef.current.getBoundingClientRect();
    const { rowHeight, firstRowTop } = metricsRef.current;
    const desiredTop = event.clientY - contentRect.top - dragOffsetRef.current;
    const index = Math.round((desiredTop - firstRowTop) / rowHeight);
    setSliderIndex(Math.min(TOTAL_ROWS - 1, Math.max(0, index)));
  }

  function endDrag(event) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (bandRef.current.hasPointerCapture(event.pointerId)) {
      bandRef.current.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event) {
    if (event.key in STEP_KEYS) {
      event.preventDefault();
      liveTrackingRef.current = false;
      setSliderIndex(prev => Math.min(TOTAL_ROWS - 1, Math.max(0, prev + STEP_KEYS[event.key])));
    } else if (event.key === 'Home') {
      event.preventDefault();
      liveTrackingRef.current = false;
      setSliderIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      liveTrackingRef.current = false;
      setSliderIndex(TOTAL_ROWS - 1);
    }
  }

  function handleHeaderDrop(event, targetId) {
    event.preventDefault();
    moveZone(event.dataTransfer.getData('text/plain'), targetId);
  }

  return (
    <section
      ref={wrapRef}
      aria-live="polite"
      className="relative overflow-auto max-h-[70vh] rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-12px_rgba(15,23,42,0.12)]"
    >
      <div ref={contentRef} className="relative">
        <table ref={tableRef} className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-40 bg-indigo-50/80 backdrop-blur-sm border-b border-r border-slate-200 px-3 py-2.5 text-sm text-left font-bold text-indigo-950">
                #
              </th>
              {zones.map(zone => (
                <th
                  key={zone.id}
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', zone.id);
                  }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => handleHeaderDrop(event, zone.id)}
                  title="Drag to reorder"
                  className="sticky top-0 z-30 bg-indigo-50/80 backdrop-blur-sm border-b border-r last:border-r-0 border-slate-200 px-3 py-2.5 text-sm text-left whitespace-nowrap font-bold text-indigo-950 cursor-grab active:cursor-grabbing"
                >
                  {zone.name}
                  <br />
                  <small className="font-normal text-indigo-400">{formatOffset(zone.offsetMinutes)}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.index}
                className={`even:bg-slate-50/70 hover:bg-indigo-50/40 ${
                  row.index === sliderIndex ? 'outline outline-2 outline-indigo-500 -outline-offset-2' : ''
                }`}
              >
                <td className="sticky left-0 z-10 bg-white/95 border-b border-r border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                  {row.index + 1}
                </td>
                {row.cells.map(cell => (
                  <td
                    key={cell.zoneId}
                    className="border-b border-r last:border-r-0 border-slate-200 px-3 py-2 text-sm whitespace-nowrap tabular-nums"
                  >
                    <span className="font-bold text-slate-800">{cell.dateText}</span>
                    <span className="text-slate-400 ml-1.5">{cell.timeText}</span>
                    {cell.dayShift !== 0 && (
                      <span className="inline-block ml-1.5 text-xs font-bold text-indigo-500">
                        {cell.dayShift > 0 ? '+1 day' : '-1 day'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div
          ref={bandRef}
          role="slider"
          aria-label="Time position"
          aria-valuemin={0}
          aria-valuemax={TOTAL_ROWS - 1}
          aria-valuenow={sliderIndex}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          className="absolute z-20 cursor-ns-resize touch-none select-none border-y-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]"
          style={{
            display: bandBox.visible ? 'block' : 'none',
            left: bandBox.left,
            top: bandBox.top,
            width: bandBox.width,
            height: bandBox.height
          }}
        >
          {zones.map((zone, i) => {
            const cell = activeRow?.cells[i];
            const shiftLabel = cell?.dayShift === 1 ? ' +1d' : cell?.dayShift === -1 ? ' -1d' : '';
            return (
              <div
                key={zone.id}
                role="textbox"
                aria-readonly="true"
                aria-label={`${zone.name} date and time at slider position`}
                className="absolute top-1/2 -translate-y-1/2 h-[26px] min-h-0 border border-indigo-200 bg-white shadow-sm flex items-center gap-1.5 px-3 text-xs font-bold pointer-events-none overflow-hidden whitespace-nowrap"
                style={{ left: zoneRects[i]?.left ?? 0, width: zoneRects[i]?.width ?? 0 }}
              >
                {cell && (
                  <>
                    <span className="text-slate-800">{cell.dateText}</span>
                    <span className="text-indigo-600">
                      {cell.timeText}
                      {shiftLabel}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
