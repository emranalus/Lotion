import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { Task } from "./types";
import Column from "./components/Column";
import "./index.css";

function App() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks", []);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeColumn, setActiveColumn] = useState<Task["column"]>("Not Started");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const columns: Task["column"][] = ["Not Started", "In Progress", "Done"];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const updateTask = (taskId: string, newTitle: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t))
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = () => {
    // All state changes handled in handleDragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine the target column
    let targetColumn: Task["column"] | undefined;

    // First, check if we dropped on a droppable column area
    if (over.data?.current?.type === "column") {
      targetColumn = over.data.current.column as Task["column"];
    }
    // Otherwise, check if we dropped on a task
    else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        targetColumn = overTask.column;
      }
    }

    if (!targetColumn) return;

    // If the column changed, use moveTask function
    if (activeTask.column !== targetColumn) {
      moveTask(active.id as string, targetColumn);
    } else {
      // Same column - handle reordering
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask && active.id !== over.id) {
        setTasks((prevTasks) => {
          const columnTasks = prevTasks.filter((t) => t.column === activeTask.column);
          const activeIndex = columnTasks.findIndex((t) => t.id === active.id);
          const overIndex = columnTasks.findIndex((t) => t.id === over.id);

          const reorderedColumnTasks = arrayMove(columnTasks, activeIndex, overIndex);

          // Merge reordered tasks with tasks from other columns
          const otherTasks = prevTasks.filter((t) => t.column !== activeTask.column);
          return [...otherTasks, ...reorderedColumnTasks];
        });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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
              updateTask={updateTask}
              deleteTask={deleteTask}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="task-card" style={{ opacity: 0.8 }}>
            <span className="task-title">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
