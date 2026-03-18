import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TYPE_ICONS = {
  image: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  video: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.263a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  ),
  iframe: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
};

const TYPE_COLORS = { image: 'bg-green-100 text-green-700', video: 'bg-blue-100 text-blue-700', iframe: 'bg-purple-100 text-purple-700' };

function Thumbnail({ item }) {
  if (item.type === 'image') {
    return <img src={item.url} alt={item.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />;
  }
  if (item.type === 'video') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
      <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    </div>
  );
}

export default function ContentCard({ item, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative card overflow-hidden cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 overflow-hidden">
        <Thumbnail item={item} />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[item.type]}`}>
            {TYPE_ICONS[item.type]}
            {item.type}
          </span>
          <span className="text-xs text-gray-400">{item.duration}s</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={e => e.stopPropagation()}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* Inactive badge */}
      {!item.is_active && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-gray-800 text-white text-xs rounded">Inactivo</div>
      )}
    </div>
  );
}
