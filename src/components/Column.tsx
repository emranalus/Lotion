import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task as TaskType } from "../types";
import TaskCard from "./TaskCard";

// ============================================================================
// COLUMN COMPONENT
// ============================================================================
// Displays a column (Not Started, In Progress, or Done) containing tasks.
// Supports drag-and-drop for reordering tasks and moving them between columns.
// Highlights with green background when a task is being dragged over it.
// ============================================================================

interface ColumnProps {
  title: string;
  tasks: TaskType[];
  moveTask: (taskId: string, targetColumn: TaskType["column"]) => void;
  updateTask: (taskId: string, newTitle: string) => void;
  deleteTask: (taskId: string) => void;
}

export default function Column({ title, tasks, moveTask, updateTask, deleteTask }: ColumnProps) {
  /**
   * Setup droppable area for this column
   * Passes column metadata so we can detect which column a task is dropped on
   */
  const { setNodeRef, isOver } = useDroppable({
    id: title,
    data: {
      type: "column",
      column: title,
    },
  });

  return (
    <div className="column">
      <h2>{title}</h2>

      {/* Droppable task list area with visual feedback */}
      <div
        ref={setNodeRef}
        className="task-list"
        style={{
          backgroundColor: isOver ? "rgba(0, 255, 0, 0.1)" : undefined,
        }}
      >
        {/* SortableContext enables drag-and-drop reordering of tasks */}
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              moveTask={moveTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
