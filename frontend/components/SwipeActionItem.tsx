import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2Icon, FolderInputIcon } from 'lucide-react';

interface SwipeActionItemProps {
    children: React.ReactNode;
    onDelete?: () => void;
    onMove?: () => void;
    deleteThreshold?: number;
    moveThreshold?: number;
    disabled?: boolean;
}

export const SwipeActionItem: React.FC<SwipeActionItemProps> = ({
    children,
    onDelete,
    onMove,
    deleteThreshold = -100,
    moveThreshold = 100,
    disabled = false
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const x = useMotionValue(0);
    
    // Opacity increases as we swipe further in either direction
    const deleteOpacity = useTransform(x, [0, deleteThreshold], [0, 1]);
    const moveOpacity = useTransform(x, [0, moveThreshold], [0, 1]);
    
    // Background color shifts depending on swipe direction
    const backgroundColor = useTransform(
        x,
        [deleteThreshold, 0, moveThreshold],
        ['#ef4444', '#f1f5f9', '#3b82f6'] // Red for delete, subtle for neutral, Blue for move
    );

    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (onDelete && info.offset.x < deleteThreshold) {
            if (window.confirm("Are you sure you want to remove this item?")) {
                setIsAnimating(true);
                onDelete();
                // Return item back if we don't fully destroy the component visually right away
                setTimeout(() => setIsAnimating(false), 500);
            }
        } else if (onMove && info.offset.x > moveThreshold) {
            onMove();
        }
    };

    if (disabled) {
        return <div className="w-full relative">{children}</div>;
    }

    return (
        <motion.div ref={containerRef} className="relative w-full overflow-hidden hover:overflow-visible focus-within:overflow-visible rounded-xl group" style={{ backgroundColor }}>
            {/* DELETE Icon (Right Side) */}
            {onDelete && (
                <motion.div
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-6 w-1/2 h-full pointer-events-none"
                    style={{ opacity: deleteOpacity }}
                >
                    <Trash2Icon className="text-white" size={24} />
                </motion.div>
            )}

            {/* MOVE Icon (Left Side) */}
            {onMove && (
                <motion.div
                    className="absolute left-0 top-0 bottom-0 flex items-center justify-start pl-6 w-1/2 h-full pointer-events-none"
                    style={{ opacity: moveOpacity }}
                >
                    <FolderInputIcon className="text-white" size={24} />
                </motion.div>
            )}

            {/* Foreground Content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: onMove ? 0.5 : 0, right: onDelete ? 0.5 : 0 }}
                style={{ x }}
                onDragEnd={handleDragEnd}
                animate={isAnimating ? (x.get() < 0 ? { x: -1000, opacity: 0 } : { x: 1000, opacity: 0 }) : { x: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="w-full h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl relative z-10 cursor-grab active:cursor-grabbing hover:overflow-visible"
                dragDirectionLock
            >
                {children}
            </motion.div>
        </motion.div>
    );
};

