import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MiniPhoneChat from './MiniPhoneChat';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, BarChart3, CheckCircle2, ChevronDown, ChevronRight, Paperclip, Sparkles, Hand } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductFeature {
    icon: React.ReactNode;
    title: string;
    description: string;
    tag: string;
    buttonText: string;
    buttonVariant?: 'primary' | 'outline';
    dark?: boolean;
    chat?: any[];
}

interface InteractiveFeatureShowcaseProps {
    features: ProductFeature[];
    onOpenPricing: () => void;
}

// English translations for feature titles and descriptions
const featureTranslationsEn: Record<string, { title: string; description: string }> = {
    'Quảng cáo Tin nhắn': { title: 'Message Ads', description: 'AI creates conversation scripts: auto-reply, inbox/booking goals with conversation-based reporting.' },
    'Báo cáo ADS tự động': { title: 'Auto ADS Reports', description: 'Track metrics: results, cost/message, booking rate, phone numbers, %MKT/Revenue. Schedule daily reports.' },
    'Tạo quy tắc tự động': { title: 'Automation Rules', description: 'Create rules to auto-pause/resume ads based on performance metrics.' },
    'Nhắm mục tiêu tự động': { title: 'Auto Targeting', description: 'AI analyzes services → suggests optimal interests, ages, locations for Spa/Clinic.' },
    'Tạo mẫu nhắm mục tiêu': { title: 'Targeting Templates', description: 'Save and reuse targeting presets for quick campaign creation.' },
    'AI tạo quảng cáo 1-click': { title: 'AI 1-Click Ads', description: 'Select goal (Messages/Leads/Website/Sales) → auto-create Campaign/AdSet/Ads. Publish in one click.' },
    'Ngân sách tự tối ưu 24/7': { title: 'Auto Budget 24/7', description: 'AI increases when profitable, decreases when expensive. Hourly/daily rules based on performance.' },
    'Quảng cáo bài viết có sẵn': { title: 'Boost Existing Posts', description: 'Paste post link (Reels/Post) → AI auto-extracts ID, content & suggests matching audience.' },
    'AI viết content chuẩn dịch vụ': { title: 'AI Service Content', description: 'Enter topic → instantly generate caption/headline/image suggestions tailored to your target audience.' },
    'Tạo tệp tương tự và quảng cáo tệp': { title: 'Lookalike Audiences & Ads', description: 'Create lookalike audiences from your best customers and target them with ads.' },
    'Tạo tệp đối tượng và quảng cáo tệp': { title: 'Custom Audiences & Ads', description: 'Build custom audiences from your data and create targeted ad campaigns.' },
    'Tạm dừng/chạy lại & tối ưu tự động': { title: 'Pause/Resume & Auto-Optimize', description: 'View all campaigns, toggle on/off each camp or chat directly with AI.' },
    'Tạo tệp người nhắn tin và tệp tương tự': { title: 'Messenger & Lookalike Audiences', description: 'Create audiences from people who messaged your page and find similar users.' },
};

// English translations for chat messages (partial match)
const chatMessageTranslationsEn: Record<string, string> = {
    // AI responses
    '✨ Đang phân tích thông tin quảng cáo tin nhắn mới...': '✨ Analyzing new message ads info...',
    '✅ Media hợp lệ! Đang upload lên Facebook...': '✅ Valid media! Uploading to Facebook...',
    '✅ Tạo thành công!': '✅ Created successfully!',
    'Kiểm tra trong Facebook Ads Manager nhé!': 'Check in Facebook Ads Manager!',
    'Đang tạo chiến dịch...': 'Creating campaign...',
    '✅ Đã tạo xong!': '✅ Done!',

    // User commands
    'Báo cáo hôm nay': "Today's report",
    'Báo cáo sale hôm nay': "Today's sales report",
    'Báo cáo tuần': 'Weekly report',
    'Báo cáo tháng': 'Monthly report',
    'So với hôm qua?': 'Compared to yesterday?',
    'Gợi ý đối tượng cho Spa': 'Suggest audience for Spa',
    'Tạo QC tin nhắn cho Spa': 'Create message ad for Spa',
    'Xem tất cả các chiến dịch': 'View all campaigns',
    'Tắt chiến dịch Phun xăm 27/12': 'Turn off Phun xăm 27/12 campaign',
    'Viết caption về triệt lông': 'Write caption about hair removal',
    'Tạo tệp lookalike từ khách cũ': 'Create lookalike from old customers',
    'Tăng ngân sách camp Spa VIP': 'Increase Spa VIP campaign budget',
    'Tạo rule tối ưu ngân sách': 'Create budget optimization rule',
    'Tạo rule dừng camp đắt': 'Create rule to stop expensive campaigns',

    // Report labels - AI responses
    '💰 Báo cáo Sale hôm nay:': '💰 Today\'s Sales Report:',
    '📊 Báo cáo Tuần': '📊 Weekly Report',
    '📊 Báo cáo Tháng': '📊 Monthly Report',
    'Leads mới:': 'New leads:',
    'Đã liên hệ:': 'Contacted:',
    'Đặt lịch:': 'Booked:',
    'Chốt đơn:': 'Closed deals:',
    'Tỉ lệ chốt:': 'Close rate:',
    'Chi tiêu:': 'Spend:',
    'Kết quả:': 'Results:',
    'Doanh thu:': 'Revenue:',
    'Tăng': 'Up',
    'giảm': 'down',

    // Targeting AI response
    '🎯 Đề xuất targeting:': '🎯 Targeting suggestions:',
    'Quan tâm:': 'Interests:',
    'Thu nhập:': 'Income:',
    'Trung bình+': 'Medium+',

    // Rule response
    '⚡ Rule đã kích hoạt!': '⚡ Rule activated!',
    'Tăng 20% khi CPR': 'Increase 20% when CPR',
    'Giảm 30% khi CPR': 'Decrease 30% when CPR',
    'Kiểm tra mỗi 30 phút': 'Check every 30 min',
    'Đã áp dụng cho': 'Applied to',

    // Campaign response
    '⏸️ Đã tắt chiến dịch': '⏸️ Campaign turned off',
    'thành công!': 'successfully!',
    'Trạng thái:': 'Status:',
    'Đang chạy → Tắt': 'Running → Off',
    'Thời gian:': 'Time:',
    'Ngay lập tức': 'Immediately',

    // Content response  
    '✨ Caption đã tạo:': '✨ Caption created:',

    // Image text (user input)
    'Tên chiến dịch:': 'Campaign name:',
    'Độ tuổi:': 'Age:',
    'Giới tính:': 'Gender:',
    'ngân sách trọn đời:': 'lifetime budget:',
    'Vị trí:': 'Location:',
    'Việt Nam': 'Vietnam',

    // Feature 4 - Targeting
    'Nữ 25-45 tuổi': 'Women 25-45',
    'Làm đẹp': 'Beauty',
    'Skincare': 'Skincare',
    'tuổi': 'years old',

    // Feature 6 - 1-Click Ads  
    'Chiến dịch đang chạy!': 'Campaign is running!',
    'nhóm QC': 'ad groups',

    // Feature 7 - Budget rules
    'camps': 'campaigns',

    // Feature 8 - Boost Post
    'Em đang xử lý bài viết, anh đợi xử lý ạ.': 'Processing post, please wait...',
    'Vui lòng đợi': 'Please wait',
    'sở thích được chọn': 'interests selected',

    // Feature 9 - Content
    'Da mịn như lụa': 'Silky smooth skin',
    'Triệt lông vĩnh viễn': 'Permanent hair removal',

    // Feature 11/12/13 - Audience
    'Anh muốn tạo loại đối tượng nào ạ?': 'What type of audience do you want to create?',
    'Đã đủ thông tin!': 'All info collected!',
    'Anh xác nhận tạo không?': 'Do you want to confirm and create?',
    'Xác nhận tạo': 'Confirm & Create',
    'Tạo tập đối tượng': 'Create audience',

    // Feature 12 - Campaign list
    'Chiến dịch': 'Campaigns',
    'Nhóm QC': 'Ad Groups',
    'Quảng cáo': 'Ads',
    'Chạy': 'Active',
    'Dừng': 'Paused',

    // Comparison report
    'Tăng 15% chi tiêu': 'Up 15% spend',
    'Tăng 25% kết quả': 'Up 25% results',
    'CPR giảm 8%': 'CPR down 8%',
    '📈 Tăng': '📈 Up',
    'CPR giảm': 'CPR down',

    // Audience Creation Flow
    'Tạo tệp đối tượng': 'Create audience',
    // Audience Creation Flow (additional - some already defined above)
    'Danh sách SĐT': 'Phone number list',
    'Anh muốn nhập SĐT bằng cách nào ạ?': 'How do you want to enter phone numbers?',
    'Nhập trực tiếp': 'Enter directly',
    'Vui lòng dán danh sách số điện thoại vào ô bên dưới.': 'Please paste phone numbers in the field below.',
    '📋 Dán danh sách SĐT (mỗi số 1 dòng hoặc dấu phẩy)': '📋 Paste phone list (one per line or comma)',
    '✅ Đã trích xuất': '✅ Extracted',
    'số điện thoại (đã loại trùng)!': 'phone numbers (duplicates removed)!',
    'Anh xác nhận tạo đối tượng không?': 'Do you want to create audience?',
    '✅ Xác nhận tạo': '✅ Confirm Create',
    '❌ Hủy bỏ': '❌ Cancel',
    '❌ Hủy': '❌ Cancel',
    '❌ Đóng': '❌ Close',
    '⏳ Đang tạo đối tượng...': '⏳ Creating audience...',
    'đã được tạo thành công!': 'has been created successfully!',
    'Anh muốn làm gì tiếp theo?': 'What would you like to do next?',
    '🚀 Chạy quảng cáo tệp': '🚀 Run audience ads',
    '🎯 Tạo Tệp tương tự': '🎯 Create Lookalike',
    'Tạo Tệp tương tự': 'Create Lookalike',
    'Anh muốn tạo lookalike ở quốc gia nào?': 'Which country for lookalike?',
    'Anh muốn quy mô lookalike là bao nhiêu %?': 'What lookalike size %?',
    '✅ Đã đủ thông tin!': '✅ All info collected!',
    // Note: 'Anh xác nhận tạo không?' already defined above
    '⏳ Đang tạo Tệp tương tự...': '⏳ Creating Lookalike...',
    'Tệp tương tự của': 'Lookalike of',
    '✅ Đã tạo xong tệp tương tự!': '✅ Lookalike created!',
    'Bạn có muốn chạy quảng cáo với cả 2 tệp này không?': 'Do you want to run ads with both audiences?',
    '🚀 Chạy QC cả 2 tệp': '🚀 Run ads with both',
    'Vui lòng nhập thông tin chiến dịch:': 'Please enter campaign info:',
    '🔍 Đang phân tích bài viết để tạo quảng cáo...': '🔍 Analyzing post for ad creation...',
    '✅ Đã lấy thông tin bài viết thành công.': '✅ Post info retrieved successfully.',
    'Vui lòng kiểm tra lại thông tin bên dưới.': 'Please review the info below.',
    'Chưa xác định vị trí': 'Location not specified',
    'tệp được chọn': 'audiences selected',
    '⏳ Đang tạo chiến dịch với tệp đối tượng...': '⏳ Creating campaign with audience...',

    // Messenger Audience Flow
    'Tạo tệp người tương tác Messenger': 'Create Messenger audience',
    '📝 Đã chọn nguồn:': '📝 Selected source:',

    // Lookalike Audience Flow
    'Tạo tệp lookalike': 'Create Lookalike',

    // Targeting Template Flow
    '📝 Vui lòng điền thông tin mẫu targeting:': '📝 Please fill targeting template info:',
    '📝 Đang mở form tạo mẫu...': '📝 Opening template form...',
    '✅ Đã tạo mẫu targeting thành công!': '✅ Targeting template created!',

    // Automation Rule Flow
    '📝 Bạn muốn tạo quy tắc theo cách nào?': '📝 How do you want to create the rule?',
    '🔧 Cơ bản (Form)': '🔧 Basic (Form)',
    '🤖 Nâng cao (AI)': '🤖 Advanced (AI)',
    'Cơ bản': 'Basic',
    '📝 Đang mở form tạo quy tắc...': '📝 Opening rule form...',
    'Tạo quy tắc': 'Create rule',
    '⏳ Đang tạo quy tắc...': '⏳ Creating rule...',
    '✅ **Đã tạo quy tắc thành công!**': '✅ **Rule created successfully!**',
    'Tên:': 'Name:',
    'Khi:': 'When:',
    'Thì:': 'Then:',
    'Gắn nhãn:': 'Label:',
    '💡 Quy tắc sẽ được kiểm tra mỗi 15 phút!': '💡 Rule will check every 15 minutes!',

    // Option labels
    '📞 SĐT': '📞 Phone',
    '💬 Messenger': '💬 Messenger',
    '🎯 Lookalike': '🎯 Lookalike',
    '📁 Upload file CSV/TXT': '📁 Upload CSV/TXT file',
    '⌨️ Nhập trực tiếp': '⌨️ Enter directly',
};

// Helper to translate chat text
const translateChatText = (text: string, language: string): string => {
    if (language !== 'en' || !text) return text;
    // Check for exact match first
    if (chatMessageTranslationsEn[text]) return chatMessageTranslationsEn[text];
    // Check for partial matches (for longer messages)
    let result = text;
    for (const [vi, en] of Object.entries(chatMessageTranslationsEn)) {
        if (result.includes(vi)) {
            result = result.replace(vi, en);
        }
    }
    return result;
};


export default function InteractiveFeatureShowcase({ features, onOpenPricing }: InteractiveFeatureShowcaseProps) {
    const { t, language } = useLanguage();
    const [activeIndex, setActiveIndex] = useState(0);

    // Helper to get translated feature text
    const getFeatureText = (viTitle: string, viDescription: string) => {
        if (language === 'en' && featureTranslationsEn[viTitle]) {
            return featureTranslationsEn[viTitle];
        }
        return { title: viTitle, description: viDescription };
    };
    const [visibleMessages, setVisibleMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const chatContainerRef = React.useRef<HTMLDivElement>(null);
    const mockupContainerRef = React.useRef<HTMLDivElement>(null);

    // Scroll to mockup on mobile when feature is clicked
    const handleFeatureClick = (index: number) => {
        setActiveIndex(index);
        // Only scroll on mobile (window width < 1024px)
        if (window.innerWidth < 1024 && mockupContainerRef.current) {
            setTimeout(() => {
                mockupContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    // Auto-scroll to bottom whenever visibleMessages changes
    useEffect(() => {
        const scrollToBottom = () => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        };

        // Scroll immediately
        scrollToBottom();

        // Scroll again after animation/render usually completes
        const timeoutId = setTimeout(scrollToBottom, 300);

        return () => clearTimeout(timeoutId);
    }, [visibleMessages, isTyping]);

    // Reset and animate chat when active feature changes
    useEffect(() => {
        setVisibleMessages([]);
        setIsTyping(false);

        if (!features[activeIndex].chat) return;

        let timeouts: NodeJS.Timeout[] = [];
        let currentDelay = 0;

        features[activeIndex].chat.forEach((msg: any, index: number) => {
            // Determine if message is from bot based on type
            const isBotMessage = msg.type === 'ai' || msg.type === 'report' || msg.type === 'confirmation_card' || msg.type === 'accordion_card' || msg.type === 'option_card' || msg.type === 'input_card';
            const processedMsg = { ...msg, isBot: isBotMessage, id: `msg-${index}` };

            // Delay before starting this message block
            currentDelay += 1200; // Increased gap (was 800)

            if (isBotMessage) {
                // 1. Start typing
                const startTyping = setTimeout(() => {
                    setIsTyping(true);
                }, currentDelay);
                timeouts.push(startTyping);

                // 2. Typing duration
                const typingDuration = 1500 + Math.random() * 1000; // Slower typing (min 1.5s)
                currentDelay += typingDuration;

                // 3. Show message and stop typing
                const showMessage = setTimeout(() => {
                    setIsTyping(false);
                    setVisibleMessages(prev => {
                        const nextMessages = [...prev, processedMsg];
                        // Sliding window: Keep only last 3 messages for audience flows
                        const audienceFlows = ['Báo cáo ADS tự động', 'Tạm dừng/chạy lại & tối ưu tự động', 'Tạo tệp đối tượng và quảng cáo tệp', 'Tạo tệp người nhắn tin và tệp tương tự', 'Tạo tệp tương tự và quảng cáo tệp', 'Tạo mẫu nhắm mục tiêu', 'Tạo quy tắc tự động'];
                        if (audienceFlows.includes(features[activeIndex].title) && nextMessages.length > 3) {
                            return nextMessages.slice(nextMessages.length - 3);
                        }
                        return nextMessages;
                    });
                }, currentDelay);
                timeouts.push(showMessage);
            } else {
                // User message appears
                const showMessage = setTimeout(() => {
                    setVisibleMessages(prev => {
                        const nextMessages = [...prev, processedMsg];
                        // Sliding window: Keep only last 3 messages for audience flows
                        const audienceFlows = ['Báo cáo ADS tự động', 'Tạm dừng/chạy lại & tối ưu tự động', 'Tạo tệp đối tượng và quảng cáo tệp', 'Tạo tệp người nhắn tin và tệp tương tự', 'Tạo tệp tương tự và quảng cáo tệp', 'Tạo mẫu nhắm mục tiêu', 'Tạo quy tắc tự động'];
                        if (audienceFlows.includes(features[activeIndex].title) && nextMessages.length > 3) {
                            return nextMessages.slice(nextMessages.length - 3);
                        }
                        return nextMessages;
                    });
                }, currentDelay);
                timeouts.push(showMessage);
            }
        });

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [activeIndex, features]);

    const activeFeature = features[activeIndex];

    return (
        <section className="pt-4 pb-56 md:pt-8 md:pb-24 bg-gray-50 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <span className="text-[#e91e63] font-bold tracking-wider text-sm uppercase mb-2 block">{t('Tính năng nổi bật', 'Key Features')}</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">{t('Mọi thứ bạn cần để', 'Everything You Need to')} <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e91e63] to-[#ff7043]">{t('X3 Hiệu quả Quảng cáo', '3X Your Ad Performance')}</span></h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">{t('Hệ thống AI tự động hóa toàn diện quy trình Marketing của bạn từ A-Z.', 'AI system fully automates your Marketing process from A-Z.')}</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-4 items-center">
                    {/* Left Side: Feature Navigation */}
                    <div className="w-full lg:w-5/12 space-y-0 mb-8 lg:mb-0">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "group relative py-1.5 lg:py-2 px-2 lg:px-3 rounded-lg cursor-pointer transition-all duration-300 border",
                                    activeIndex === index
                                        ? "bg-white border-[#e91e63]/10 shadow-md scale-[1.01]"
                                        : "bg-transparent border-transparent hover:bg-white/50 hover:border-gray-100"
                                )}
                                onClick={() => handleFeatureClick(index)}
                            >
                                <div className="flex items-center lg:items-start gap-1.5 lg:gap-2">
                                    {/* Số thứ tự */}
                                    <span className={cn(
                                        "text-[10px] lg:text-xs font-bold shrink-0 w-4 lg:w-5 text-right transition-colors duration-300",
                                        activeIndex === index ? "text-[#e91e63]" : "text-gray-400 group-hover:text-[#e91e63]/70"
                                    )}>
                                        {index + 1}.
                                    </span>
                                    <div className={cn(
                                        "w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                                        activeIndex === index ? "bg-[#e91e63]/10 text-[#e91e63]" : "bg-gray-100 text-gray-400 group-hover:bg-[#e91e63]/5 group-hover:text-[#e91e63]/70"
                                    )}>
                                        <span className="scale-75 lg:scale-100">{feature.icon}</span>
                                    </div>
                                    <div className="space-y-0.5 lg:space-y-1.5 flex-1">
                                        <h3 className={cn(
                                            "text-[13px] lg:text-base font-bold transition-colors duration-300 leading-tight",
                                            activeIndex === index ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700"
                                        )}>
                                            {getFeatureText(feature.title, feature.description).title}
                                        </h3>

                                        {/* Description - hidden on mobile, shown on desktop */}
                                        <div className={cn(
                                            "hidden lg:grid transition-all duration-300 ease-in-out",
                                            activeIndex === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                        )}>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    {getFeatureText(feature.title, feature.description).description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {activeIndex === index && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        className="absolute left-0 top-2 bottom-2 lg:top-4 lg:bottom-4 w-1 bg-[#e91e63] rounded-r-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right Side: Dynamic Preview - Below on mobile, beside on desktop */}
                    <div ref={mockupContainerRef} className="scroll-mt-4"></div>
                    <div className="w-full lg:w-7/12 relative h-[450px] lg:h-[500px] flex items-start lg:items-center justify-center -mt-4 lg:mt-0 overflow-visible">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#e91e63]/5 to-[#ff7043]/5 rounded-[3rem] -z-10" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, y: 20, rotate: 5 }}
                                animate={{ opacity: 1, y: 0, rotate: 0 }}
                                exit={{ opacity: 0, y: -20, rotate: -5 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="relative z-10 scale-[0.55] lg:scale-100 origin-top"
                            >
                                {activeFeature.chat && (
                                    <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border-8 border-gray-900 relative">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20"></div>
                                        <div className="w-[300px] h-[600px] overflow-hidden rounded-[2rem] bg-gray-50">
                                            {/* Header */}
                                            <div className="bg-white p-3 pt-6 border-b flex items-center gap-3 shadow-sm relative z-10">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#e91e63] to-[#ff7043] flex items-center justify-center text-white font-bold text-xs">AI</div>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">AI Assistant</div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-[10px] text-green-600 font-medium">{t('Đang hoạt động', 'Online')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Chat Area - Reusing similar logic to MiniPhoneChat but bigger */}
                                            <div
                                                ref={chatContainerRef}
                                                className="p-3 space-y-3 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar scroll-smooth"
                                            >
                                                <AnimatePresence mode='popLayout'>
                                                    {visibleMessages.map((msg: any) => {
                                                        // HACK: Strictly hide User Image message when Accordion Card appears
                                                        const hasAccordion = visibleMessages.some(m => m.type === 'accordion_card');
                                                        const shouldHide = hasAccordion && msg.type === 'image';

                                                        if (shouldHide) return null;

                                                        return (
                                                            <motion.div
                                                                layout
                                                                key={msg.id}
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 1.0, ease: "easeInOut" } }}
                                                                transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }} // Slower enter with slight delay
                                                                className={cn(
                                                                    "flex w-full",
                                                                    msg.isBot ? "justify-start" : "justify-end"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "max-w-[90%] p-2.5 rounded-2xl text-xs shadow-sm shadow-gray-200/50 break-words",
                                                                    // Use specific styles for confirmation card or override default bot style if it is a card
                                                                    msg.type === 'confirmation_card' || msg.type === 'accordion_card' || msg.type === 'input_card' || msg.type === 'template_form_card' || msg.type === 'rule_form_card' || msg.type === 'campaign_list_card'
                                                                        ? "bg-white text-gray-800 rounded-tl-sm border border-gray-100 p-0 overflow-hidden w-full max-w-[95%]"
                                                                        : msg.isBot
                                                                            ? "bg-gradient-to-r from-[#e91e63] to-[#ff7043] text-white rounded-tl-sm"
                                                                            : "bg-gray-900 text-white rounded-tr-sm"
                                                                )}>
                                                                    {msg.type === 'report' ? (
                                                                        <div className="space-y-2">
                                                                            <div className="font-bold border-b border-white/20 pb-1 mb-1 text-white">{t('📊 Báo cáo hôm nay', '📊 Today\'s Report')}</div>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="bg-white/10 p-1.5 rounded">
                                                                                    <div className="text-[10px] text-white/80">{t('Chi tiêu', 'Spend')}</div>
                                                                                    <div className="font-bold text-white">{language === 'en' ? '$140' : '3.2tr'}</div>
                                                                                </div>
                                                                                <div className="bg-white/10 p-1.5 rounded">
                                                                                    <div className="text-[10px] text-white/80">{t('Kết quả', 'Results')}</div>
                                                                                    <div className="font-bold text-white">58</div>
                                                                                </div>
                                                                                <div className="bg-white/10 p-1.5 rounded">
                                                                                    <div className="text-[10px] text-white/80">{t('SĐT', 'Leads')}</div>
                                                                                    <div className="font-bold text-white">23</div>
                                                                                </div>
                                                                                <div className="bg-white/10 p-1.5 rounded">
                                                                                    <div className="text-[10px] text-white/80">ROI</div>
                                                                                    <div className="font-bold text-green-300">2.8x</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : msg.type === 'image' ? (
                                                                        <div className="space-y-2 text-left">
                                                                            <div className="flex items-center gap-1.5 text-white/70 mb-1 border-b border-white/10 pb-1.5">
                                                                                <Paperclip className="w-3 h-3" />
                                                                                <span className="text-[10px] italic font-medium">{t('Đã đính kèm ảnh', 'Image attached')}</span>
                                                                            </div>
                                                                            {msg.text && (
                                                                                <p className="whitespace-pre-wrap text-[11px] leading-relaxed opacity-90 line-clamp-4">
                                                                                    {msg.text}
                                                                                </p>
                                                                            )}

                                                                        </div>
                                                                    ) : msg.type === 'confirmation_card' ? (
                                                                        <div className="flex flex-col">
                                                                            <div className="bg-gray-50/50 p-2 border-b border-gray-100 flex items-center gap-2">
                                                                                <div className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                                                                                    <div className="w-2 h-2 rounded-full bg-gray-800 opacity-20"></div>
                                                                                </div>
                                                                                <span className="font-bold text-gray-800 text-[11px]">{t('Xác nhận thông tin chiến dịch', 'Confirm Campaign Info')}</span>
                                                                            </div>
                                                                            <div className="p-2 space-y-1.5">
                                                                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded border border-gray-100">
                                                                                    <span className="text-gray-400 text-[10px]">ℹ</span>
                                                                                    <span className="font-medium text-gray-700 truncate text-[11px]">{translateChatText(msg.data.info, language)}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded border border-blue-100">
                                                                                    <span className="text-blue-500 text-[10px]">📍</span>
                                                                                    <span className="font-medium text-blue-700 truncate text-[11px]">{translateChatText(msg.data.location, language)}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 bg-green-50/50 p-1.5 rounded border border-green-100">
                                                                                    <span className="text-green-500 text-[10px]">🇫</span>
                                                                                    <span className="font-medium text-green-700 truncate text-[11px]">{translateChatText(msg.data.post, language)}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 bg-pink-50/50 p-1.5 rounded border border-pink-100">
                                                                                    <span className="text-pink-500 text-[10px]">🎯</span>
                                                                                    <span className="font-medium text-pink-700 truncate text-[11px]">{translateChatText(msg.data.interest, language)}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-2 pt-0 grid grid-cols-2 gap-2">
                                                                                <button className="bg-gray-900 text-white py-1.5 rounded-md font-bold text-[11px] hover:bg-black transition-colors">
                                                                                    {t('Xác nhận', 'Confirm')}
                                                                                </button>
                                                                                <button className="bg-white border text-gray-600 py-1.5 rounded-md font-bold text-[11px] hover:bg-gray-50 transition-colors">
                                                                                    {t('Hủy', 'Cancel')}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : msg.type === 'accordion_card' ? (
                                                                        <AccordionCard data={msg.data} />
                                                                    ) : msg.type === 'option_card' ? (
                                                                        <OptionSelectionCard data={msg.data} />
                                                                    ) : msg.type === 'input_card' ? (
                                                                        <InputSimulationCard data={msg.data} />
                                                                    ) : msg.type === 'template_form_card' ? (
                                                                        <TemplateFormCard data={msg.data} />
                                                                    ) : msg.type === 'rule_form_card' ? (
                                                                        <RuleFormCard data={msg.data} />
                                                                    ) : msg.type === 'campaign_list_card' ? (
                                                                        <CampaignListCard data={msg.data} />
                                                                    ) : (
                                                                        translateChatText(msg.text, language)
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>

                                                {/* Typing Indicator */}
                                                {isTyping && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="flex justify-start"
                                                    >
                                                        <div className="bg-gray-100 p-2.5 rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm flex gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* Bottom spacer removed to rely on strict hiding of top content */}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Simulated Pointer Component
const SimulatedPointer = ({ targetRef, onComplete }: { targetRef: React.RefObject<HTMLDivElement>, onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 20, y: 50 }}
            animate={{
                opacity: [0, 1, 1, 1, 0],
                scale: [0.5, 1, 0.8, 1, 0.5], // Scale down = click
                x: [20, 0, 0, 0, 20],
                y: [50, 0, 0, 0, 50]
            }}
            transition={{
                duration: 2.5,
                times: [0, 0.2, 0.4, 0.6, 1],
                delay: 1
            }}
            onAnimationComplete={onComplete}
            className="absolute z-50 pointer-events-none drop-shadow-xl"
            style={{
                top: targetRef.current?.offsetTop ? targetRef.current.offsetTop + 15 : '20%',
                left: '50%'
            }}
        >
            <Hand className="w-8 h-8 fill-white text-black stroke-[1.5]" />
            <div className="absolute top-8 left-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap">
                Bấm để xem
            </div>
        </motion.div>
    );
};

// Separate component for Accordion Card to manage state
function AccordionCard({ data }: { data: any }) {
    const { t, language } = useLanguage();
    const [expandedSection, setExpandedSection] = React.useState<string | null>(null);
    const [showPointer, setShowPointer] = React.useState(false);

    // Helper to translate accordion labels
    const labelTranslations: Record<string, string> = {
        'Media': 'Media',
        'Ảnh đã upload': 'Image uploaded',
        'Ảnh đã upload thành công': 'Image uploaded successfully',
        'Thông tin': 'Info',
        'Tên chiến dịch': 'Campaign name',
        'Ngân sách': 'Budget',
        'Độ tuổi': 'Age range',
        'Giới tính': 'Gender',
        'Thời gian': 'Duration',
        'Lịch chạy': 'Schedule',
        'Nữ': 'Female',
        'Vị trí': 'Location',
        'Việt Nam (toàn quốc)': 'Vietnam (nationwide)',
        'Nội dung': 'Content',
        'Tin nhắn': 'Messages',
        'Có lời chào & 3 câu hỏi': 'Greeting & 3 questions',
        'Chi tiết': 'Details',
        'Lời chào tự động': 'Auto greeting',
        'Câu hỏi gợi ý': 'Suggested questions',
    };

    const translateLabel = (text: string): string => {
        if (language !== 'en' || !text) return text;
        // Try direct match
        if (labelTranslations[text]) return labelTranslations[text];
        // Try partial replacements
        let result = text;
        for (const [vi, en] of Object.entries(labelTranslations)) {
            if (result.includes(vi)) {
                result = result.replace(vi, en);
            }
        }
        return result;
    };

    // Refs for targeting tutorial
    const mediaRef = React.useRef<HTMLDivElement>(null);
    const infoRef = React.useRef<HTMLDivElement>(null);
    const [tutorialStep, setTutorialStep] = React.useState<'idle' | 'pointing_info'>('idle');

    React.useEffect(() => {
        // Loop the tutorial: If idle, wait 3s then show pointer
        let timer: NodeJS.Timeout;
        if (tutorialStep === 'idle') {
            timer = setTimeout(() => {
                setShowPointer(true);
                setTutorialStep('pointing_info');
            }, 3000); // Wait 3s before showing again
        }
        return () => clearTimeout(timer);
    }, [tutorialStep]);

    const toggleSection = (section: string) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    return (
        <div className="flex flex-col relative">
            <div className="bg-gray-50/50 p-2 border-b border-gray-100 flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-800 opacity-20"></div>
                </div>
                <span className="font-bold text-gray-800 text-[11px]">{t('Xác nhận thông tin chiến dịch', 'Confirm Campaign Info')}</span>
            </div>

            {/* Tutorial Pointer */}
            {showPointer && tutorialStep === 'pointing_info' && (
                <motion.div
                    initial={{ opacity: 0, x: 50, y: 50 }}
                    animate={{
                        opacity: [0, 1, 1, 1, 0],
                        // No click (scale), just move and hover/point
                        x: [20, 0, 0, 0, 20],
                        y: [20, 0, 0, 0, 20],
                    }}
                    transition={{
                        duration: 3, // Slower, more deliberate pointing
                        times: [0, 0.2, 0.5, 0.8, 1],
                        ease: "easeInOut"
                    }}
                    onAnimationComplete={() => {
                        // Just finish, do not auto-expand
                        setShowPointer(false);
                        setTutorialStep('idle');
                    }}
                    className="absolute z-50 pointer-events-none"
                    style={{
                        top: '60px', // Adjusted to point at Info section (trị nám 99k)
                        left: '60%'   // Approximate horizontal center-right
                    }}
                >
                    <div className="relative">
                        <Hand className="w-10 h-10 fill-white text-gray-900 stroke-[1.5] drop-shadow-xl" />
                        <div className="absolute -bottom-8 -left-4 bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shadow-sm backdrop-blur-sm border border-white/20">
                            {t('Bấm vào đây để xem', 'Click to expand')}
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="p-3 space-y-2">
                {/* Media Section */}
                <div
                    ref={mediaRef}
                    className={cn(
                        "bg-green-50/50 rounded border border-green-100 cursor-pointer transition-all duration-300",
                        expandedSection === 'media' ? "p-2" : "p-1.5 flex items-center justify-between"
                    )}
                    onClick={() => toggleSection('media')}
                >
                    {expandedSection === 'media' ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-green-500 text-[10px]"><CheckCircle2 className="w-3 h-3" /></span>
                                <span className="font-medium text-green-700 text-[11px]">{translateLabel('Media')}: {translateLabel(data.media.label.split(': ')[1])}</span>
                                <ChevronDown className="w-3 h-3 text-green-400 ml-auto" />
                            </div>
                            <div className="flex items-center gap-2 pl-1">
                                <img src="/placeholder_spa_image.jpg" className="w-8 h-8 rounded object-cover border border-green-200" alt="uploaded" />
                                <span className="text-[10px] text-green-600 font-medium">{translateLabel(data.media.status)}</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-green-500 text-[10px]"><CheckCircle2 className="w-3 h-3" /></span>
                                <span className="font-medium text-green-700 truncate text-[11px]">{translateLabel(data.media.label)}</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-green-400" />
                        </>
                    )}
                </div>

                {/* Info Section */}
                <div
                    className={cn(
                        "bg-gray-50 rounded border border-gray-100 cursor-pointer transition-all duration-300",
                        expandedSection === 'info' ? "p-2" : "p-1.5 flex items-center justify-between"
                    )}
                    onClick={() => toggleSection('info')}
                >
                    {expandedSection === 'info' ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-gray-400 text-[10px]">ℹ</span>
                                <span className="font-medium text-gray-700 text-[11px]">{data.info.label.split(': ')[1]}</span>
                                <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
                            </div>
                            <div className="bg-white rounded p-2 border border-black/80 space-y-1 shadow-sm" style={{ backgroundColor: '#0f172a' }}>
                                {data.info.details.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-[10px]">
                                        <span className="text-gray-400 font-medium">{translateLabel(item.label)}:</span>
                                        <span className="text-white font-bold">{translateLabel(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-[10px]">ℹ</span>
                                <span className="font-medium text-gray-700 truncate text-[11px]">{data.info.label.split(': ')[1]}</span> {/* Show only value part */}
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        </>
                    )}
                </div>

                {/* Location - Simple */}
                <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded border border-blue-100">
                    <span className="text-blue-500 text-[10px]">📍</span>
                    <span className="font-medium text-blue-700 truncate text-[11px]">{translateLabel(data.location.value)}</span>
                    <ChevronRight className="w-3 h-3 text-blue-400 ml-auto opacity-50" />
                </div>

                {/* Content Section */}
                <div
                    className={cn(
                        "bg-green-50/30 rounded border border-green-100 cursor-pointer transition-all duration-300",
                        expandedSection === 'content' ? "p-2" : "p-1.5 flex items-center justify-between"
                    )}
                    onClick={() => toggleSection('content')}
                >
                    {expandedSection === 'content' ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-green-600 text-[10px]">💬</span>
                                <span className="font-medium text-green-800 text-[11px]">{translateLabel('Nội dung')}: {data.content.title.substring(0, 15)}...</span>
                                <ChevronDown className="w-3 h-3 text-green-400 ml-auto" />
                            </div>
                            <div className="bg-green-50 p-2 rounded border border-green-100/50 text-[10px] text-green-900 leading-snug">
                                <p className="font-bold mb-1">{data.content.title}</p>
                                <p className="whitespace-pre-line">{data.content.text}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-green-600 text-[10px]">💬</span>
                                <span className="font-medium text-green-800 truncate text-[11px]">{translateLabel(data.content.label)}</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-green-400" />
                        </>
                    )}
                </div>

                {/* Messaging Section */}
                <div
                    className={cn(
                        "bg-orange-50/30 rounded border border-orange-100 cursor-pointer transition-all duration-300",
                        expandedSection === 'messaging' ? "p-2" : "p-1.5 flex items-center justify-between"
                    )}
                    onClick={() => toggleSection('messaging')}
                >
                    {expandedSection === 'messaging' ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-orange-500 text-[10px]">✨</span>
                                <span className="font-medium text-orange-700 text-[11px]">{t('Tin nhắn', 'Messages')}: {t('Chi tiết', 'Details')}</span>
                                <ChevronDown className="w-3 h-3 text-orange-400 ml-auto" />
                            </div>
                            <div className="bg-orange-50 p-2 rounded border border-orange-100/50 text-[10px] text-orange-900 leading-snug">
                                <p className="font-bold text-[9px] uppercase text-orange-800 mb-1">{t('Lời chào tự động', 'Auto greeting')}:</p>
                                <p className="italic mb-2">"{data.messaging.greeting}"</p>
                                <p className="font-bold text-[9px] uppercase text-orange-800 mb-1">{t('Câu hỏi gợi ý', 'Suggested questions')} ({data.messaging.questions.length}):</p>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    {data.messaging.questions.map((q: string, idx: number) => (
                                        <li key={idx}>{q}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-orange-500 text-[10px]">✨</span>
                                <span className="font-medium text-orange-700 truncate text-[11px]">{translateLabel(data.messaging.label)}</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-orange-400" />
                        </>
                    )}
                </div>
            </div>

            <div className="p-2 pt-0 grid grid-cols-2 gap-2">
                <button
                    className="bg-gray-900 text-white py-1.5 rounded-md font-bold text-[11px] hover:bg-black transition-colors"
                >
                    {t('Xác nhẫn & Tạo', 'Confirm & Create')}
                </button>
                <button className="bg-white border text-gray-600 py-1.5 rounded-md font-bold text-[11px] hover:bg-gray-50 transition-colors">
                    {t('Hủy', 'Cancel')}
                </button>
            </div>
        </div>
    );
}


// Option Selection Card Component (Horizontal Scroll)
function OptionSelectionCard({ data }: { data: any }) {
    const { language } = useLanguage();
    return (
        <div className="flex flex-row gap-1.5 overflow-x-auto no-scrollbar pb-1 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {data.options.map((opt: any, idx: number) => (
                <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 whitespace-nowrap shrink-0 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                    {translateChatText(opt.label, language)}
                </Button>
            ))}
        </div>
    );
}

// Simulated Input Field Component
function InputSimulationCard({ data }: { data: any }) {
    const { t, language } = useLanguage();
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="text-[10px] text-gray-500">{translateChatText(data.label, language)}</div>
            <textarea
                className="w-full h-24 p-2 border rounded-md bg-white text-xs text-gray-800 font-mono resize-none border-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-500"
                placeholder={translateChatText(data.placeholder, language)}
                defaultValue={data.defaultValue || ""}
                readOnly
            />
            <Button
                size="sm"
                className="w-full h-7 text-[10px] font-medium bg-gray-900 text-white hover:bg-black mt-1"
            >
                {t('✅ Trích xuất & Xác nhận', '✅ Extract & Confirm')}
            </Button>
        </div>
    );
}

// Template Form Card Component (mimics TemplateCreatorCard)
function TemplateFormCard({ data }: { data: any }) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 text-white px-3 py-2 flex items-center justify-between">
                <span className="font-bold text-[11px]">{t('Tạo mẫu mục tiêu mới', 'Create New Targeting Template')}</span>
                <span className="text-gray-400 text-[10px]">×</span>
            </div>

            {/* Form Content */}
            <div className="p-3 space-y-2">
                {/* Row 1: Keyword + Campaign Name */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Từ khóa kích hoạt *', 'Trigger Keyword *')}</label>
                        <input
                            type="text"
                            value={data.keyword || "@#spa, khoá ads..."}
                            readOnly
                            className="w-full text-[10px] border border-pink-400 rounded px-2 py-1 bg-pink-50 text-gray-800"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Tên chiến dịch', 'Campaign Name')}</label>
                        <input
                            type="text"
                            value={data.campaignName || t("Quảng cáo FB...", "FB Ads...")}
                            readOnly
                            className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-500"
                        />
                    </div>
                </div>

                {/* Row 2: Age + Gender */}
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Tuổi từ *', 'Age From *')}</label>
                        <input type="text" value={data.ageMin || "18"} readOnly className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800" />
                    </div>
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Đến', 'To')}</label>
                        <input type="text" value={data.ageMax || "65"} readOnly className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800" />
                    </div>
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Giới tính *', 'Gender *')}</label>
                        <select className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800" disabled>
                            <option>{t(data.gender || "Tất cả", data.gender === "Tất cả" ? "All" : data.gender || "All")}</option>
                        </select>
                    </div>
                </div>

                {/* Row 3: Budget */}
                <div>
                    <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Ngân sách/ngày *', 'Daily Budget *')}</label>
                    <input type="text" value={data.budget || "200.000"} readOnly className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800" />
                </div>

                {/* Row 4: Location */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Loại vị trí', 'Location Type')}</label>
                        <select className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800" disabled>
                            <option>{t(data.locationType || "Quốc gia", data.locationType === "Quốc gia" ? "Country" : data.locationType || "Country")}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Tên quốc gia', 'Country Name')}</label>
                        <input type="text" value={t(data.locationName || "Việt Nam", data.locationName === "Việt Nam" ? "Vietnam" : data.locationName || "Vietnam")} readOnly className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800" />
                    </div>
                </div>

                {/* Row 5: Interests */}
                <div>
                    <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Sở thích (cách nhau bằng dấu phẩy)', 'Interests (comma separated)')}</label>
                    <input type="text" value={data.interests || t("làm đẹp, spa, thẩm mỹ viện...", "beauty, spa, clinic...")} readOnly className="w-full text-[10px] border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-500 italic" />
                </div>

                {/* Row 6: Headlines + Greeting */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Tiêu đề (mỗi dòng 1) *', 'Headlines (1 per line) *')}</label>
                        <textarea
                            value={data.headlines || t("Tiêu đề 1\nTiêu đề 2", "Headline 1\nHeadline 2")}
                            readOnly
                            className="w-full h-10 text-[9px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800 resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Mẫu câu chào *', 'Greeting Template *')}</label>
                        <textarea
                            value={data.greeting || t("Chào bạn!\nXin chào!", "Hello!\nHi there!")}
                            readOnly
                            className="w-full h-10 text-[9px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-800 resize-none"
                        />
                    </div>
                </div>

                {/* Row 7: FAQ */}
                <div>
                    <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Câu hỏi thường gặp (tối đa 3 câu)', 'FAQ (max 3 questions)')}</label>
                    <textarea
                        value={data.questions || t("Giá bao nhiêu ạ?\nCó khuyến mãi không?\nLàm có đau không?", "How much is it?\nAny promotions?\nDoes it hurt?")}
                        readOnly
                        className="w-full h-12 text-[9px] border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-500 italic resize-none"
                    />
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="grid grid-cols-2 gap-2 p-3 pt-0">
                <button className="bg-white border border-gray-300 text-gray-600 py-1.5 rounded-md font-medium text-[10px] hover:bg-gray-50">
                    {t('Hủy', 'Cancel')}
                </button>
                <button className="bg-gray-900 text-white py-1.5 rounded-md font-bold text-[10px] hover:bg-black">
                    {t('Tạo mẫu', 'Create Template')}
                </button>
            </div>
        </div>
    );
}

// Rule Form Card Component (mimics AutomatedRulesDialog)
function RuleFormCard({ data }: { data: any }) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 text-white px-3 py-2 flex items-center justify-between">
                <span className="font-bold text-[11px]">{t('Tạo quy tắc mới', 'Create New Rule')}</span>
                <span className="text-gray-400 text-[10px]">×</span>
            </div>

            {/* Form Content */}
            <div className="p-3 space-y-2">
                {/* Rule Name */}
                <div>
                    <label className="text-[9px] text-gray-500 font-medium block mb-0.5">{t('Tên quy tắc *', 'Rule Name *')}</label>
                    <input
                        type="text"
                        value={data.ruleName || t("Quy tắc mới", "New Rule")}
                        readOnly
                        className="w-full text-[10px] border border-purple-400 rounded px-2 py-1 bg-purple-50 text-gray-800"
                    />
                </div>

                {/* Trigger Section */}
                <div className="border border-blue-200 rounded p-2 bg-blue-50/30">
                    <div className="text-[9px] font-medium text-blue-700 mb-1.5">{t('📊 KHI (Trigger)', '📊 WHEN (Trigger)')}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                        <div>
                            <label className="text-[8px] text-gray-500 block mb-0.5">{t('Chỉ số', 'Metric')}</label>
                            <select className="w-full text-[9px] border border-gray-200 rounded px-1.5 py-0.5 bg-white" disabled>
                                <option>{t(data.triggerMetric || "Chi tiêu", data.triggerMetric === "Chi tiêu" ? "Spend" : data.triggerMetric || "Spend")}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] text-gray-500 block mb-0.5">{t('Điều kiện', 'Condition')}</label>
                            <select className="w-full text-[9px] border border-gray-200 rounded px-1.5 py-0.5 bg-white" disabled>
                                <option>{data.condition || ">"}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] text-gray-500 block mb-0.5">{t('Ngưỡng', 'Threshold')}</label>
                            <input
                                type="text"
                                value={data.threshold || "500.000"}
                                readOnly
                                className="w-full text-[9px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="border border-green-200 rounded p-2 bg-green-50/30">
                    <div className="text-[9px] font-medium text-green-700 mb-1.5">{t('⚡ THÌ (Action)', '⚡ THEN (Action)')}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                        <div>
                            <label className="text-[8px] text-gray-500 block mb-0.5">{t('Hành động', 'Action')}</label>
                            <select className="w-full text-[9px] border border-gray-200 rounded px-1.5 py-0.5 bg-white" disabled>
                                <option>{t(data.action || "Tắt chiến dịch", data.action === "Tắt chiến dịch" ? "Pause campaign" : data.action || "Pause campaign")}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] text-gray-500 block mb-0.5">{t('Gắn nhãn', 'Add Label')}</label>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span className="text-[9px] text-gray-700">{t(data.targetLabel || "Camp xấu", data.targetLabel === "Camp xấu" ? "Bad Camp" : data.targetLabel || "Bad Camp")}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="text-[9px] text-gray-600">
                        <span className="font-medium">{t('Tóm tắt:', 'Summary:')}</span> {t('Khi', 'When')} <span className="text-blue-600 font-medium">{t(data.triggerMetric || "Chi tiêu", data.triggerMetric === "Chi tiêu" ? "Spend" : data.triggerMetric || "Spend")}</span> {data.condition || ">"} <span className="font-medium">{data.threshold || "500.000"}đ</span> → <span className="text-green-600 font-medium">{t(data.action || "Tắt chiến dịch", data.action === "Tắt chiến dịch" ? "Pause campaign" : data.action || "Pause campaign")}</span>
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="grid grid-cols-2 gap-2 p-3 pt-0">
                <button className="bg-white border border-gray-300 text-gray-600 py-1.5 rounded-md font-medium text-[10px] hover:bg-gray-50">
                    {t('Hủy', 'Cancel')}
                </button>
                <button className="bg-gray-900 text-white py-1.5 rounded-md font-bold text-[10px] hover:bg-black">
                    {t('Tạo quy tắc', 'Create Rule')}
                </button>
            </div>
        </div>
    );
}


// Campaign List Card Component (for pause/resume feature)
function CampaignListCard({ data }: { data: any }) {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = React.useState(0);
    const [toggleStates, setToggleStates] = React.useState<boolean[]>(
        data.campaigns?.map((c: any) => c.isOn) || []
    );
    const [showHandPointer, setShowHandPointer] = React.useState(false);
    const [handAnimationComplete, setHandAnimationComplete] = React.useState(false);

    // Find target campaign index
    const targetIndex = data.campaigns?.findIndex((c: any) => c.name === data.targetCampaign) ?? -1;

    // Auto animate: show hand pointer after 2s, then toggle off after click animation
    React.useEffect(() => {
        const showHandTimer = setTimeout(() => {
            setShowHandPointer(true);
        }, 2000);

        const toggleTimer = setTimeout(() => {
            if (targetIndex >= 0) {
                setToggleStates(prev => {
                    const newStates = [...prev];
                    newStates[targetIndex] = false;
                    return newStates;
                });
                setHandAnimationComplete(true);
            }
        }, 4500);

        return () => {
            clearTimeout(showHandTimer);
            clearTimeout(toggleTimer);
        };
    }, [targetIndex]);

    const handleToggle = (index: number) => {
        setToggleStates(prev => {
            const newStates = [...prev];
            newStates[index] = !newStates[index];
            return newStates;
        });
    };

    return (
        <div className="flex flex-col w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                {data.tabs?.map((tab: string, idx: number) => {
                    // Translate tab names
                    const translatedTab = language === 'en' ? tab
                        .replace('Chiến dịch', 'Campaigns')
                        .replace('Nhóm QC', 'Ad Groups')
                        .replace('Quảng cáo', 'Ads') : tab;
                    return (
                        <button
                            key={idx}
                            className={cn(
                                "flex-1 px-2 py-1.5 text-[9px] font-medium transition-colors",
                                activeTab === idx
                                    ? "text-gray-900 bg-white border-b-2 border-[#e91e63]"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                            onClick={() => setActiveTab(idx)}
                        >
                            {translatedTab}
                        </button>
                    );
                })}
            </div>

            {/* Campaign List */}
            <div className="max-h-[200px] overflow-y-auto">
                {data.campaigns?.map((campaign: any, idx: number) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex items-center justify-between px-2 py-1.5 border-b border-gray-100 last:border-b-0 transition-colors relative",
                            idx === targetIndex && !toggleStates[idx] ? "bg-red-50" : "hover:bg-gray-50"
                        )}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-gray-900 truncate">{campaign.name}</div>
                            <div className={cn(
                                "text-[8px]",
                                toggleStates[idx] ? "text-green-600" : "text-gray-400"
                            )}>
                                {toggleStates[idx] ? t("Chạy", "Active") : t("Dừng", "Paused")}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-center">
                                <div className="text-[8px] text-gray-400">{t('Chi tiêu', 'Spend')}</div>
                                <div className="text-[9px] font-medium text-gray-700">{campaign.spend}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[8px] text-gray-400">{t('Kết quả', 'Results')}</div>
                                <div className="text-[9px] font-medium text-gray-700">{campaign.result}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[8px] text-gray-400">CPR</div>
                                <div className="text-[9px] font-medium text-gray-700">{campaign.cpr}</div>
                            </div>
                            {/* Toggle Switch with Hand Pointer */}
                            <div className="relative">
                                <button
                                    onClick={() => handleToggle(idx)}
                                    className={cn(
                                        "relative w-8 h-4 rounded-full transition-colors duration-300",
                                        toggleStates[idx] ? "bg-green-500" : "bg-gray-300"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-300",
                                        toggleStates[idx] ? "translate-x-4" : "translate-x-0.5"
                                    )} />
                                </button>

                                {/* Hand Pointer Animation */}
                                {idx === targetIndex && showHandPointer && !handAnimationComplete && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20, y: 20 }}
                                        animate={{
                                            opacity: [0, 1, 1, 1, 0],
                                            x: [20, 0, 0, -2, 0],
                                            y: [20, 0, 0, 0, 0],
                                            scale: [1, 1, 0.9, 1, 0.8],
                                        }}
                                        transition={{
                                            duration: 2.5,
                                            times: [0, 0.2, 0.6, 0.8, 1],
                                            ease: "easeInOut"
                                        }}
                                        className="absolute -right-2 top-4 z-50 pointer-events-none"
                                    >
                                        <Hand className="w-6 h-6 fill-white text-gray-900 stroke-[1.5] drop-shadow-lg" />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

