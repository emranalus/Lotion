import React, { useState, useEffect } from "react";
import { Plus, LogOut } from "lucide-react";
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
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import type { Task, Notification, Project } from "../types";
import Sidebar from "./Sidebar";
import Column from "./Column";
import ToastContainer from "./ToastContainer";
import ConfirmationModal from "./ConfirmationModal";
import CreateTaskModal from "./CreateTaskModal";
import type { User } from "firebase/auth";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    writeBatch,
    orderBy,
} from "firebase/firestore";

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

interface MainAppProps {
    user: User;
    onSignOut: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ user, onSignOut }) => {
    // ----------------------------------------------------------------------------
    // STATE MANAGEMENT
    // ----------------------------------------------------------------------------

    // Data state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    // UI State
    const [notifications, setNotifications] = useState<Notification[]>([]); // activeColumn removed

    // Modals & Overlays
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

    // Drag and drop state
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Column definitions
    const columns: Task["column"][] = ["Not Started", "In Progress", "Done"];

    // Firestore
    const db = getFirestore();

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // ----------------------------------------------------------------------------
    // EFFECTS
    // ----------------------------------------------------------------------------

    // Listen for projects
    useEffect(() => {
        const projectsRef = collection(db, "users", user.uid, "projects");
        const q = query(projectsRef, orderBy("order", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData: Project[] = [];
            snapshot.forEach((doc) => {
                projectsData.push({ id: doc.id, ...doc.data() } as Project);
            });
            // Fallback sort
            projectsData.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setProjects(projectsData);

            if (projectsData.length > 0 && !activeProjectId) {
                setActiveProjectId(projectsData[0].id);
            }
        });

        return unsubscribe;
    }, [user, db, activeProjectId]);

    // Listen for tasks
    useEffect(() => {
        if (!activeProjectId) {
            setTasks([]);
            return;
        }

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
    // NOTIFICATIONS
    // ----------------------------------------------------------------------------

    const addNotification = (message: string, type: Notification["type"] = "info") => {
        const id = Date.now().toString();
        setNotifications((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
    };

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    // ----------------------------------------------------------------------------
    // PROJECT OPERATIONS
    // ----------------------------------------------------------------------------

    const addProject = async (name: string) => {
        try {
            const projectsRef = collection(db, "users", user.uid, "projects");
            const maxOrder = Math.max(...projects.map(p => p.order || 0), 0);
            const newOrder = maxOrder + 100;

            const docRef = await addDoc(projectsRef, {
                name,
                createdAt: new Date(),
                order: newOrder
            });
            setActiveProjectId(docRef.id);
            addNotification("Project created", "success");
        } catch (error) {
            const err = error as Error;
            console.error("Error adding project:", err);
            addNotification(`Failed to create project: ${err.message}`, "error");
        }
    };

    const renameProject = async (projectId: string, newName: string) => {
        try {
            const projectRef = doc(db, "users", user.uid, "projects", projectId);
            await updateDoc(projectRef, { name: newName });
        } catch (error) {
            console.error("Error renaming project:", error);
            addNotification("Failed to rename project", "error");
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            const tasksRef = collection(db, "users", user.uid, "projects", projectId, "tasks");
            const snapshot = await getDocs(tasksRef);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            const projectRef = doc(db, "users", user.uid, "projects", projectId);
            batch.delete(projectRef);

            await batch.commit();
            addNotification("Project deleted", "success");

            if (activeProjectId === projectId) {
                const remaining = projects.filter(p => p.id !== projectId);
                setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
            addNotification("Failed to delete project", "error");
        }
    };

    const reorderProjects = async (newProjects: Project[]) => {
        setProjects(newProjects);
        try {
            const batch = writeBatch(db);
            newProjects.forEach((project, index) => {
                const ref = doc(db, "users", user.uid, "projects", project.id);
                const newOrder = index * 100 + 100;
                batch.update(ref, { order: newOrder });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error reordering projects:", error);
        }
    };

    // ----------------------------------------------------------------------------
    // TASK OPERATIONS
    // ----------------------------------------------------------------------------

    const addTask = async (title: string, imageUrl?: string) => {
        if (!activeProjectId) {
            addNotification("Please select a project first", "error");
            return;
        }

        try {
            const tasksRef = collection(db, "users", user.uid, "projects", activeProjectId, "tasks");
            const targetColumn = "Not Started";
            const columnTasks = tasks.filter(t => t.column === targetColumn);
            const maxOrder = Math.max(...columnTasks.map(t => t.order || 0), 0);
            const newOrder = maxOrder + 100;

            await addDoc(tasksRef, {
                title,
                column: targetColumn,
                order: newOrder,
                imageUrl: imageUrl || ""
            });
            addNotification("Task created", "success");
        } catch (error) {
            console.error("Error adding task:", error);
            addNotification("Failed to add task", "error");
        }
    };

    const moveTask = async (taskId: string, targetColumn: Task["column"]) => {
        if (!activeProjectId) return;
        try {
            const taskRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", taskId);
            await updateDoc(taskRef, { column: targetColumn });
        } catch (error) {
            console.error("Error moving task:", error);
        }
    };

    const updateTask = async (taskId: string, data: Partial<Task>) => {
        if (!activeProjectId) return;
        try {
            const taskRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", taskId);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...updateData } = data;
            await updateDoc(taskRef, updateData);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const deleteTask = (taskId: string) => {
        setTaskToDelete(taskId);
        setIsDeleteModalOpen(true);
    };

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
    // DRAG HANDLERS
    // ----------------------------------------------------------------------------

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find((t) => t.id === active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;
        const activeTask = tasks.find((t) => t.id === active.id);
        if (!activeTask) return;

        let targetColumn: Task["column"] | undefined;
        if (over.data?.current?.type === "column") {
            targetColumn = over.data.current.column as Task["column"];
        } else {
            const overTask = tasks.find((t) => t.id === over.id);
            if (overTask) targetColumn = overTask.column;
        }

        if (!targetColumn) return;

        const targetColumnTasks = tasks.filter((t) => t.column === targetColumn);
        let newTasksInColumn: Task[];

        if (activeTask.column !== targetColumn) {
            const targetIds = targetColumnTasks.map(t => t.id);
            let insertIndex: number;
            if (over.data?.current?.type === "column") {
                insertIndex = targetIds.length;
            } else {
                const overIndex = targetIds.indexOf(over.id as string);
                insertIndex = overIndex >= 0 ? overIndex : targetIds.length;
            }
            newTasksInColumn = [...targetColumnTasks];
            newTasksInColumn.splice(insertIndex, 0, { ...activeTask, column: targetColumn });
        } else {
            const oldIndex = targetColumnTasks.findIndex((t) => t.id === active.id);
            let newIndex: number;
            if (over.data?.current?.type === "column") {
                newIndex = targetColumnTasks.length - 1;
            } else {
                newIndex = targetColumnTasks.findIndex((t) => t.id === over.id);
            }
            if (oldIndex === newIndex) return;
            newTasksInColumn = arrayMove(targetColumnTasks, oldIndex, newIndex);
        }

        const newTasksWithOrder = newTasksInColumn.map((t, index) => ({
            ...t,
            order: index * 100 + 100,
            column: targetColumn // Ensure column is updated if moved
        }));

        setTasks((prevTasks) => {
            const otherTasks = prevTasks.filter(t =>
                t.column !== targetColumn && t.id !== active.id
            );
            return [...otherTasks, ...newTasksWithOrder];
        });

        if (!activeProjectId) return;
        const batch = writeBatch(db);
        const activeRef = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", active.id as string);

        if (activeTask.column !== targetColumn) {
            batch.update(activeRef, { column: targetColumn });
        }

        newTasksInColumn.forEach((task, index) => {
            const ref = doc(db, "users", user.uid, "projects", activeProjectId, "tasks", task.id);
            const newOrder = index * 100 + 100;
            if (task.order !== newOrder || task.id === active.id) {
                batch.update(ref, { order: newOrder });
            }
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error batch updating orders:", error);
            addNotification("Failed to save new order", "error");
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
                <Sidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={setActiveProjectId}
                    onAddProject={addProject}
                    onRenameProject={renameProject}
                    onDeleteProject={deleteProject}
                    onReorderProjects={reorderProjects}
                />

                <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-900 relative">
                    <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />

                    <div className="app-container h-full flex flex-col z-10">
                        <header className="px-8 py-6 shrink-0 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {projects.find(p => p.id === activeProjectId)?.name || "Dashboard"}
                                </h2>
                                <p className="text-sm text-neutral-500 mt-1">Manage your tasks and progress</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsCreateTaskModalOpen(true)}
                                    title="Create New Task"
                                    className="h-9 w-9 flex items-center justify-center bg-neutral-900/50 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 rounded-lg transition-all duration-200 group"
                                >
                                    <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                                </button>

                                <div className="h-6 w-px bg-neutral-800/50 mx-1"></div>

                                <div className="h-9 px-3.5 flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                    <span className="text-xs font-medium text-neutral-400">
                                        {user.email}
                                    </span>
                                </div>

                                <button
                                    onClick={onSignOut}
                                    title="Sign Out"
                                    className="h-9 w-9 flex items-center justify-center bg-neutral-900/50 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 rounded-lg transition-all duration-200 group/logout"
                                >
                                    <LogOut className="w-3.5 h-3.5 group-hover/logout:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </header>

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

            <ToastContainer notifications={notifications} removeNotification={removeNotification} />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Task?"
                message="Are you sure you want to delete this task? This action cannot be undone."
                onConfirm={confirmDeleteTask}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                }}
            />

            <CreateTaskModal
                isOpen={isCreateTaskModalOpen}
                onClose={() => setIsCreateTaskModalOpen(false)}
                onCreate={addTask}
            />

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
