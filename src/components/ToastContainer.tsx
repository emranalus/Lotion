import React from "react";
import type { Notification } from "../types";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface ToastContainerProps {
    notifications: Notification[];
    removeNotification: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, removeNotification }) => {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
            {notifications.map((note) => (
                <div
                    key={note.id}
                    className={`flex items-center gap-3 p-3 rounded-xl shadow-xl backdrop-blur-md animate-in slide-in-from-top-2 border ${note.type === 'error' ? 'bg-red-950/90 border-red-900 text-red-200' :
                            note.type === 'success' ? 'bg-emerald-950/90 border-emerald-900 text-emerald-200' :
                                'bg-sky-950/90 border-sky-900 text-sky-200'
                        }`}
                >
                    <div className="shrink-0">
                        {note.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {note.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        {note.type === 'info' && <Info className="w-5 h-5 text-sky-500" />}
                    </div>
                    <span className="text-sm font-medium flex-1">{note.message}</span>
                    <button
                        className="p-1 hover:bg-white/10 rounded-full transition-colors opacity-70 hover:opacity-100"
                        onClick={() => removeNotification(note.id)}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
