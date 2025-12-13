import { useState } from "react";
import type { Project } from "../types";
import { Plus, Layout, FolderKanban, CheckSquare, Search } from "lucide-react";

interface SidebarProps {
    projects: Project[];
    activeProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    onAddProject: (name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, onSelectProject, onAddProject }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    const handleAddProject = () => {
        if (!newProjectName.trim()) return;
        onAddProject(newProjectName);
        setNewProjectName("");
        setIsCreating(false);
    };

    return (
        <aside className="w-64 bg-neutral-950 text-neutral-400 flex flex-col h-full border-r border-neutral-900">
            {/* Header */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/40">
                    <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Lotion</h1>
            </div>

            {/* Quick Stats / Search Placeholder (Optional polish) */}
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
                    {/* Additional generic nav items can go here */}
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
                            <div className="px-3 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
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

                        {projects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => onSelectProject(project.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${activeProjectId === project.id
                                        ? "bg-neutral-900 text-white shadow-inner"
                                        : "text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300"
                                    }`}
                            >
                                <FolderKanban className={`w-4 h-4 ${activeProjectId === project.id ? "text-indigo-500" : "text-neutral-600 group-hover:text-neutral-500"}`} />
                                <span className="truncate">{project.name}</span>
                                {activeProjectId === project.id && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Footer / User Profile placeholder */}
            <div className="p-4 border-t border-neutral-900">
                {/* User info is currently in Navbar, maybe move it here later? 
                     For now, leaving it clean. */}
            </div>
        </aside>
    );
};

export default Sidebar;
