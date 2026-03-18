import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import ContentCard from './ContentCard';

export default function ContentGallery({ screenId, content, onDelete, onReorder, onRefresh }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = content.findIndex(i => i.id === active.id);
      const newIndex = content.findIndex(i => i.id === over.id);
      onReorder(arrayMove(content, oldIndex, newIndex));
    }
  };

  if (content.length === 0) {
    return (
      <div className="p-12 text-center">
        <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-400 text-sm">Sin contenido. Agrega imágenes, videos o iframes.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={content.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {content.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              screenId={screenId}
              onDelete={() => onDelete(item.id)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
