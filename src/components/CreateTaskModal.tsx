import React, { useState, useRef } from "react";
import { X, Image, Upload, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, imageUrl?: string) => Promise<void>;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [title, setTitle] = useState("");
    const [imageUrl, setImageUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        try {
            await onCreate(title.trim(), imageUrl);
            // Reset and close
            setTitle("");
            setImageUrl("");
            onClose();
        } catch (error) {
            console.error("Failed to create task", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 700 * 1024) {
            alert("Image size must be less than 700KB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <h2 className="text-lg font-semibold text-white">Create New Task</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Task Title</label>
                        <textarea
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none min-h-[80px]"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400 block">Attachment (Optional)</label>

                        {!imageUrl ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-700 hover:bg-neutral-800/50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-neutral-700 transition-colors">
                                    <Image className="w-5 h-5 text-neutral-400 group-hover:text-neutral-300" />
                                </div>
                                <span className="text-sm text-neutral-500 group-hover:text-neutral-400">Click to upload image</span>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-neutral-800 group">
                                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImageUrl("")}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || isLoading}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateTaskModal;
