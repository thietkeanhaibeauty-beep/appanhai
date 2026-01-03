import React, { useRef } from "react";
import { ArrowUp, Loader2, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateFilename } from "@/utils/stringUtils";

interface ChatInputAreaProps {
    message: string;
    setMessage: (msg: string) => void;
    isLoading: boolean;
    isAnyFlowActive: boolean;
    attachedFile: File | null;
    handleSend: () => void;
    handleFileAttach: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeAttachedFile: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export function ChatInputArea({
    message,
    setMessage,
    isLoading,
    isAnyFlowActive,
    attachedFile,
    handleSend,
    handleFileAttach,
    handleFileChange,
    removeAttachedFile,
    fileInputRef
}: ChatInputAreaProps) {
    return (
        <div className="p-4 border-t border-border bg-background flex-shrink-0">
            {/* Attached file preview - keep outside the capsule for now or inside? Outside is safer for layout */}
            {attachedFile && (
                <div className="mb-3 p-2 bg-secondary/30 border border-border/50 rounded-lg flex items-center gap-2 max-w-fit">
                    <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate max-w-[200px]">
                        {truncateFilename(attachedFile.name)}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeAttachedFile}
                        className="h-6 w-6 p-0 flex-shrink-0 hover:bg-background/50 rounded-full"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Main Input Capsule */}
            <div className="flex items-end gap-2 bg-secondary/30 p-2 rounded-xl border border-transparent focus-within:border-black/5 transition-colors">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    className="hidden"
                />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFileAttach}
                    disabled={isLoading}
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-lg"
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <textarea
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={
                        isAnyFlowActive
                            ? "Nhập thông tin..."
                            : "Nhắn tin với AI Assistant..."
                    }
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 px-2 py-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/70 resize-none overflow-y-auto min-h-[24px] max-h-[60px] text-base leading-relaxed"
                    style={{ height: '24px', fontSize: '16px' }}
                />

                <Button
                    onClick={handleSend}
                    disabled={(!message.trim() && !attachedFile) || isLoading}
                    className="shrink-0 h-9 w-9 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-white shadow-sm p-0 flex items-center justify-center transition-all"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowUp className="h-5 w-5" />
                    )}
                </Button>
            </div>
            {/* Subtext (optional - e.g. "AI có thể mắc lỗi...") - Not in design but common */}
        </div>
    );
}
