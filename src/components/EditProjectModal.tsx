import React, { useState, useEffect } from "react";
import { X, Github, Save } from "lucide-react";
import { createPortal } from "react-dom";

interface EditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, githubUrl: string) => void;
    currentName: string;
    currentGithubUrl?: string;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentName,
    currentGithubUrl = ""
}) => {
    const [name, setName] = useState(currentName);
    const [githubUrl, setGithubUrl] = useState(currentGithubUrl);

    useEffect(() => {
        if (isOpen) {
            setName(currentName);
            setGithubUrl(currentGithubUrl || "");
        }
    }, [isOpen, currentName, currentGithubUrl]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(name, githubUrl);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <h2 className="text-lg font-semibold text-white">Edit Project</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">
                            Project Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name..."
                            className="w-full h-10 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <Github className="w-4 h-4" />
                            GitHub Repository URL
                        </label>
                        <input
                            type="url"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/username/repo"
                            className="w-full h-10 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-900/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditProjectModal;
