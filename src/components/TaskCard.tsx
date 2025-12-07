import React from "react";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  moveTask: (taskId: string, targetColumn: Task["column"]) => void;
  deleteTask: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, moveTask, deleteTask }) => {
  return (
    <div className="task-card">
      <span className="task-title">{task.title}</span>
      <div className="task-actions">
        {task.column !== "Not Started" && (
          <button
            onClick={() => moveTask(task.id, "Not Started")}
            className="move-btn"
          >
            ← Not Started
          </button>
        )}
        {task.column !== "In Progress" && (
          <button
            onClick={() => moveTask(task.id, "In Progress")}
            className="move-btn"
          >
            → In Progress
          </button>
        )}
        {task.column !== "Done" && (
          <button
            onClick={() => moveTask(task.id, "Done")}
            className="move-btn"
          >
            → Done
          </button>
        )}
        <button onClick={() => deleteTask(task.id)} className="delete-btn">
          🗑 Delete
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
