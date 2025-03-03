import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ 
      id,
      disabled: (event) => {
        // Allow dragging only from elements with data-drag-handle attribute
        console.log(event);
        const target = event.target;
        return !target.hasAttribute('data-drag-handle');
      }
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative bg-gray-700 p-4 rounded-lg mb-2">
      <div 
        {...listeners} 
        data-drag-handle 
        className="absolute right-2 top-2 cursor-grab p-2 text-gray-400 hover:text-gray-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM8 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM8 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM14 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM14 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM14 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM20 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM20 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM20 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/>
        </svg>
      </div>
      {children}
    </div>
  );
}
