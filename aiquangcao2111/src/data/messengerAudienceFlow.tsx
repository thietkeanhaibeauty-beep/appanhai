
import React from 'react';
import { MessageSquare } from 'lucide-react';

export const messengerAudienceFlow = {
    title: 'Tạo tệp người nhắn tin và tệp tương tự',
    description: 'Tự động tạo tệp từ người đã nhắn tin Fanpage và mở rộng bằng Lookalike.',
    tag: 'Data-Driven',
    buttonText: 'Tạo tệp Messenger',
    icon: <MessageSquare className="w-6 h-6" />,
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
        { type: 'user', text: 'Messenger' },
        { type: 'ai', text: 'Anh muốn lấy người đã nhắn tin trong khoảng thời gian nào ạ?' },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '📅 7 ngày gần nhất' },
                    { label: '📅 30 ngày gần nhất' },
                    { label: '📅 90 ngày gần nhất' },
                    { label: '📅 365 ngày' }
                ]
            }
        },
        { type: 'user', text: '30 ngày gần nhất' },
        {
            type: 'ai',
            text: '⏳ Đang tạo tệp đối tượng từ Messenger...'
        },
        {
            type: 'ai',
            text: '✅ Tệp đối tượng **"Messenger_30d"** đã được tạo thành công!\n\n👥 Quy mô: ~1,200 người đã nhắn tin trong 30 ngày.'
        },
        {
            type: 'ai',
            text: 'Anh có muốn tạo thêm tệp **Lookalike (Tương tự)** từ tệp này không?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '🎯 Tạo Lookalike' },
                    { label: '🚀 Chạy QC ngay' },
                    { label: '❌ Đóng' }
                ]
            }
        },
        { type: 'user', text: 'Tạo Lookalike' },
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
                    { label: '🇹🇭 Thailand' }
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
                    { label: '5%' }
                ]
            }
        },
        { type: 'user', text: '2%' },
        {
            type: 'ai',
            text: '✅ Đã đủ thông tin!\n\n📋 Tên: Lookalike của Messenger_30d\n🎯 Nguồn: Messenger_30d\n🌍 Quốc gia: Việt Nam\n📊 Tỷ lệ: 2%\n\nAnh xác nhận tạo không?'
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
            text: '✅ Đã tạo xong tệp tương tự!\nBạn có muốn chạy quảng cáo với cả 2 tệp này không?\n\n• Messenger_30d (Nguồn)\n• Lookalike của Messenger_30d (Tương tự)'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '🚀 Chạy QC cả 2 tệp' },
                    { label: '❌ Đóng' }
                ]
            }
        },
        { type: 'user', text: 'Chạy QC cả 2 tệp' },
        {
            type: 'ai',
            text: '🚀 Đã chọn tệp **Messenger_30d, Lookalike của Messenger_30d**!\n\nVui lòng nhập thông tin chiến dịch:\n- Link bài viết\n- Ngân sách (VD: 500k/ngày hoặc 2 triệu từ 25/12 đến 31/12)\n- Targeting (tuổi, giới tính, vị trí...)'
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
                interest: '2 tệp Messenger được chọn'
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
