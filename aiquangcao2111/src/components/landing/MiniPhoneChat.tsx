import React from 'react';
import { Bot, Send, Sparkles, Wifi, Battery, Signal } from 'lucide-react';

interface MiniPhoneChatProps {
    messages: { type: 'user' | 'ai'; text: string }[];
    rotate?: string;
    className?: string;
}

export default function MiniPhoneChat({ messages, rotate = '0deg', className = '' }: MiniPhoneChatProps) {
    return (
        <div
            className={`w-36 bg-gray-900 rounded-[24px] p-1.5 shadow-2xl ${className}`}
            style={{ transform: `rotate(${rotate})` }}
        >
            {/* Phone Notch */}
            <div className="relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-b-xl z-10 flex items-center justify-center">
                    <div className="w-8 h-1.5 bg-gray-800 rounded-full"></div>
                </div>
            </div>

            {/* Phone Screen */}
            <div className="bg-white rounded-[20px] overflow-hidden">
                {/* Status Bar */}
                <div className="flex items-center justify-between px-3 py-1 bg-gradient-to-r from-[#e91e63]/10 to-[#ff7043]/10">
                    <span className="text-[8px] text-gray-600 font-medium">9:41</span>
                    <div className="flex items-center gap-0.5">
                        <Signal className="w-2.5 h-2.5 text-gray-600" />
                        <Wifi className="w-2.5 h-2.5 text-gray-600" />
                        <Battery className="w-3 h-2.5 text-gray-600" />
                    </div>
                </div>

                {/* Chat Header */}
                <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-gradient-to-r from-[#e91e63]/5 to-[#ff7043]/5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center">
                        <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 text-[9px] leading-tight">AI Assistant</p>
                        <p className="text-[7px] text-green-500 flex items-center gap-0.5">
                            <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                            Online
                        </p>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="p-2 space-y-1.5 min-h-[140px] max-h-[180px] bg-gray-50 overflow-hidden">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[90%] px-2 py-1 text-[8px] leading-tight ${msg.type === 'user'
                                    ? 'bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-xl rounded-br-sm'
                                    : 'bg-white border border-gray-200 text-gray-700 rounded-xl rounded-bl-sm shadow-sm'
                                    }`}
                                style={{ whiteSpace: 'pre-line' }}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat Input */}
                <div className="px-2 py-1.5 border-t bg-white">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                        <Sparkles className="w-2.5 h-2.5 text-[#e91e63]" />
                        <span className="text-[7px] text-gray-400 flex-1">Nhắn tin...</span>
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center">
                            <Send className="w-2 h-2 text-white" />
                        </div>
                    </div>
                </div>

                {/* Home Indicator */}
                <div className="flex justify-center py-1">
                    <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                </div>
            </div>
        </div>
    );
}
