
import React from 'react';
import { Settings } from 'lucide-react';

export const automationRuleFlow = {
    title: 'Tạo quy tắc tự động',
    description: 'Tự động tắt/bật chiến dịch, gắn nhãn, gửi thông báo dựa trên điều kiện.',
    tag: 'Automation',
    buttonText: 'Tạo quy tắc',
    icon: <Settings className="w-6 h-6" />,
    chat: [
        { type: 'user', text: 'Tạo quy tắc' },
        {
            type: 'ai',
            text: '📝 Bạn muốn tạo quy tắc theo cách nào?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '📋 Cơ bản (Form)' },
                    { label: '🚀 Nâng cao (AI)' }
                ]
            }
        },
        { type: 'user', text: 'Cơ bản' },
        {
            type: 'ai',
            text: '📝 Đang mở form tạo quy tắc...'
        },
        {
            type: 'rule_form_card',
            data: {
                ruleName: 'Tắt camp tiêu nhiều',
                triggerMetric: 'Chi tiêu (Spend)',
                condition: 'Lớn hơn',
                threshold: '500.000',
                action: 'Tắt chiến dịch',
                targetLabel: 'Camp xấu'
            }
        },
        { type: 'user', text: 'Tạo quy tắc' },
        {
            type: 'ai',
            text: '⏳ Đang tạo quy tắc...'
        },
        {
            type: 'ai',
            text: '✅ **Đã tạo quy tắc thành công!**\n\n📋 Tên: Tắt camp tiêu nhiều\n📊 Khi: Chi tiêu > 500.000đ\n⚡ Thì: Tắt chiến dịch\n🏷️ Gắn nhãn: Camp xấu\n\n💡 Quy tắc sẽ được kiểm tra mỗi 15 phút!'
        }
    ]
};
