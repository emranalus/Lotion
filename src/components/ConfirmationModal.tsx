import React from "react";

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-neutral-400 mb-6 text-sm leading-relaxed">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium rounded-lg transition-colors"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-900/20"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
