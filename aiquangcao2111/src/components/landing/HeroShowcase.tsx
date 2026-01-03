import React from 'react';
import { Sparkles, BarChart3, Zap, CheckCircle2, Send, Bot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Floating mini-conversations around the main chat - showcasing key features
const floatingConversationsVi = [
    {
        position: "-top-4 lg:-left-40", delay: "0s", size: "w-56", rotate: "-3deg",
        messages: [
            { type: 'user', text: 'Camps nào đang hiệu quả nhất?' },
            { type: 'ai', text: '🏆 Top 3 hiệu quả:\n1. Spa VIP - CPR 35k\n2. Clinic Pro - CPR 42k\n3. Beauty Care - CPR 48k' },
        ]
    },
    {
        position: "top-0 lg:-right-44", delay: "0.3s", size: "w-56", rotate: "2deg",
        messages: [
            { type: 'user', text: 'Báo cáo hôm nay' },
            { type: 'ai', text: '📊 Chi tiêu: 3.2tr\n🎯 Kết quả: 58\n📞 SĐT: 23\n💵 Doanh thu: 85tr\n📈 ROI: 26.5x' },
        ]
    },
    {
        position: "top-40 lg:-left-44", delay: "0.6s", size: "w-52", rotate: "2deg",
        messages: [
            { type: 'user', text: 'Tạo tệp lookalike từ khách cũ' },
            { type: 'ai', text: '✅ Đã tạo Lookalike 1%\nTừ 500 khách → 2.1M đối tượng\nĐộ chính xác: Cao' },
        ]
    },
    {
        position: "top-48 lg:-right-40", delay: "0.9s", size: "w-52", rotate: "-1deg",
        messages: [
            { type: 'user', text: 'Tăng ngân sách camp Spa VIP' },
            { type: 'ai', text: '✅ Đã tăng ngân sách!\n500k → 800k/ngày\n(+60% vì CPR thấp)' },
        ]
    },
    {
        position: "bottom-4 lg:-left-40", delay: "1.2s", size: "w-52", rotate: "3deg",
        messages: [
            { type: 'user', text: 'Tạo rule dừng camp đắt' },
            { type: 'ai', text: '⚡ Rule đã kích hoạt\nTự dừng khi CPR > 100k\nKiểm tra mỗi 30 phút' },
        ]
    },
    {
        position: "bottom-0 lg:-right-44", delay: "1.5s", size: "w-52", rotate: "-2deg",
        messages: [
            { type: 'user', text: 'Tạo QC tin nhắn cho Spa' },
            { type: 'ai', text: '✅ Đã tạo xong!\nCamp + AdSet + Ad\nNgân sách: 500k/ngày\n🚀 Đang chạy!' },
        ]
    },
];

const floatingConversationsEn = [
    {
        position: "-top-4 lg:-left-40", delay: "0s", size: "w-56", rotate: "-3deg",
        messages: [
            { type: 'user', text: 'Which camps perform best?' },
            { type: 'ai', text: '🏆 Top 3 performance:\n1. Spa VIP - CPR $1.5\n2. Clinic Pro - CPR $1.8\n3. Beauty Care - CPR $2' },
        ]
    },
    {
        position: "top-0 lg:-right-44", delay: "0.3s", size: "w-56", rotate: "2deg",
        messages: [
            { type: 'user', text: "Today's report" },
            { type: 'ai', text: '📊 Spend: $140\n🎯 Results: 58\n📞 Leads: 23\n💵 Revenue: $3,500\n📈 ROI: 26.5x' },
        ]
    },
    {
        position: "top-40 lg:-left-44", delay: "0.6s", size: "w-52", rotate: "2deg",
        messages: [
            { type: 'user', text: 'Create lookalike from customers' },
            { type: 'ai', text: '✅ Created Lookalike 1%\nFrom 500 → 2.1M audience\nAccuracy: High' },
        ]
    },
    {
        position: "top-48 lg:-right-40", delay: "0.9s", size: "w-52", rotate: "-1deg",
        messages: [
            { type: 'user', text: 'Increase Spa VIP budget' },
            { type: 'ai', text: '✅ Budget increased!\n$20 → $35/day\n(+60% due to low CPR)' },
        ]
    },
    {
        position: "bottom-4 lg:-left-40", delay: "1.2s", size: "w-52", rotate: "3deg",
        messages: [
            { type: 'user', text: 'Create rule to stop expensive ads' },
            { type: 'ai', text: '⚡ Rule activated\nAuto-stop when CPR > $4\nCheck every 30 min' },
        ]
    },
    {
        position: "bottom-0 lg:-right-44", delay: "1.5s", size: "w-52", rotate: "-2deg",
        messages: [
            { type: 'user', text: 'Create message ad for Spa' },
            { type: 'ai', text: '✅ Created!\nCamp + AdSet + Ad\nBudget: $20/day\n🚀 Running!' },
        ]
    },
];

// Main chat messages
const chatMessagesVi = [
    { type: 'user', text: 'Tạo chiến dịch quảng cáo tin nhắn cho dịch vụ spa' },
    { type: 'ai', text: 'Đang tạo chiến dịch quảng cáo tin nhắn...' },
    { type: 'ai', text: '✅ Đã tạo xong! Chiến dịch "Spa Premium - Tin nhắn" với 3 nhóm quảng cáo, ngân sách 500k/ngày.' },
];

const chatMessagesEn = [
    { type: 'user', text: 'Create message ads campaign for spa services' },
    { type: 'ai', text: 'Creating message ads campaign...' },
    { type: 'ai', text: '✅ Done! Campaign "Spa Premium - Messages" with 3 ad sets, budget $20/day.' },
];

// Floating status badges (for tablet view)
const floatingBadgesVi = [
    { icon: Sparkles, text: "Đang tạo chiến dịch...", color: "from-[#e91e63] to-[#ff7043]", position: "top-2 left-1/4", delay: "0.2s" },
    { icon: BarChart3, text: "Báo cáo: +25% hiệu suất", color: "bg-green-500", position: "top-12 right-1/4", delay: "0.7s" },
    { icon: Zap, text: "Tối ưu ngân sách ✓", color: "bg-green-500", position: "bottom-28 left-1/6", delay: "1.2s" },
    { icon: CheckCircle2, text: "Đã tạo 3 quảng cáo", color: "bg-green-500", position: "bottom-20 right-1/6", delay: "1.7s" },
];

const floatingBadgesEn = [
    { icon: Sparkles, text: "Creating campaign...", color: "from-[#e91e63] to-[#ff7043]", position: "top-2 left-1/4", delay: "0.2s" },
    { icon: BarChart3, text: "Report: +25% performance", color: "bg-green-500", position: "top-12 right-1/4", delay: "0.7s" },
    { icon: Zap, text: "Budget optimized ✓", color: "bg-green-500", position: "bottom-28 left-1/6", delay: "1.2s" },
    { icon: CheckCircle2, text: "Created 3 ads", color: "bg-green-500", position: "bottom-20 right-1/6", delay: "1.7s" },
];

// Mobile floating card content
const mobileCardsVi = {
    topLeft: { user: 'Camps nào hiệu quả nhất?', ai: '🏆 Top 3:\n1. Spa VIP - CPR 35k\n2. Clinic Pro - CPR 42k' },
    topRight: { user: 'Báo cáo hôm nay', ai: '📊 Chi tiêu: 3.2tr\n🎯 Kết quả: 58\n📈 ROI: 26.5x' },
    midLeft: { user: 'Tạo tệp lookalike', ai: '✅ Đã tạo Lookalike 1%\nTừ 500 → 2.1M đối tượng' },
    midRight: { user: 'Tăng ngân sách Spa VIP', ai: '✅ Đã tăng!\n500k → 800k/ngày' },
    botLeft: { user: 'Tạo rule dừng camp đắt', ai: '⚡ Rule đã kích hoạt\nDừng khi CPR > 100k' },
    botRight: { user: 'Tạo QC tin nhắn cho Spa', ai: '✅ Đã tạo xong!\n🚀 Đang chạy 500k/ngày' },
};

const mobileCardsEn = {
    topLeft: { user: 'Best performing camps?', ai: '🏆 Top 3:\n1. Spa VIP - CPR $1.5\n2. Clinic Pro - CPR $1.8' },
    topRight: { user: "Today's report", ai: '📊 Spend: $140\n🎯 Results: 58\n📈 ROI: 26.5x' },
    midLeft: { user: 'Create lookalike', ai: '✅ Created Lookalike 1%\nFrom 500 → 2.1M audience' },
    midRight: { user: 'Increase Spa VIP budget', ai: '✅ Increased!\n$20 → $35/day' },
    botLeft: { user: 'Create rule for expensive ads', ai: '⚡ Rule activated\nStop when CPR > $4' },
    botRight: { user: 'Create message ad for Spa', ai: '✅ Created!\n🚀 Running $20/day' },
};

export default function HeroShowcase() {
    const { language, t } = useLanguage();

    // Select content based on language
    const floatingConversations = language === 'en' ? floatingConversationsEn : floatingConversationsVi;
    const chatMessages = language === 'en' ? chatMessagesEn : chatMessagesVi;
    const floatingBadges = language === 'en' ? floatingBadgesEn : floatingBadgesVi;
    const mobileCards = language === 'en' ? mobileCardsEn : mobileCardsVi;

    return (
        <div className="relative w-full max-w-5xl mx-auto px-4">
            {/* Floating Mini Conversations - Left & Right */}
            {floatingConversations.map((conv, index) => (
                <div
                    key={index}
                    className={`absolute ${conv.position} hidden lg:block ${conv.size} bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10`}
                    style={{
                        animation: `floatBubble 4s ease-in-out infinite`,
                        animationDelay: conv.delay,
                        transform: `rotate(${conv.rotate})`,
                    }}
                >
                    <div className="space-y-1.5">
                        {conv.messages.map((msg, msgIndex) => (
                            <div
                                key={msgIndex}
                                className={`text-[9px] leading-tight ${msg.type === 'user'
                                    ? 'bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-lg rounded-br-sm px-2 py-1.5 ml-auto max-w-[90%]'
                                    : 'bg-gray-100 text-gray-700 rounded-lg rounded-bl-sm px-2 py-1.5 max-w-[90%]'
                                    }`}
                                style={{ whiteSpace: 'pre-line' }}
                            >
                                {msg.text}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Main Chat Container - Laptop Frame */}
            <div className="relative bg-gray-900 rounded-2xl md:rounded-3xl p-2 md:p-3 shadow-2xl mx-auto max-w-lg z-20">
                {/* Browser Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-t-xl">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500"></div>
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 bg-gray-700 rounded-md px-3 py-1 text-[10px] md:text-xs text-gray-400 text-center">
                        aiadsfb.com
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="bg-white rounded-b-xl overflow-hidden">
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 border-b bg-gradient-to-r from-[#e91e63]/5 to-[#ff7043]/5">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center">
                            <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-xs md:text-sm">AI Assistant</p>
                            <p className="text-[10px] md:text-xs text-green-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                {t('Sẵn sàng hỗ trợ', 'Ready to help')}
                            </p>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="p-3 md:p-4 space-y-3 min-h-[160px] md:min-h-[180px] bg-gray-50">
                        {chatMessages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                style={{
                                    animation: `fadeInUp 0.5s ease-out ${index * 0.3}s both`
                                }}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs md:text-sm ${msg.type === 'user'
                                        ? 'bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-br-md'
                                        : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <div className="px-3 md:px-4 py-2 md:py-3 border-t bg-white">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 md:px-4 py-2">
                            <Sparkles className="w-4 h-4 text-[#e91e63]" />
                            <span className="text-xs md:text-sm text-gray-400 flex-1">{t('Nhắn tin với AI Assistant...', 'Message AI Assistant...')}</span>
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center">
                                <Send className="w-3 h-3 md:w-4 md:h-4 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Status Badges - Visible on tablet only */}
            {floatingBadges.map((badge, index) => (
                <div
                    key={index}
                    className={`absolute ${badge.position} hidden md:flex lg:hidden items-center gap-2 bg-white rounded-full px-3 py-2 shadow-lg border border-gray-100 z-10`}
                    style={{
                        animation: `floatBubble 3s ease-in-out infinite`,
                        animationDelay: badge.delay,
                    }}
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${badge.color.includes('from-') ? `bg-gradient-to-r ${badge.color}` : badge.color}`}>
                        <badge.icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">
                        {badge.text}
                    </span>
                </div>
            ))}

            {/* Mobile Floating Conversations - Full chat cards overlaying the main chat */}
            <div className="absolute inset-0 pointer-events-none lg:hidden z-30">
                {/* Top left - Campaign Performance */}
                <div
                    className="absolute -top-6 -left-2 w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1.5"
                    style={{ animation: `floatBubble 3.5s ease-in-out infinite`, animationDelay: '0s', transform: 'rotate(-2deg)' }}
                >
                    <div className="space-y-1">
                        <div className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-md rounded-br-sm px-1.5 py-1 ml-auto max-w-[95%] text-[7px]">
                            {mobileCards.topLeft.user}
                        </div>
                        <div className="bg-gray-100 text-gray-700 rounded-md rounded-bl-sm px-1.5 py-1 max-w-[95%] text-[7px] leading-tight" style={{ whiteSpace: 'pre-line' }}>
                            {mobileCards.topLeft.ai}
                        </div>
                    </div>
                </div>

                {/* Top right - Daily Report */}
                <div
                    className="absolute -top-6 -right-2 w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1.5"
                    style={{ animation: `floatBubble 3.5s ease-in-out infinite`, animationDelay: '0.5s', transform: 'rotate(2deg)' }}
                >
                    <div className="space-y-1">
                        <div className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-md rounded-br-sm px-1.5 py-1 ml-auto max-w-[95%] text-[7px]">
                            {mobileCards.topRight.user}
                        </div>
                        <div className="bg-gray-100 text-gray-700 rounded-md rounded-bl-sm px-1.5 py-1 max-w-[95%] text-[7px] leading-tight" style={{ whiteSpace: 'pre-line' }}>
                            {mobileCards.topRight.ai}
                        </div>
                    </div>
                </div>

                {/* Middle left - Lookalike */}
                <div
                    className="absolute top-1/3 -left-3 w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1.5"
                    style={{ animation: `floatBubble 4s ease-in-out infinite`, animationDelay: '0.3s', transform: 'rotate(1deg)' }}
                >
                    <div className="space-y-1">
                        <div className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-md rounded-br-sm px-1.5 py-1 ml-auto max-w-[95%] text-[7px]">
                            {mobileCards.midLeft.user}
                        </div>
                        <div className="bg-gray-100 text-gray-700 rounded-md rounded-bl-sm px-1.5 py-1 max-w-[95%] text-[7px] leading-tight" style={{ whiteSpace: 'pre-line' }}>
                            {mobileCards.midLeft.ai}
                        </div>
                    </div>
                </div>

                {/* Middle right - Budget */}
                <div
                    className="absolute top-1/3 -right-3 w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1.5"
                    style={{ animation: `floatBubble 4s ease-in-out infinite`, animationDelay: '0.8s', transform: 'rotate(-1deg)' }}
                >
                    <div className="space-y-1">
                        <div className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-md rounded-br-sm px-1.5 py-1 ml-auto max-w-[95%] text-[7px]">
                            {mobileCards.midRight.user}
                        </div>
                        <div className="bg-gray-100 text-gray-700 rounded-md rounded-bl-sm px-1.5 py-1 max-w-[95%] text-[7px] leading-tight" style={{ whiteSpace: 'pre-line' }}>
                            {mobileCards.midRight.ai}
                        </div>
                    </div>
                </div>

                {/* Bottom left - Auto Rules */}
                <div
                    className="absolute bottom-12 -left-2 w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1.5"
                    style={{ animation: `floatBubble 3.8s ease-in-out infinite`, animationDelay: '0.6s', transform: 'rotate(2deg)' }}
                >
                    <div className="space-y-1">
                        <div className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-md rounded-br-sm px-1.5 py-1 ml-auto max-w-[95%] text-[7px]">
                            {mobileCards.botLeft.user}
                        </div>
                        <div className="bg-gray-100 text-gray-700 rounded-md rounded-bl-sm px-1.5 py-1 max-w-[95%] text-[7px] leading-tight" style={{ whiteSpace: 'pre-line' }}>
                            {mobileCards.botLeft.ai}
                        </div>
                    </div>
                </div>

                {/* Bottom right - Create Ad */}
                <div
                    className="absolute bottom-12 -right-2 w-36 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 p-1.5"
                    style={{ animation: `floatBubble 3.8s ease-in-out infinite`, animationDelay: '1.1s', transform: 'rotate(-2deg)' }}
                >
                    <div className="space-y-1">
                        <div className="bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-md rounded-br-sm px-1.5 py-1 ml-auto max-w-[95%] text-[7px]">
                            {mobileCards.botRight.user}
                        </div>
                        <div className="bg-gray-100 text-gray-700 rounded-md rounded-bl-sm px-1.5 py-1 max-w-[95%] text-[7px] leading-tight" style={{ whiteSpace: 'pre-line' }}>
                            {mobileCards.botRight.ai}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes floatBubble {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-8px);
                    }
                }
            `}</style>
        </div>
    );
}

