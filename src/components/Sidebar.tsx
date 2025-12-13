import React, { useState, useEffect } from "react";
import type { Project } from "../types";
import { Plus, Layout, FolderKanban, CheckSquare, Search, Pencil, Trash2, GripVertical } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

interface SidebarProps {
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    onAddProject: (name: string) => void;
    onRenameProject: (projectId: string, newName: string) => void;
    onDeleteProject: (projectId: string) => void;
    onReorderProjects: (projects: Project[]) => void;
}

// ----------------------------------------------------------------------
// Sortable Project Item Component
// ----------------------------------------------------------------------

interface SortableProjectItemProps {
    project: Project;
    isActive: boolean;
    onSelect: () => void;
    onContextMenu: (e: React.MouseEvent, projectId: string) => void;
}

const SortableProjectItem = ({ project, isActive, onSelect, onContextMenu }: SortableProjectItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-200 ${isActive ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50"}`}
            onContextMenu={(e) => onContextMenu(e, project.id)}
        >
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-800 rounded text-neutral-600 hover:text-neutral-400 transition-all">
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            <button
                onClick={onSelect}
                className="flex-1 flex items-center gap-3 py-1.5 min-w-0"
            >
                <FolderKanban className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-500" : "text-neutral-600 group-hover:text-neutral-500"}`} />
                <span className="truncate text-sm font-medium">{project.name}</span>
            </button>

            {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0 mr-2"></div>
            )}
        </div>
    );
};


// ----------------------------------------------------------------------
// Sidebar Component
// ----------------------------------------------------------------------

const Sidebar: React.FC<SidebarProps> = ({
    projects,
    activeProjectId,
    onSelectProject,
    onAddProject,
    onRenameProject,
    onDeleteProject,
    onReorderProjects
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null);

    // Rename State
    const [isRenaming, setIsRenaming] = useState<string | null>(null); // projectId being renamed
    const [renameValue, setRenameValue] = useState("");

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    const handleAddProject = () => {
        if (!newProjectName.trim()) return;
        onAddProject(newProjectName);
        setNewProjectName("");
        setIsCreating(false);
    };

    const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, projectId });
    };

    const startRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!contextMenu) return;
        const project = projects.find(p => p.id === contextMenu.projectId);
        if (project) {
            setIsRenaming(project.id);
            setRenameValue(project.name);
        }
        setContextMenu(null);
    };

    const submitRename = () => {
        if (isRenaming && renameValue.trim()) {
            onRenameProject(isRenaming, renameValue.trim());
        }
        setIsRenaming(null);
        setRenameValue("");
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (contextMenu) {
            // Use window.confirm for simplicity or we could lift state to MainApp for the modal
            // But since ConfirmationModal is readily available in MainApp, calling onDeleteProject
            // which sets MainApp state is better? 
            // Actually MainApp's deleteProject implementation shows a toast. 
            // If we want a confirmation modal for PROJECTS, we need to add that state to MainApp or Sidebar.
            // For now, let's assume direct delete or simple confirm.
            if (window.confirm("Are you sure you want to delete this project and all its tasks?")) {
                onDeleteProject(contextMenu.projectId);
            }
        }
        setContextMenu(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = projects.findIndex((p) => p.id === active.id);
            const newIndex = projects.findIndex((p) => p.id === over?.id);
            onReorderProjects(arrayMove(projects, oldIndex, newIndex));
        }
    };

    return (
        <aside className="w-64 bg-neutral-950 text-neutral-400 flex flex-col h-full border-r border-neutral-900 relative">
            {/* Header */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/40">
                    <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Lotion</h1>
            </div>

            {/* Quick Stats / Search Placeholder */}
            <div className="px-4 mb-6">
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-6">
                <div>
                    <h2 className="px-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Workspace</h2>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:bg-neutral-900 transition-colors">
                        <Layout className="w-4 h-4" />
                        Dashboard
                    </button>
                </div>

                <div>
                    <div className="flex items-center justify-between px-3 mb-2 group">
                        <h2 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider group-hover:text-neutral-500 transition-colors">Projects</h2>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-indigo-400 transition-all"
                            title="New Project"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        {isCreating && (
                            <div className="px-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Project Name..."
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddProject();
                                        if (e.key === "Escape") setIsCreating(false);
                                    }}
                                    onBlur={() => !newProjectName && setIsCreating(false)}
                                    className="w-full bg-neutral-900 border border-indigo-500/50 rounded-md py-1.5 px-3 text-sm text-white focus:outline-none"
                                />
                            </div>
                        )}

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={projects.map(p => p.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {projects.map((project) => (
                                    isRenaming === project.id ? (
                                        <div key={project.id} className="px-2 py-1">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") submitRename();
                                                    if (e.key === "Escape") setIsRenaming(null);
                                                }}
                                                onBlur={submitRename}
                                                className="w-full bg-neutral-900 border border-indigo-500 rounded py-1 pl-2 text-sm text-white focus:outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <SortableProjectItem
                                            key={project.id}
                                            project={project}
                                            isActive={activeProjectId === project.id}
                                            onSelect={() => onSelectProject(project.id)}
                                            onContextMenu={handleContextMenu}
                                        />
                                    )
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-900">
            </div>

            {/* Custom Context Menu */}
            {contextMenu && createPortal(
                <div
                    className="fixed z-[100] bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing immediately
                >
                    <button
                        onClick={startRename}
                        className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white flex items-center gap-2"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Rename
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 flex items-center gap-2 border-t border-neutral-700 mt-1 pt-2"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </aside>
    );
};

export default Sidebar;
