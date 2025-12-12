import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  updateTask: (taskId: string, data: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addNotification: (message: string, type: "error" | "success" | "info") => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, updateTask, deleteTask, addNotification }) => {
  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Image handling state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

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
      updateTask(task.id, { title: trimmed });
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

  /**
   * Handle Image Upload
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., 700KB)
    if (file.size > 700 * 1024) {
      addNotification("Image size exceeds 700KB limit.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      updateTask(task.id, { imageUrl: result });
    };
    reader.readAsDataURL(file);
  };

  /**
   * Render Image Preview Portal
   */
  /**
   * Handle Image Removal
   */
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    // User requested "wholesome" experience (no alerts), so just delete.
    // If we wanted safety without alerts, we could use a two-step button or undo toast.
    updateTask(task.id, { imageUrl: "" });
  };

  /**
   * Handle Scroll Wheel Zoom
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    setZoomLevel((prevZoom) => {
      const newZoom = prevZoom + delta;
      return Math.min(Math.max(0.1, newZoom), 5); // Limit zoom between 0.1x and 5x
    });
  };

  /**
   * Render Image Preview Portal
   */
  const renderPreview = () => {
    if (!showPreview || !task.imageUrl) return null;

    return createPortal(
      <div
        className="image-preview-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.8)",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
        onClick={() => setShowPreview(false)}
        onWheel={handleWheel}
      >
        <div
          className="preview-content"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "relative", textAlign: "center" }}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            src={task.imageUrl}
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              transform: `scale(${zoomLevel})`,
              transition: "transform 0.1s ease-out", // Smoother zoom transition
              borderRadius: "8px",
            }}
          />
        </div>
      </div>,
      document.body
    );
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="task-card"
    >
      {/* Task Image */}
      {task.imageUrl && !isDragging && (
        <div className="task-image-container" style={{ marginBottom: "8px" }}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <img
            src={task.imageUrl}
            alt="Task attachment"
            style={{
              width: "100%",
              height: "150px",
              objectFit: "cover",
              borderRadius: "4px",
              cursor: "zoom-in",
            }}
            onClick={() => { setShowPreview(true); setZoomLevel(1); }}
          />
          <button
            className="task-image-remove-btn"
            onClick={handleRemoveImage}
            title="Remove Image"
          >
            ✕
          </button>
        </div>
      )}

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
            {/* Image Upload Button */}
            <button onClick={() => fileInputRef.current?.click()} className="image-btn">
              🖼️ Add Image
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </>
        )}
      </div>
      {renderPreview()}
    </div>
  );
};

export default TaskCard;
