import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import type { Task } from "../types";
import { Edit2, Trash2, Image, X, ZoomIn } from "lucide-react";

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
    opacity: isDragging ? 0.3 : 1,
    // transform is handled by dnd-kit context usually, but we need to ensure it's not conflicting
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
   * Handle Image Removal
   */
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        className="image-preview-overlay fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={() => setShowPreview(false)}
        onWheel={handleWheel}
      >
        <div
          className="relative max-w-[90vw] max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowPreview(false)}
            className="absolute -top-10 right-0 text-white hover:text-red-400 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={task.imageUrl}
            alt="Preview"
            className="rounded-lg shadow-2xl object-contain w-full h-full"
            style={{
              transform: `scale(${zoomLevel})`,
              transition: "transform 0.1s ease-out",
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
      className="group relative bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-neutral-700 hover:bg-neutral-800/50 transition-all duration-200"
    >
      {/* Task Image */}
      {task.imageUrl && !isDragging && (
        <div className="relative mb-3 group/image overflow-hidden rounded-lg">
          <img
            src={task.imageUrl}
            alt="Attachment"
            className="w-full h-32 object-cover transition-transform duration-300 group-hover/image:scale-105"
            onClick={() => { setShowPreview(true); setZoomLevel(1); }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-sm transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowPreview(true); setZoomLevel(1); }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white backdrop-blur-sm transition-colors"
              onClick={handleRemoveImage}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit mode: Show input field */}
      {isEditing ? (
        <div className="relative">
          <textarea
            // @ts-ignore
            ref={inputRef}
            className="w-full bg-neutral-950 border border-indigo-500/50 rounded p-2 text-sm text-white focus:outline-none resize-none min-h-[60px]"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            rows={2}
          />
          <div className="text-[10px] text-neutral-500 mt-1">Press Enter to save, Esc to cancel</div>
        </div>
      ) : (
        /* View mode: Show title with drag handle */
        <div className="flex flex-col gap-2">
          <p
            className="text-sm font-medium text-neutral-200 leading-snug break-words"
            {...listeners}
          >
            {task.title}
          </p>

          {/* Action buttons (hidden until hover) */}
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-2 border-t border-neutral-800/50 mt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
              title="Add Image"
            >
              <Image className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />

      {renderPreview()}
    </div>
  );
};

export default TaskCard;
