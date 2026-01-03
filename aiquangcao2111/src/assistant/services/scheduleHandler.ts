/**
 * scheduleHandler.ts - Handle SCHEDULE queries (lịch hẹn, dữ liệu sales)
 * 
 * Khác với REPORT (tổng hợp số liệu), SCHEDULE trả về:
 * - Số lượng records
 * - Danh sách ngắn gọn (khi user yêu cầu chi tiết)
 */

import { getSalesReports, SalesReport } from '@/services/nocodb/salesReportsService';

export interface ScheduleHandlerDeps {
    userId: string;
    addMessage: (role: 'user' | 'assistant', content: string) => void;
}

export interface ScheduleQuery {
    scheduleType: 'appointment' | 'record' | 'phone';
    dateField: 'appointment_time' | 'CreatedAt';
    targetDate: string; // YYYY-MM-DD
}

export interface ScheduleResult {
    success: boolean;
    count: number;
    records?: SalesReport[];
    message: string;
}

/**
 * Parse date from user message (hôm nay, mai, hôm qua)
 */
function parseDateFromMessage(message: string): string {
    const lower = message.toLowerCase();
    const today = new Date();

    if (lower.includes('mai') || lower.includes('ngày mai')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    if (lower.includes('hôm qua')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // Default: today
    return today.toISOString().split('T')[0];
}

/**
 * Handle schedule query
 */
export async function handleScheduleQuery(
    userMessage: string,
    query: ScheduleQuery,
    deps: ScheduleHandlerDeps
): Promise<ScheduleResult> {
    const { userId, addMessage } = deps;
    const { scheduleType, dateField, targetDate } = query;

    try {
        // Determine date from message
        const date = parseDateFromMessage(userMessage);

        // Fetch all sales records for user
        const allRecords = await getSalesReports(userId);

        // Filter by date and type
        let filteredRecords: SalesReport[] = [];

        if (scheduleType === 'appointment') {
            // Filter by appointment_time
            filteredRecords = allRecords.filter(r => {
                if (!r.appointment_time) return false;
                const appointmentDate = r.appointment_time.split('T')[0].split(' ')[0];
                return appointmentDate === date;
            });
        } else if (scheduleType === 'phone') {
            // Filter by CreatedAt + has phone_number
            filteredRecords = allRecords.filter(r => {
                if (!r.phone_number) return false;
                if (!r.CreatedAt) return false;
                const createdDate = r.CreatedAt.split('T')[0].split(' ')[0];
                return createdDate === date;
            });
        } else {
            // Filter by CreatedAt
            filteredRecords = allRecords.filter(r => {
                if (!r.CreatedAt) return false;
                const createdDate = r.CreatedAt.split('T')[0].split(' ')[0];
                return createdDate === date;
            });
        }

        const count = filteredRecords.length;

        // Generate response message
        let message = '';
        const dateLabel = getDateLabel(date);

        if (scheduleType === 'appointment') {
            if (count === 0) {
                message = `📅 ${dateLabel} không có lịch hẹn nào.`;
            } else {
                message = `📅 ${dateLabel} có **${count} lịch hẹn**.`;
                // Add brief list
                const briefList = filteredRecords.slice(0, 3).map(r =>
                    `• ${formatTime(r.appointment_time)} - ${r.phone_number || 'N/A'}`
                ).join('\n');
                message += `\n\n${briefList}`;
                if (count > 3) {
                    message += `\n\n_...và ${count - 3} lịch hẹn khác_`;
                }
            }
        } else if (scheduleType === 'phone') {
            if (count === 0) {
                message = `📱 ${dateLabel} không có SĐT mới nào.`;
            } else {
                message = `📱 ${dateLabel} có **${count} SĐT**.`;
            }
        } else {
            if (count === 0) {
                message = `📋 ${dateLabel} không có dữ liệu mới.`;
            } else {
                message = `📋 ${dateLabel} có **${count} record**.`;
            }
        }

        addMessage('assistant', message);

        return {
            success: true,
            count,
            records: filteredRecords,
            message,
        };

    } catch (error: any) {
        console.error('Error in handleScheduleQuery:', error);
        addMessage('assistant', `❌ Lỗi khi tìm kiếm: ${error.message}`);
        return {
            success: false,
            count: 0,
            message: error.message,
        };
    }
}

/**
 * Get human-readable date label
 */
function getDateLabel(date: string): string {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (date === today) return 'Hôm nay';
    if (date === tomorrowStr) return 'Ngày mai';
    if (date === yesterdayStr) return 'Hôm qua';

    // Format: dd/mm
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Format time from ISO string
 */
function formatTime(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}
