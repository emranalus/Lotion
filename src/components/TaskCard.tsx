import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  moveTask: (taskId: string, targetColumn: Task["column"]) => void;
  updateTask: (taskId: string, newTitle: string) => void;
  deleteTask: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, updateTask, deleteTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setEditedTitle(task.title);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(task.title);
    setIsEditing(false);
  };

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
        <span className="task-title" {...listeners} style={{ cursor: "grab" }}>
          {task.title}
        </span>
      )}
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
