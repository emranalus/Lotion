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
// import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"; // Moved down combined with arrayMove
import type { Task, Notification, Project } from "../types";
import Sidebar from "./Sidebar";
import Column from "./Column";
import ToastContainer from "./ToastContainer";
import ConfirmationModal from "./ConfirmationModal";
import type { User } from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    writeBatch,
    orderBy,
} from "firebase/firestore";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";

// ============================================================================
// MAIN APP COMPONENT (Lazy-loaded after authentication)
// ============================================================================
// Contains all task management features with Firebase Firestore and dnd-kit
// This component is code-split to reduce initial bundle size
// ============================================================================

interface MainAppProps {
    user: User;
    onSignOut: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ user, onSignOut }) => {
    // ----------------------------------------------------------------------------
    // STATE MANAGEMENT
    // ----------------------------------------------------------------------------

    // Task management state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [activeColumn, setActiveColumn] = useState<Task["column"]>("Not Started");

    // Drag and drop state
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Column definitions
    const columns: Task["column"][] = ["Not Started", "In Progress", "Done"];

    // Firestore database instance
    const db = getFirestore();

    // Notification state definition
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Delete confirmation state
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    /**
     * Add a global notification
     */
    const addNotification = (message: string, type: Notification["type"] = "info") => {
        const id = Date.now().toString();
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
    };

    /**
     * Remove a notification manually
     */
    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    // Drag and drop sensors configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Requires 5px movement to start drag (prevents accidental drags on click)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // State for projects
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    // ----------------------------------------------------------------------------
    // SIDE EFFECTS
    // ----------------------------------------------------------------------------

    /**
     * Listen for projects
     */
    useEffect(() => {
        const projectsRef = collection(db, "users", user.uid, "projects");
        const q = query(projectsRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData: Project[] = [];
            snapshot.forEach((doc) => {
                projectsData.push({ id: doc.id, ...doc.data() } as Project);
            });
            setProjects(projectsData);

            // Auto-select first project if none selected
            if (projectsData.length > 0 && !activeProjectId) {
                setActiveProjectId(projectsData[0].id);
            }
        });

        return unsubscribe;
    }, [user, db, activeProjectId]);

    /**
     * Real-time Firestore listener for tasks
     * Syncs tasks from Firestore database
     * Tasks are now nested under projects in the collection path
     */
    useEffect(() => {
        if (!activeProjectId) {
            setTasks([]);
            return;
        }

        // Tasks are now nested: users/{userId}/projects/{projectId}/tasks
        const tasksRef = collection(db, "users", user.uid, "projects", activeProjectId, "tasks");
        const q = query(tasksRef, orderBy("order"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData: Task[] = [];
            snapshot.forEach((doc) => {
                tasksData.push({ id: doc.id, ...doc.data() } as Task);
            });
            setTasks(tasksData);
        });

        return unsubscribe;
    }, [user, db, activeProjectId]);

    // ----------------------------------------------------------------------------
    // TASK CRUD OPERATIONS
    // ----------------------------------------------------------------------------

    /**
     * Add a new task to Firestore
     * Creates a task in the currently selected column
     */
    /**
     * Add a new project
     */
    const addProject = async (name: string) => {
        try {
            const projectsRef = collection(db, "users", user.uid, "projects");
            const docRef = await addDoc(projectsRef, {
                name,
                createdAt: new Date()
            });
            setActiveProjectId(docRef.id);
            addNotification("Project created", "success");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Error adding project:", error);
            addNotification(`Failed to create project: ${error.message}`, "error");
        }
    };

    /**
     * Add a new task to Firestore
     * Creates a task in the currently selected column
     */
    const addTask = async () => {
        const title = newTaskTitle.trim();
        if (!title) return;
        if (!activeProjectId) {
            addNotification("Please select a project first", "error");
            return;
        }

        try {
            // Tasks are nested under projects
            const tasksRef = collection(db, "users", user.uid, "projects", activeProjectId, "tasks");

            // Calculate new order (max + 100)
            const columnTasks = tasks.filter(t => t.column === activeColumn);
            const maxOrder = Math.max(...columnTasks.map(t => t.order || 0), 0);
            const newOrder = maxOrder + 100;

            await addDoc(tasksRef, {
                title,
                column: activeColumn,
                order: newOrder
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
        if (!activeProjectId) return;
        try {
            const taskRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", taskId);
            await updateDoc(taskRef, { column: targetColumn });
        } catch (error) {
            console.error("Error moving task:", error);
        }
    };

    /**
     * Update a task's fields
     * @param taskId - The ID of the task to update
     * @param data - The data to update (e.g. title, imageUrl)
     */
    const updateTask = async (taskId: string, data: Partial<Task>) => {
        if (!activeProjectId) return;
        try {
            const taskRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", taskId);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...updateData } = data; // Remove id from update data if present
            await updateDoc(taskRef, updateData);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    /**
     * Delete a task from Firestore
     * Initiates the confirmation process
     * @param taskId - The ID of the task to delete
     */
    const deleteTask = (taskId: string) => {
        setTaskToDelete(taskId);
        setIsDeleteModalOpen(true);
    };

    /**
     * Confirm actual deletion
     */
    const confirmDeleteTask = async () => {
        if (!taskToDelete || !activeProjectId) return;

        try {
            const taskRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", taskToDelete);
            await deleteDoc(taskRef);
            addNotification("Task deleted successfully", "success");
        } catch (error) {
            console.error("Error deleting task:", error);
            addNotification("Failed to delete task", "error");
        } finally {
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
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
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;
        const activeTask = tasks.find((t) => t.id === active.id);
        if (!activeTask) return;

        // 1. Determine Target Column
        let targetColumn: Task["column"] | undefined;
        if (over.data?.current?.type === "column") {
            targetColumn = over.data.current.column as Task["column"];
        } else {
            const overTask = tasks.find((t) => t.id === over.id);
            if (overTask) targetColumn = overTask.column;
        }

        if (!targetColumn) return;

        // 2. Prepare for Re-indexing
        // Get all tasks for the target column, currently sorted by order
        const targetColumnTasks = tasks.filter((t) => t.column === targetColumn);
        // Note: 'tasks' state is already sorted by order from useEffect.

        // 3. Calculate New Order locally using arrayMove
        let newTasksInColumn: Task[];

        if (activeTask.column !== targetColumn) {
            // -- Moving between columns --
            // Remove from source (logically) and insert into target
            // For simplicity, we just insert it at the specific index of 'over'

            // Current IDs in target (without active)
            const targetIds = targetColumnTasks.map(t => t.id);

            let insertIndex: number;
            if (over.data?.current?.type === "column") {
                insertIndex = targetIds.length; // End of list
            } else {
                const overIndex = targetIds.indexOf(over.id as string);
                // Heuristic: If we are dragging onto a task, put it there.
                // dnd-kit usually implies insertion relative to over.
                insertIndex = overIndex >= 0 ? overIndex : targetIds.length;
            }

            // Create new temporary array for re-ordering
            // We just need the list of items in their new desired sequence
            newTasksInColumn = [...targetColumnTasks];
            newTasksInColumn.splice(insertIndex, 0, { ...activeTask, column: targetColumn });

        } else {
            // -- Same column reordering --
            const oldIndex = targetColumnTasks.findIndex((t) => t.id === active.id);
            let newIndex: number;

            if (over.data?.current?.type === "column") {
                newIndex = targetColumnTasks.length - 1;
            } else {
                newIndex = targetColumnTasks.findIndex((t) => t.id === over.id);
            }

            if (oldIndex === newIndex) return; // No change

            newTasksInColumn = arrayMove(targetColumnTasks, oldIndex, newIndex);
        }

        // 4. Optimistic UI Update
        // Apply the new order and column to the local state immediately
        const newTasksWithOrder = newTasksInColumn.map((t, index) => ({
            ...t,
            order: index * 100 + 100, // Same logic as batch update
            column: targetColumn // Ensure column is updated if moved
        }));

        setTasks((prevTasks) => {
            // Keep tasks that are NOT in the target column
            // And also exclude the active task from its original position (if it moved columns)
            const otherTasks = prevTasks.filter(t =>
                t.column !== targetColumn && t.id !== active.id
            );
            return [...otherTasks, ...newTasksWithOrder];
        });

        // 5. Batch Update Firestore
        // Re-assign order to ALL items in this column based on new array index
        if (!activeProjectId) return;
        const batch = writeBatch(db);

        // Also update the active task's column if it changed
        const activeRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", active.id as string);
        if (activeTask.column !== targetColumn) {
            batch.update(activeRef, { column: targetColumn });
        }

        newTasksInColumn.forEach((task, index) => {
            const ref = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", task.id);
            const newOrder = index * 100 + 100; // Spaced out

            // Only update if changed (optimization)
            if (task.order !== newOrder || task.id === active.id) {
                batch.update(ref, { order: newOrder });
            }
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error batch updating orders:", error);
            addNotification("Failed to save new order", "error");
            // Optionally revert state here if needed, but snapshot listener usually corrects it
        }
    };

    // ----------------------------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------------------------

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden font-inter">
                {/* Sidebar */}
                <Sidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={setActiveProjectId}
                    onAddProject={addProject}
                />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-900 relative">
                    {/* Top Gradient Fade (optional depth) */}
                    <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />

                    <div className="app-container h-full flex flex-col z-10">
                        {/* Header Area */}
                        <header className="px-8 py-6 shrink-0 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {projects.find(p => p.id === activeProjectId)?.name || "Dashboard"}
                                </h2>
                                <p className="text-sm text-neutral-500 mt-1">Manage your tasks and progress</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-xs font-medium text-neutral-500 bg-neutral-950/50 px-3 py-1.5 rounded-full border border-neutral-800">
                                    {user.email}
                                </span>
                                <button
                                    onClick={onSignOut}
                                    className="text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </header>

                        {/* Task input area */}
                        <div className="px-8 pb-6 shrink-0">
                            <div className="flex gap-4 items-center bg-neutral-950/50 p-1.5 rounded-xl border border-neutral-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all max-w-2xl shadow-sm">
                                <select
                                    value={activeColumn}
                                    onChange={(e) => setActiveColumn(e.target.value as Task["column"])}
                                    className="bg-transparent text-sm font-medium text-neutral-400 focus:outline-none px-3 py-2 cursor-pointer hover:text-white transition-colors"
                                >
                                    {columns.map((col) => (
                                        <option key={col} value={col} className="bg-neutral-900 text-neutral-300">
                                            {col}
                                        </option>
                                    ))}
                                </select>
                                <div className="w-px h-5 bg-neutral-800"></div>
                                <input
                                    type="text"
                                    placeholder="Add a new task..."
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                                    className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none px-2"
                                />
                                <button
                                    onClick={addTask}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>

                        {/* Task columns */}
                        <div className="columns flex-grow overflow-x-auto overflow-y-hidden px-8 pb-6 custom-scrollbar">
                            <div className="flex gap-6 h-full min-w-max">
                                {columns.map((col) => (
                                    <Column
                                        key={col}
                                        title={col}
                                        tasks={tasks.filter((t) => t.column === col)}
                                        moveTask={moveTask}
                                        updateTask={updateTask}
                                        deleteTask={deleteTask}
                                        addNotification={addNotification}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer notifications={notifications} removeNotification={removeNotification} />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Task?"
                message="Are you sure you want to delete this task? This cannot be undone."
                onConfirm={confirmDeleteTask}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Drag overlay - shows semi-transparent card following cursor */}
            <DragOverlay dropAnimation={{ duration: 0 }}>
                {activeTask ? (
                    <div className="bg-neutral-800 border border-neutral-700/50 rounded-xl p-3 shadow-2xl opacity-80 cursor-grabbing rotate-2 scale-105">
                        <p className="text-sm font-medium text-neutral-200 leading-snug">{activeTask.title}</p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default MainApp;
