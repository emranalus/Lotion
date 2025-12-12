import React from "react";
import type { Notification } from "../types";

interface ToastContainerProps {
    notifications: Notification[];
    removeNotification: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, removeNotification }) => {
    return (
        <div className="toast-container">
            {notifications.map((note) => (
                <div key={note.id} className={`toast-item toast-${note.type}`}>
                    <span>{note.message}</span>
                    <button className="toast-close-btn" onClick={() => removeNotification(note.id)}>
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
