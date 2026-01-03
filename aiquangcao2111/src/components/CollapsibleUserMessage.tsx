import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const CollapsibleUserMessage = ({ content }: { content: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldCollapse = content.split('\n').length > 3 || content.length > 200;

    return (
        <div>
            <p className={cn(!isExpanded && shouldCollapse && "line-clamp-3 whitespace-pre-wrap")}>
                {content}
            </p>
            {shouldCollapse && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs underline mt-1 hover:text-primary-foreground/80"
                >
                    {isExpanded ? "Thu gọn" : "Xem thêm"}
                </button>
            )}
        </div>
    );
};
