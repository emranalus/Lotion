import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task as TaskType } from "../types";
import TaskCard from "./TaskCard";

interface ColumnProps {
  title: string;
  tasks: TaskType[];
  moveTask: (taskId: string, targetColumn: TaskType["column"]) => void;
  updateTask: (taskId: string, newTitle: string) => void;
  deleteTask: (taskId: string) => void;
}

export default function Column({ title, tasks, moveTask, updateTask, deleteTask }: ColumnProps) {
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
      <div
        ref={setNodeRef}
        className="task-list"
        style={{
          backgroundColor: isOver ? "rgba(0, 255, 0, 0.1)" : undefined,
        }}
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
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
