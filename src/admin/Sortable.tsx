/** Drag-to-reorder list (mouse, touch and keyboard: focus the handle, Space, arrows, Space). */
import type { ReactNode } from 'react';
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  onChange: (items: T[]) => void;
  render: (item: T, index: number, handle: ReactNode) => ReactNode;
  layout?: 'list' | 'grid';
  className?: string;
  label?: string;
}

export function Sortable<T>({ items, getId, onChange, render, layout = 'list', className = '', label = 'item' }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item, i) => (
            <SortableItem key={ids[i]} id={ids[i]} label={label} index={i}>
              {(handle) => render(item, i, handle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, label, index, children }: { id: string; label: string; index: number; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="admin-handle" aria-label={`Drag to reorder ${label} ${index + 1}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><g fill="currentColor"><circle cx="4.5" cy="3" r="1.2" /><circle cx="9.5" cy="3" r="1.2" /><circle cx="4.5" cy="7" r="1.2" /><circle cx="9.5" cy="7" r="1.2" /><circle cx="4.5" cy="11" r="1.2" /><circle cx="9.5" cy="11" r="1.2" /></g></svg>
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: 'relative' }} className={isDragging ? 'admin-dragging' : undefined}>
      {children(handle)}
    </li>
  );
}
