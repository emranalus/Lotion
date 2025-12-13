import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task as TaskType } from "../types";
import TaskCard from "./TaskCard";
import { MoreHorizontal } from "lucide-react";

interface ColumnProps {
  title: string;
  tasks: TaskType[];
  moveTask: (taskId: string, targetColumn: TaskType["column"]) => void;
  updateTask: (taskId: string, data: Partial<TaskType>) => void;
  deleteTask: (taskId: string) => void;
  addNotification: (message: string, type: "error" | "success" | "info") => void;
}

export default function Column({ title, tasks, moveTask, updateTask, deleteTask, addNotification }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: title,
    data: {
      type: "column",
      column: title,
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Not Started": return "bg-neutral-800 text-neutral-400";
      case "In Progress": return "bg-amber-900/30 text-amber-500 border-amber-900/50";
      case "Done": return "bg-emerald-900/30 text-emerald-500 border-emerald-900/50";
      default: return "bg-neutral-800 text-neutral-400";
    }
  };

  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-300 tracking-wide uppercase">{title}</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(title)}`}>
            {tasks.length}
          </span>
        </div>
        <button className="text-neutral-500 hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl transition-colors duration-200 flex flex-col gap-3 p-2
          ${isOver ? "bg-neutral-800/50 ring-2 ring-indigo-500/50 ring-inset" : "bg-transparent"}
        `}
      >
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
              addNotification={addNotification}
            />
          ))}
        </SortableContext>

        {/* Visual placeholder if empty */}
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-neutral-800 rounded-lg">
            <span className="text-xs text-neutral-600 font-medium">Drop items here</span>
          </div>
        )}
      </div>
    </div>
  );
}
