
import React from 'react';
import { Users } from 'lucide-react';

export const audienceCreationFlow = {
    title: 'Tạo tệp đối tượng và quảng cáo tệp',
    description: 'Tự động tạo tệp đối tượng từ SĐT/UID và mở rộng tệp Lookalike chuẩn xác.',
    tag: 'Data-Driven',
    buttonText: 'Tạo tệp',
    icon: <Users className="w-6 h-6" />,
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
        { type: 'user', text: 'Danh sách SĐT' },
        { type: 'ai', text: 'Anh muốn nhập SĐT bằng cách nào ạ?' },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '📁 Upload file CSV/TXT' },
                    { label: '⌨️ Nhập trực tiếp' }
                ]
            }
        },
        {
            type: 'user',
            text: 'Nhập trực tiếp'
        },
        {
            type: 'ai',
            text: 'Vui lòng dán danh sách số điện thoại vào ô bên dưới.'
        },
        {
            type: 'input_card',
            data: {
                label: '📋 Dán danh sách SĐT (mỗi số 1 dòng hoặc dấu phẩy)',
                placeholder: '0912345678\n0987654321\n0901234567\n\nHoặc: 0912345678, 0987654321, 0901234567',
                defaultValue: '0987654321\n0912345678\n0909090909\n0918123123\n0977888999\n0933444555\n0903222111\n0988777666\n0586131299'
            }
        },
        {
            type: 'ai',
            text: '✅ Đã trích xuất **10** số điện thoại (đã loại trùng)!\n\n📱 Mẫu: 0987654321\n\nAnh xác nhận tạo đối tượng không?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '✅ Xác nhận tạo' },
                    { label: '❌ Hủy bỏ' }
                ]
            }
        },
        { type: 'user', text: 'Xác nhận tạo' },
        {
            type: 'ai',
            text: '⏳ Đang tạo đối tượng...'
        },
        {
            type: 'ai',
            text: '✅ Tệp đối tượng **"add"** đã được tạo thành công!'
        },
        {
            type: 'ai',
            text: 'Anh muốn làm gì tiếp theo?'
        },
        {
            type: 'option_card',
            data: {
                options: [
                    { label: '🚀 Chạy quảng cáo tệp' },
                    { label: '🎯 Tạo Tệp tương tự' },
                    { label: '❌ Đóng' }
                ]
            }
        },
        { type: 'user', text: 'Tạo Tệp tương tự' },
        {
            type: 'ai',
            text: '📝 Đã chọn nguồn: **add**\n\nAnh muốn tạo lookalike ở quốc gia nào?\n(VN, US, TH, SG, MY) ạ'
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
        { type: 'user', text: '1%' },
        {
            type: 'ai',
            text: '✅ Đã đủ thông tin!\n\n📋 Tên: Tệp tương tự của add\n🎯 Nguồn: add\n🌍 Quốc gia: VN Việt Nam\n📊 Tỷ lệ: 1%\n\nAnh xác nhận tạo không?'
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
            text: '✅ Tệp đối tượng **"Tệp tương tự của add"** đã được tạo thành công!'
        },
        {
            type: 'ai',
            text: '✅ Đã tạo xong tệp tương tự!\nBạn có muốn chạy quảng cáo với cả 2 tệp này không?\n\n• add (Nguồn)\n• Tệp tương tự của add (Tương tự)'
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
            text: '🚀 Đã chọn tệp **add, Tệp tương tự của add**!\n\nVui lòng nhập thông tin chiến dịch:\n- Link bài viết\n- Ngân sách (VD: 500k/ngày hoặc 2 triệu từ 25/12 đến 31/12)\n- Targeting (tuổi, giới tính, vị trí...)'
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
                interest: '2 tệp được chọn'
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
