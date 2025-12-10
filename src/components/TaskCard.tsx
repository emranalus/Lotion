import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import type { Task } from "../types";

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================
// Displays an individual task card with inline editing and drag-and-drop
// functionality. Users can edit task titles, delete tasks, or drag them
// to different columns.
// ============================================================================

interface TaskCardProps {
  task: Task;
  moveTask: (taskId: string, targetColumn: Task["column"]) => void;
  updateTask: (taskId: string, newTitle: string) => void;
  deleteTask: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, updateTask, deleteTask }) => {
  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag and drop setup from @dnd-kit/sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: task.id });

  // Apply semi-transparency while dragging
  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  /**
   * Auto-focus and select text when entering edit mode
   */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * Enter edit mode
   */
  const handleEdit = () => {
    setEditedTitle(task.title);
    setIsEditing(true);
  };

  /**
   * Save the edited title if it changed
   */
  const handleSave = () => {
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, trimmed);
    }
    setIsEditing(false);
  };

  /**
   * Cancel editing and revert to original title
   */
  const handleCancel = () => {
    setEditedTitle(task.title);
    setIsEditing(false);
  };

  /**
   * Handle keyboard shortcuts while editing
   * - Enter: Save changes
   * - Escape: Cancel editing
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="task-card"
    >
      {/* Edit mode: Show input field */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="task-title-input"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
        />
      ) : (
        /* View mode: Show title with drag handle */
        <span className="task-title" {...listeners} style={{ cursor: "grab" }}>
          {task.title}
        </span>
      )}

      {/* Action buttons (hidden during edit mode) */}
      <div className="task-actions">
        {!isEditing && (
          <>
            <button onClick={handleEdit} className="edit-btn">
              ✏️ Edit
            </button>
            <button onClick={() => deleteTask(task.id)} className="delete-btn">
              🗑 Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
