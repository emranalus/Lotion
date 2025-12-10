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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
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

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyB7xIsVFh7km2bIygL3PkPHuWXaARxDe4I",
  authDomain: "lotion-firebase.firebaseapp.com",
  projectId: "lotion-firebase",
  storageBucket: "lotion-firebase.firebasestorage.app",
  messagingSenderId: "929909504872",
  appId: "1:929909504872:web:7bc7f6616a3ebb7682b4dd",
  measurementId: "G-DZHVC5B4KC"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  // ----------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------------------------------

  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeColumn, setActiveColumn] = useState<Task["column"]>("Not Started");

  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Column definitions
  const columns: Task["column"][] = ["Not Started", "In Progress", "Done"];

  // Drag and drop sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ----------------------------------------------------------------------------
  // SIDE EFFECTS
  // ----------------------------------------------------------------------------

  /**
   * Monitor authentication state changes
   * Sets up a listener for when user signs in or out
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  /**
   * Real-time Firestore listener for tasks
   * Syncs tasks from Firestore database when user is authenticated
   * Tasks are ordered alphabetically by title
   */
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

  // ----------------------------------------------------------------------------
  // TASK CRUD OPERATIONS
  // ----------------------------------------------------------------------------

  /**
   * Add a new task to Firestore
   * Creates a task in the currently selected column
   */
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

  /**
   * Move a task to a different column
   * @param taskId - The ID of the task to move
   * @param targetColumn - The column to move the task to
   */
  const moveTask = async (taskId: string, targetColumn: Task["column"]) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      await updateDoc(taskRef, { column: targetColumn });
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };

  /**
   * Update a task's title
   * @param taskId - The ID of the task to update
   * @param newTitle - The new title for the task
   */
  const updateTask = async (taskId: string, newTitle: string) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      await updateDoc(taskRef, { title: newTitle });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  /**
   * Delete a task from Firestore
   * @param taskId - The ID of the task to delete
   */
  const deleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "users", user.uid, "tasks", taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // ----------------------------------------------------------------------------
  // DRAG AND DROP HANDLERS
  // ----------------------------------------------------------------------------

  /**
   * Handle drag start event
   * Stores the task being dragged for the DragOverlay
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  /**
   * Handle drag end event
   * Moves the task to the target column when dropped
   * Note: Reordering within same column is not yet implemented in Firestore
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null); // Clear the drag overlay

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine the target column based on where the task was dropped
    let targetColumn: Task["column"] | undefined;

    if (over.data?.current?.type === "column") {
      // Dropped on empty column area
      targetColumn = over.data.current.column as Task["column"];
    } else {
      // Dropped on another task
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        targetColumn = overTask.column;
      }
    }

    if (!targetColumn) return;

    // Move task if column changed
    if (activeTask.column !== targetColumn) {
      moveTask(active.id as string, targetColumn);
    } else {
      // Reordering within same column - not yet implemented
      // Would require adding a position/order field to Firestore
      console.log("Reordering within same column - not implemented in Firestore");
    }
  };

  // ----------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // ----------------------------------------------------------------------------

  /**
   * Sign out the current user
   */
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // ----------------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------------

  // Show loading state while checking authentication
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <Login onLogin={() => { }} />;
  }

  // Main application UI
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="app-container">
        {/* Navigation bar with user info and sign out */}
        <header className="navbar">
          <h1>Lotion</h1>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button onClick={handleSignOut} className="signout-btn">
              Sign Out
            </button>
          </div>
        </header>

        {/* Task input form */}
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

        {/* Task columns */}
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

      {/* Drag overlay - shows semi-transparent card following cursor */}
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
