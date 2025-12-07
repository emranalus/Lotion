import type { Task as TaskType } from "../types";
import TaskCard from "./TaskCard";

interface ColumnProps {
  title: string;
  tasks: TaskType[];
  moveTask: (taskId: string, targetColumn: TaskType["column"]) => void;
  deleteTask: (taskId: string) => void;
}

export default function Column({ title, tasks, moveTask, deleteTask }: ColumnProps) {
  return (
    <div className="column">
      <h2>{title}</h2>
      <div className="task-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            moveTask={moveTask}
            deleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}
