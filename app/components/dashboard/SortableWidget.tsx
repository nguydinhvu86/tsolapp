"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableWidgetProps {
    id: string;
    children: React.ReactNode;
}

export function SortableWidget({ id, children }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.8 : 1,
        position: "relative" as const,
    };

    return (
        <div ref={setNodeRef} style={style} className={`sortable-widget ${isDragging ? "dragging" : ""}`}>
            {/* Drag Handle */}
            <div
                className="drag-handle group"
                {...attributes}
                {...listeners}
                style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    cursor: "grab",
                    zIndex: 10,
                    background: "var(--background)",
                    borderRadius: "4px",
                    padding: "4px",
                    opacity: 0,
                    transition: "opacity 0.2s",
                }}
            >
                <GripVertical size={16} className="text-muted-foreground group-hover:text-foreground" />
            </div>
            {children}
        </div>
    );
}
