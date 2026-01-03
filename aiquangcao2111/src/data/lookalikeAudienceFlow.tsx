
import React from 'react';
import { Target } from 'lucide-react';

export const lookalikeAudienceFlow = {
    title: 'Tạo tệp tương tự và quảng cáo tệp',
    description: 'Tạo tệp Lookalike từ tệp nguồn có sẵn và chạy quảng cáo ngay.',
    tag: 'Data-Driven',
    buttonText: 'Tạo Lookalike',
    icon: <Target className="w-6 h-6" />,
    chat: [
        { type: 'user', text: 'Tạo tệp đối tượng' },
        { type: 'ai', text: 'Anh muốn tạo loại đối tượng nào ạ?' },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '📞 SĐT' },
                    { label: '💬 Messenger' },
                    { label: '🎯 Lookalike' }
                ]
            }
        },
        { type: 'user', text: 'Lookalike' },
        { type: 'ai', text: '📋 Đang tải danh sách tệp nguồn...' },
        {
            type: 'ai',
            text: 'Anh muốn tạo Lookalike từ tệp nào ạ?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '📱 Phone_List_28_12 (50 người)' },
                    { label: '💬 Messenger_30d (1,200 người)' },
                    { label: '📄 Fanpage_Engagement (5,000 người)' }
                ]
            }
        },
        { type: 'user', text: 'Messenger_30d' },
        {
            type: 'ai',
            text: '📝 Đã chọn nguồn: **Messenger_30d**\n\nAnh muốn tạo lookalike ở quốc gia nào?\n(VN, US, TH, SG, MY) ạ'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '🇻🇳 Việt Nam' },
                    { label: '🇺🇸 United States' },
                    { label: '🇹🇭 Thailand' },
                    { label: '🇸🇬 Singapore' }
                ]
            }
        },
        { type: 'user', text: 'Việt Nam' },
        {
            type: 'ai',
            text: 'Anh muốn quy mô lookalike là bao nhiêu %? (từ 1% đến 20%) ạ'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '1%' },
                    { label: '2%' },
                    { label: '3%' },
                    { label: '5%' },
                    { label: '10%' }
                ]
            }
        },
        { type: 'user', text: '3%' },
        {
            type: 'ai',
            text: '✅ Đã đủ thông tin!\n\n📋 Tên: Lookalike của Messenger_30d\n🎯 Nguồn: Messenger_30d (1,200 người)\n🌍 Quốc gia: Việt Nam\n📊 Tỷ lệ: 3%\n\nAnh xác nhận tạo không?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '✅ Xác nhận tạo' },
                    { label: '❌ Hủy' }
                ]
            }
        },
        { type: 'user', text: 'Xác nhận tạo' },
        {
            type: 'ai',
            text: '⏳ Đang tạo Tệp tương tự...'
        },
        {
            type: 'ai',
            text: '✅ Tệp đối tượng **"Lookalike của Messenger_30d"** đã được tạo thành công!'
        },
        {
            type: 'ai',
            text: 'Anh có muốn chạy quảng cáo với tệp này ngay không?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '🚀 Chạy QC ngay' },
                    { label: '❌ Đóng' }
                ]
            }
        },
        { type: 'user', text: 'Chạy QC ngay' },
        {
            type: 'ai',
            text: '🚀 Đã chọn tệp **Lookalike của Messenger_30d**!\n\nVui lòng nhập thông tin chiến dịch:\n- Link bài viết\n- Ngân sách (VD: 500k/ngày hoặc 2 triệu từ 25/12 đến 31/12)\n- Targeting (tuổi, giới tính, vị trí...)'
        },
        { type: 'user', text: '@#Cayha\nhttps://www.facebook.com/reel/840326882321' },
        {
            type: 'ai',
            text: '🔍 Đang phân tích bài viết để tạo quảng cáo...'
        },
        {
            type: 'ai',
            text: '✅ Đã lấy thông tin bài viết thành công.\nVui lòng kiểm tra lại thông tin bên dưới.'
        },
        {
            type: 'confirmation_card',
            data: {
                info: '200.000đ/ngày',
                location: 'Chưa xác định vị trí',
                post: 'ID 3069876025064...',
                interest: 'Lookalike của Messenger_30d'
            }
        },
        { type: 'user', text: 'Xác nhận & Tạo' },
        {
            type: 'ai',
            text: '⏳ Đang tạo chiến dịch với tệp đối tượng...'
        },
        {
            type: 'ai',
            text: '✅ Tạo thành công!\n\n📊 Campaign ID: 120216...\n🎯 Ad Set ID: 120216...\n📢 Ad ID: 120216...\n\nKiểm tra trong Facebook Ads Manager nhé!'
        }
    ]
};
