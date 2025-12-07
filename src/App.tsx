import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { Task } from "./types";
import Column from "./components/Column";
import "./index.css";

function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks", []);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeColumn, setActiveColumn] = useState<Task["column"]>("Not Started");

  const columns: Task["column"][] = ["Not Started", "In Progress", "Done"];

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    setTasks((prevTasks) => [
      ...prevTasks,
      { id: crypto.randomUUID(), title, column: activeColumn },
    ]);

    setNewTaskTitle("");
  };

  const moveTask = (taskId: string, targetColumn: Task["column"]) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, column: targetColumn } : t))
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <h1>Lotion</h1>
      </header>

      <div className="task-input">
        <select
          value={activeColumn}
          onChange={(e) => setActiveColumn(e.target.value as Task["column"])}
        >
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="New task title..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button onClick={addTask}>Add Task</button>
      </div>

      <div className="columns">
        {columns.map((col) => (
          <Column
            key={col}
            title={col}
            tasks={tasks.filter((t) => t.column === col)}
            moveTask={moveTask}
            deleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
