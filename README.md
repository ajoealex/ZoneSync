# ZoneSync

Live app: [https://ajoealex.github.io/ZoneSync/](https://ajoealex.github.io/ZoneSync/)

A visual tool for comparing date and time across multiple timezones side by side.

## What it does

- **Add timezones** by UTC offset (hours + minutes), with a custom name, or use the quick presets (GMT+0, IST, SGT). Columns can be reordered by dragging, and removed individually.
- **3-day comparison table**: for a chosen base date, the table shows the previous day, the base day, and the next day in 5-minute increments for every added timezone. Each cell shows that zone's local date and time, with a `+1 day` / `-1 day` badge when its calendar date differs from the reference column.
- **Draggable time slider**: a band overlays the table and can be dragged vertically (or moved with arrow keys / Page Up/Down / Home / End) to scrub through the day. It shows a small chip over each timezone column with that zone's date and time at the selected row, and highlights the active row.
- **Time Now**: jumps the slider to the current moment and keeps following it live, refreshing every 10 seconds, until you manually drag the slider or search for a different time.
- **Time search**: look up a specific time (12-hour or 24-hour format) in any added timezone, on the previous/base/next day, and jump the slider straight to the closest 5-minute row.
- **Export CSV**: download the full 3-day table as a CSV file.
- Your timezone list and base date are saved to `localStorage`, so they persist across visits.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) (JavaScript, no TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is written to `docs/` (configured for GitHub Pages), with relative asset paths so it works from a project subpath.
