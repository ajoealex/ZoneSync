import { formatOffset } from '../lib/timezone';

export default function ZoneChips({ zones, onRemove, onReorder }) {
  function handleDrop(event, targetId) {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain');
    onReorder(draggedId, targetId);
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3.5">
      {zones.map(zone => (
        <div
          key={zone.id}
          draggable
          onDragStart={event => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', zone.id);
          }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => handleDrop(event, zone.id)}
          title="Drag to reorder"
          className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-sm text-indigo-900 cursor-grab active:cursor-grabbing transition hover:border-indigo-200"
        >
          <span>
            <strong>{zone.name}</strong> <span className="text-indigo-500">({formatOffset(zone.offsetMinutes)})</span>
          </span>
          <button
            type="button"
            aria-label={`Remove ${zone.name}`}
            onClick={event => {
              event.stopPropagation();
              onRemove(zone.id);
            }}
            className="text-rose-500 hover:text-rose-600 font-bold leading-none text-base"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
