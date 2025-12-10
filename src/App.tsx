import { useState, useEffect } from "react";
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
import type { Task } from "./types";
import Column from "./components/Column";
import Login from "./components/Login";
import "./index.css";

// Firebase imports
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7xIsVFh7km2bIygL3PkPHuWXaARxDe4I",
  authDomain: "lotion-firebase.firebaseapp.com",
  projectId: "lotion-firebase",
  storageBucket: "lotion-firebase.firebasestorage.app",
  messagingSenderId: "929909504872",
  appId: "1:929909504872:web:7bc7f6616a3ebb7682b4dd",
  measurementId: "G-DZHVC5B4KC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
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

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore real-time listener
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const q = query(tasksRef, orderBy("title"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData: Task[] = [];
      snapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(tasksData);
    });

    return unsubscribe;
  }, [user]);

  const addTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !user) return;

    try {
      const tasksRef = collection(db, "users", user.uid, "tasks");
      await addDoc(tasksRef, {
        title,
        column: activeColumn,
      });
      setNewTaskTitle("");
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task. Please try again.");
    }
  };

  const moveTask = async (taskId: string, targetColumn: Task["column"]) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      await updateDoc(taskRef, { column: targetColumn });
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };

  const updateTask = async (taskId: string, newTitle: string) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      await updateDoc(taskRef, { title: newTitle });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
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
        // Note: Firestore reordering would require a position field
        // For now, we'll skip reordering in Firestore
        console.log("Reordering within same column - not implemented in Firestore");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={() => { }} />;
  }

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
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button onClick={handleSignOut} className="signout-btn">
              Sign Out
            </button>
          </div>
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

      <DragOverlay dropAnimation={{ duration: 0 }}>
        {activeTask ? (
          <div className="task-card" style={{ opacity: 0.5 }}>
            <span className="task-title">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
