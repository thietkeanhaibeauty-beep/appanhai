
import React from 'react';
import { BarChart3, Sparkles, Zap, FileText, MessageSquare, Users, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { audienceCreationFlow } from './audienceCreationFlow';
import { messengerAudienceFlow } from './messengerAudienceFlow';
import { lookalikeAudienceFlow } from './lookalikeAudienceFlow';
import { targetingTemplateFlow } from './targetingTemplateFlow';
import { automationRuleFlow } from './automationRuleFlow';

// Sorted by title length: shortest first, longest last
export const productFeatures = [
    // 1. Quảng cáo Tin nhắn (18 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'Quảng cáo Tin nhắn',
        description: 'AI tạo kịch bản hỏi thoại: auto-reply: mục tiêu inbox/đặt lịch báo cáo theo cuộc hội thoại.',
        buttonText: 'Triển khai',
        buttonVariant: 'primary' as const,
        icon: <MessageSquare className="w-6 h-6" />,
        chat: [
            {
                type: 'image',
                text: '1: Tên chiến dịch: trị nám 99k\n2: Độ tuổi: 20 55t\n3: Giới tính: Nữ\nngân sách trọn đời: 2000k\ntừ 15/12 đến 15/1\n7h-11h, 14h-17h, 20h-22h\n5: Vị trí: Việt Nam',
                imageUrl: '/placeholder_spa_image.jpg'
            },
            { type: 'ai', text: '✨ Đang phân tích thông tin quảng cáo tin nhắn mới...' },
            { type: 'ai', text: '✅ Media hợp lệ! Đang upload lên Facebook...' },
            {
                type: 'accordion_card',
                data: {
                    media: {
                        label: 'Media: Ảnh đã upload',
                        status: 'Ảnh đã upload thành công'
                    },
                    info: {
                        label: 'Thông tin: trị nám 99k • 2tr trọn đời',
                        details: [
                            { label: 'Tên chiến dịch', value: 'trị nám 99k' },
                            { label: 'Ngân sách', value: '2.000.000đ trọn đời' },
                            { label: 'Độ tuổi', value: '20 - 55 tuổi' },
                            { label: 'Giới tính', value: 'Nữ' },
                            { label: 'Thời gian', value: '28/12/2025 - 15/1/2026' },
                            { label: 'Lịch chạy', value: '7h-11h, 14h-17h, 20h-22h' },
                        ]
                    },
                    location: {
                        label: 'Vị trí: vn Việt Nam (toàn quốc)',
                        value: 'vn Việt Nam (toàn quốc)'
                    },
                    content: {
                        label: 'Nội dung: marketing giúp bạn kiếm ...',
                        title: 'marketing giúp bạn kiếm nhiễu tiền.',
                        text: 'Tôi từng nghĩ chủ spa, tmv chỉ cần giỏi tay nghề là sẽ có khách.\nNhưng rồi tôi thấy nhiều cơ sở có dịch vụ rất tốt... mà vẫn đóng cửa sau 6 tháng.\nLý do? Họ không biết marketing.\nVà đây là lý do tôi bắt đầu nghiên cứu & ứng dụng AI marketing – để giúp spa nhỏ cũng có thể cạnh tranh công bằng.\n👉 Nếu bạn là chủ spa mới, đừng lặp lại sai lầm đó. Hãy học AI đi, đây là cơ hội của bạn'
                    },
                    messaging: {
                        label: 'Tin nhắn: Có lời chào & 3 câu hỏi',
                        greeting: 'Anh chào em, em cần tư vấn combo khóa học marketing?',
                        questions: [
                            'cho em dk học ạ',
                            'học có dễ không anh',
                            'có cam kết ra kết quả không'
                        ]
                    }
                }
            },
            { type: 'ai', text: '✅ Tạo thành công!\n\n📊 Campaign ID:\n120241672488510237\n🎯 Ad Set ID: 120241672488890237\n📢 Ad ID: 120241672489880237\n\nKiểm tra trong Facebook Ads Manager nhé!' },
        ],
    },
    // 2. Báo cáo ADS tự động (19 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'Báo cáo ADS tự động',
        description: 'Ghi chú chỉ số: kết quả tự nhận, chi phí/tin nhắn, tỉ lệ đặt lịch, SDT, tỉ lệ SDT, %MKT/Doanh thu. Lên lịch gửi báo cáo hàng ngày.',
        buttonText: 'Xem báo cáo',
        icon: <BarChart3 className="w-6 h-6" />,
        chat: [
            { type: 'user', text: 'Báo cáo hôm nay' },
            { type: 'report', text: '📊 Chi tiêu: 3.2tr\n🎯 Kết quả: 58\n📞 SĐT: 23\n💵 Doanh thu: 85tr\n📈 ROI: 26.5x' },
            { type: 'user', text: 'Báo cáo sale hôm nay' },
            { type: 'ai', text: '💰 Báo cáo Sale hôm nay:\n\n📞 Leads mới: 23\n✅ Đã liên hệ: 18\n📅 Đặt lịch: 12\n💵 Chốt đơn: 8\n🎯 Tỉ lệ chốt: 34.8%' },
            { type: 'user', text: 'Báo cáo tuần' },
            { type: 'ai', text: '📊 Báo cáo Tuần (23-29/12):\n\n💸 Chi tiêu: 22.4tr\n🎯 Kết quả: 412\n📞 SĐT: 156\n💵 Doanh thu: 580tr\n📈 ROI: 25.9x\n📉 CPR: 54.4k' },
            { type: 'user', text: 'Báo cáo tháng' },
            { type: 'ai', text: '📊 Báo cáo Tháng 12:\n\n💸 Chi tiêu: 89.6tr\n🎯 Kết quả: 1,648\n📞 SĐT: 624\n💵 Doanh thu: 2.32 tỷ\n📈 ROI: 25.9x\n📉 CPR: 54.4k' },
            { type: 'user', text: 'So với hôm qua?' },
            { type: 'ai', text: '📈 Tăng 15% chi tiêu\n🎯 Tăng 25% kết quả\n✅ CPR giảm 8%' },
        ],
    },
    // 3. Tạo quy tắc tự động (18 chars)
    automationRuleFlow,
    // 4. Nhắm mục tiêu tự động (20 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'Nhắm mục tiêu tự động',
        description: 'AI phân tích dịch vụ → gợi ý sở thích, độ tuổi, vị trí tối ưu cho ngành Spa/Clinic.',
        buttonText: 'Thiết lập',
        icon: <Zap className="w-6 h-6" />,
        chat: [
            { type: 'user', text: 'Gợi ý đối tượng cho Spa' },
            { type: 'ai', text: '🎯 Đề xuất targeting:\n\n👩 Nữ 25-45 tuổi\n📍 HCM, Hà Nội\n💄 Quan tâm: Làm đẹp, Skincare\n💰 Thu nhập: Trung bình+' },
        ],
    },
    // 5. Tạo mẫu nhắm mục tiêu (21 chars)
    targetingTemplateFlow,
    // 6. AI tạo quảng cáo 1-click (23 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'AI tạo quảng cáo 1-click',
        description: 'Chọn mục tiêu (Tin nhắn/Leads/Website/Mua hàng) → tự tạo Camp/AdSet/Ads đã kèm. Xuất bản trong một cú nhấp.',
        buttonText: 'Tạo chiến dịch',
        icon: <Sparkles className="w-6 h-6" />,
        chat: [
            { type: 'user', text: 'Tạo QC tin nhắn cho Spa' },
            { type: 'ai', text: 'Đang tạo chiến dịch...' },
            { type: 'ai', text: '✅ Đã tạo xong!\n📍 Camp: Spa Premium\n💰 Budget: 500k/ngày\n🎯 3 nhóm QC' },
            { type: 'ai', text: '🚀 Chiến dịch đang chạy!' },
        ],
    },
    // 7. Ngân sách tự tối ưu 24/7 (23 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'Ngân sách tự tối ưu 24/7',
        description: 'AI tăng khi hiệu quả, giảm khi đắt. Quy tắc theo giờ/ngày & hiệu suất: không cần nhân sự trực.',
        buttonText: 'Tạo rule',
        icon: <Zap className="w-6 h-6" />,
        chat: [
            { type: 'user', text: 'Tạo rule tối ưu ngân sách' },
            { type: 'ai', text: '⚡ Rule đã kích hoạt!\n\n📈 Tăng 20% khi CPR < 50k\n📉 Giảm 30% khi CPR > 100k\n⏰ Kiểm tra mỗi 30 phút' },
            { type: 'ai', text: '✅ Đã áp dụng cho 5 camps' },
        ],
    },
    // 8. Quảng cáo bài viết có sẵn (25 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'Quảng cáo bài viết có sẵn',
        description: 'Dán link bài viết (Reels/Post) → AI tự động trích xuất ID, nội dung & target đối tượng phù hợp.',
        buttonText: 'Tạo quảng cáo',
        icon: <Users className="w-6 h-6" />,
        chat: [
            { type: 'user', text: '@#Cay.ha\nhttps://www.facebook.com/reel/13531019863575924' },
            { type: 'ai', text: 'Em đang xử lý bài viết, anh đợi xử lý ạ.\n\n⏱ Vui lòng đợi 5-10 giây...' },
            {
                type: 'confirmation_card',
                data: {
                    info: 'Cayha • 200.000đ/ngày',
                    location: '21.029216, 105.8033...',
                    post: 'ID 306987602506460_1...',
                    interest: '2 sở thích được chọn'
                }
            },
            { type: 'ai', text: '✅ Tạo thành công!\n\n📊 Campaign ID:\n120241672488510237\n🎯 Ad Set ID: 120241672488890237\n📢 Ad ID: 120241672489880237\n\nKiểm tra trong Facebook Ads Manager nhé!' },
        ],
    },
    // 9. AI viết content chuẩn dịch vụ (28 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'AI viết content chuẩn dịch vụ',
        description: 'Nhập chủ đề → tạo ngay caption/headline/hình gợi ý theo đúng chuẩn đúng khách hàng mục tiêu.',
        buttonText: 'Sinh nội dung',
        icon: <FileText className="w-6 h-6" />,
        chat: [
            { type: 'user', text: 'Viết caption về triệt lông' },
            { type: 'ai', text: '✨ Caption đã tạo:\n\n"Da mịn như lụa, tự tin tỏa sáng! 💫\n\nTriệt lông vĩnh viễn công nghệ Diode Laser - An toàn, không đau, hiệu quả sau 1 liệu trình..."' },
        ],
    },
    // 10. Tạo tệp tương tự và quảng cáo tệp (32 chars)
    lookalikeAudienceFlow,
    // 11. Tạo tệp đối tượng và quảng cáo tệp (32 chars)
    audienceCreationFlow,
    // 12. Tạm dừng/chạy lại & tối ưu tự động (33 chars)
    {
        tag: 'SẢN PHẨM',
        title: 'Tạm dừng/chạy lại & tối ưu tự động',
        description: 'Xem tất cả chiến dịch, bật/tắt từng camp bằng toggle hoặc chat trực tiếp với AI.',
        buttonText: 'Thiết lập',
        icon: <Zap className="w-6 h-6" />,
        chat: [
            { type: 'user', text: 'Xem tất cả các chiến dịch' },
            {
                type: 'campaign_list_card',
                data: {
                    tabs: ['Chiến dịch (76)', 'Nhóm QC (0)', 'Quảng cáo (0)'],
                    campaigns: [
                        { name: 'Phun xăm 27/12', status: 'Chạy', isOn: true, spend: '1.2tr', result: 28, cpr: '42k' },
                        { name: 'tết 26/12', status: 'Chạy', isOn: true, spend: '850k', result: 15, cpr: '56k' },
                        { name: 'Gội DS 20/11', status: 'Dừng', isOn: false, spend: '2.1tr', result: 45, cpr: '46k' },
                        { name: 'nám 999k 10/11', status: 'Dừng', isOn: false, spend: '1.8tr', result: 32, cpr: '56k' },
                        { name: 'nám 26/10', status: 'Dừng', isOn: false, spend: '950k', result: 18, cpr: '52k' },
                    ],
                    targetCampaign: 'Phun xăm 27/12'
                }
            },
            { type: 'user', text: 'Tắt chiến dịch Phun xăm 27/12' },
            { type: 'ai', text: '⏸️ Đã tắt chiến dịch "Phun xăm 27/12" thành công!\n\n📊 Trạng thái: Đang chạy → Tắt\n⏱️ Thời gian: Ngay lập tức' },
        ],
    },
    // 13. Tạo tệp người nhắn tin và tệp tương tự (37 chars)
    messengerAudienceFlow,
];

