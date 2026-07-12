export const INTERVAL_MINUTES = 5;
export const DAY_ROWS = Math.floor((24 * 60) / INTERVAL_MINUTES);
export const DAY_SPAN = 3;
export const TOTAL_ROWS = DAY_ROWS * DAY_SPAN;
export const STORAGE_KEY = 'timezoneDateTimeTable.zones.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatOffset(totalMinutes) {
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(totalMinutes);
  return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

export function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function createZoneId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function getBaseMidnightUtc(baseDate) {
  const [year, month, day] = baseDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 0, 0, 0);
}

// Row 0 of the table is the start of the previous day (in the reference zone),
// so the visible range always spans previous / base / next day.
export function tableStartUtc(baseDate, referenceZone) {
  const baseUtc = getBaseMidnightUtc(baseDate);
  return baseUtc - DAY_MS - referenceZone.offsetMinutes * 60000;
}

export function computeInstantForIndex(baseDate, referenceZone, index) {
  return tableStartUtc(baseDate, referenceZone) + index * INTERVAL_MINUTES * 60000;
}

export function computeDateKey(instantUtc, offsetMinutes) {
  const shifted = new Date(instantUtc + offsetMinutes * 60000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function formatZoneTime(instantUtc, zone, referenceDateKey) {
  const shifted = new Date(instantUtc + zone.offsetMinutes * 60000);
  const year = shifted.getUTCFullYear();
  const month = pad(shifted.getUTCMonth() + 1);
  const day = pad(shifted.getUTCDate());
  const hour = pad(shifted.getUTCHours());
  const minute = pad(shifted.getUTCMinutes());

  const shiftedDateKey = `${year}-${month}-${day}`;

  let dayShift = 0;
  if (shiftedDateKey > referenceDateKey) dayShift = 1;
  if (shiftedDateKey < referenceDateKey) dayShift = -1;

  return {
    dateText: `${day}-${month}-${year}`,
    timeText: `${hour}:${minute}`,
    dayShift
  };
}

export function buildTableRows(zones, baseDate) {
  if (!baseDate || zones.length === 0) return [];

  const referenceZone = zones[0];
  const rows = [];

  for (let index = 0; index < TOTAL_ROWS; index++) {
    const instantUtc = computeInstantForIndex(baseDate, referenceZone, index);
    const referenceDateKey = computeDateKey(instantUtc, referenceZone.offsetMinutes);
    rows.push({
      index,
      cells: zones.map(zone => ({
        zoneId: zone.id,
        ...formatZoneTime(instantUtc, zone, referenceDateKey)
      }))
    });
  }

  return rows;
}

export function indexForNow(baseDate, referenceZone) {
  const shifted = new Date(Date.now() + referenceZone.offsetMinutes * 60000);
  const minutesOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return DAY_ROWS + Math.round(minutesOfDay / INTERVAL_MINUTES);
}

export function parseTimeInput(timeText, format, meridiem) {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute < 0 || minute > 59) return null;

  if (format === '12') {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'AM') {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return { hour, minute };
}

// Finds the closest 5-minute row matching a wall-clock time typed in
// searchZone's local time on (baseDate + dayOffset days), expressed as an
// index in the reference-zone row grid.
export function findIndexForZoneTime(baseDate, referenceZone, searchZone, hour, minute, dayOffset = 0) {
  const baseUtc = getBaseMidnightUtc(baseDate) + dayOffset * DAY_MS;
  const wallClockAsUtc = baseUtc + (hour * 60 + minute) * 60000;
  const instantUtc = wallClockAsUtc - searchZone.offsetMinutes * 60000;

  const stepMs = INTERVAL_MINUTES * 60000;
  const roundedInstant = Math.round(instantUtc / stepMs) * stepMs;

  const startUtc = tableStartUtc(baseDate, referenceZone);
  return Math.round((roundedInstant - startUtc) / stepMs);
}

export function shiftDateString(baseDate, days) {
  const shiftedUtc = getBaseMidnightUtc(baseDate) + days * DAY_MS;
  const shifted = new Date(shiftedUtc);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function createDefaultZones() {
  const localOffsetMinutes = -new Date().getTimezoneOffset();
  const localZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local timezone';

  return [
    { id: createZoneId(), name: 'GMT+0', offsetMinutes: 0 },
    { id: createZoneId(), name: localZoneName, offsetMinutes: localOffsetMinutes }
  ];
}

export function loadStoredState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return null;

    const savedZones = Array.isArray(saved.zones)
      ? saved.zones
          .filter(
            zone =>
              zone &&
              typeof zone.name === 'string' &&
              typeof zone.offsetMinutes === 'number' &&
              zone.offsetMinutes >= -14 * 60 &&
              zone.offsetMinutes <= 14 * 60
          )
          .map(zone => ({ id: createZoneId(), name: zone.name, offsetMinutes: zone.offsetMinutes }))
      : [];

    return {
      baseDate: typeof saved.baseDate === 'string' ? saved.baseDate : '',
      zones: savedZones
    };
  } catch (error) {
    console.warn('Could not restore saved view state.', error);
    return null;
  }
}

export function saveState(baseDate, zones) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      baseDate,
      zones: zones.map(({ name, offsetMinutes }) => ({ name, offsetMinutes }))
    })
  );
}

export function exportCsv(zones, baseDate, rows) {
  const header = ['#', ...zones.map(zone => `${zone.name} (${formatOffset(zone.offsetMinutes)})`)];
  const csvRows = [header];

  for (const row of rows) {
    csvRows.push([
      String(row.index + 1),
      ...row.cells.map(cell => {
        const shift = cell.dayShift === 1 ? ' +1 day' : cell.dayShift === -1 ? ' -1 day' : '';
        return `${cell.dateText} ${cell.timeText}${shift}`;
      })
    ]);
  }

  const csv = csvRows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timezone-table-${baseDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
