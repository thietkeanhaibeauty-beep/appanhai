
import React from 'react';
import { Target } from 'lucide-react';

export const targetingTemplateFlow = {
    title: 'Tạo mẫu nhắm mục tiêu',
    description: 'Tạo template targeting để sử dụng lại cho nhiều chiến dịch.',
    tag: 'Quy trình',
    buttonText: 'Tạo mẫu',
    icon: <Target className="w-6 h-6" />,
    chat: [
        { type: 'user', text: 'Tạo mẫu nhắm mục tiêu' },
        {
            type: 'ai',
            text: '📝 Vui lòng điền thông tin vào form bên dưới để tạo mẫu nhắm mục tiêu mới.'
        },
        {
            type: 'template_form_card',
            data: {
                keyword: '@#TriNam_HN',
                campaignName: 'Spa Hà Nội',
                ageMin: '25',
                ageMax: '45',
                gender: 'Nữ',
                budget: '200.000',
                locationType: 'Thành phố',
                locationName: 'Hà Nội',
                interests: 'Làm đẹp, Skincare, Spa',
                headlines: 'Ưu đãi 50% hôm nay!\nĐặt lịch ngay',
                greeting: 'Chào chị!\nEm có thể hỗ trợ gì ạ?',
                questions: 'Giá bao nhiêu ạ?\nCó khuyến mãi không?\nLàm có đau không?'
            }
        },
        {
            type: 'ai',
            text: '✅ Đã nhận thông tin!\n\n📋 **Xác nhận thông tin mẫu:**\n• Từ khóa: @#TriNam_HN\n• Đối tượng: Nữ, 25-45 tuổi\n• Vị trí: Hà Nội + 20km\n• Sở thích: Làm đẹp, Skincare, Spa\n• Ngân sách: 200.000đ/ngày\n\nBấm **Tạo mẫu** để hoàn tất hoặc **Hủy** để sửa lại.'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '✅ Tạo mẫu' },
                    { label: '❌ Hủy' }
                ]
            }
        },
        { type: 'user', text: 'Tạo mẫu' },
        {
            type: 'ai',
            text: '⏳ Đang tạo mẫu nhắm mục tiêu...'
        },
        {
            type: 'ai',
            text: '✅ **Tạo template thành công!**\n\n📋 Template: @#TriNam_HN\n👥 Nữ, 25-45 tuổi\n📍 Hà Nội + 20km\n🎯 Sở thích: Làm đẹp, Skincare, Spa\n💰 200.000đ/ngày\n\n💡 **Hướng dẫn sử dụng:**\nGõ **@#TriNam_HN + link bài viết** để chạy quảng cáo với template này!'
        }
    ]
};

