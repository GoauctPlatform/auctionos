import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

// Contador global para z-index, garantindo que o modal mais recente sempre fique por cima
let globalModalZIndex = 9999;
// Contador de modais abertos para gerenciar o scroll da página (overflow) corretamente
let openModalsCount = 0;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    zIndex?: string; // Para manter retrocompatibilidade
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', zIndex }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [dynamicZIndex, setDynamicZIndex] = useState(9999);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            // Apenas o modal mais ao topo deve responder ao ESC
            if (e.key === 'Escape' && dynamicZIndex === globalModalZIndex) {
                onClose();
            }
        };

        if (isOpen) {
            globalModalZIndex += 10;
            setDynamicZIndex(globalModalZIndex);

            openModalsCount++;
            if (openModalsCount === 1) {
                document.body.style.overflow = 'hidden';
            }

            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            if (isOpen) {
                document.removeEventListener('keydown', handleEscape);
                
                openModalsCount--;
                if (openModalsCount === 0) {
                    document.body.style.overflow = 'unset';
                }
            }
        };
    }, [isOpen, onClose, dynamicZIndex]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        '2xl': 'max-w-7xl',
        full: 'max-w-full m-4 h-[calc(100vh-2rem)]'
    };

    const modalContent = (
        <div className={`fixed inset-0 flex items-center justify-center p-4 sm:p-6 ${zIndex || ''}`} style={{ zIndex: dynamicZIndex }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div
                ref={modalRef}
                className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] transition-all transform scale-100 opacity-100`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {children}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};
