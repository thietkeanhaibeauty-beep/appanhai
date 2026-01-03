/**
 * Export Report to Excel (CSV format)
 * 
 * Xuất báo cáo từ ReportCard ra file CSV có thể mở trong Excel
 */

import { ReportData } from '@/components/ai-chat/ReportCard';

/**
 * Convert report data to CSV and trigger download
 */
export function exportReportToExcel(data: ReportData): void {
    const { reportType, dateRange, accountName, summary, topCampaigns } = data;

    // Format date for filename
    const startDate = formatDateForFile(dateRange.startDate);
    const endDate = formatDateForFile(dateRange.endDate);
    const reportTypeName = getReportTypeName(reportType);

    // Build CSV content
    const rows: string[][] = [];

    // Header info
    rows.push(['BÁO CÁO', reportTypeName.toUpperCase()]);
    rows.push(['Khoảng thời gian', `${startDate} - ${endDate}`]);
    rows.push(['Tài khoản', accountName || 'N/A']);
    rows.push([]); // Empty row

    // Summary section
    rows.push(['--- CHỈ SỐ TỔNG HỢP ---']);

    if (reportType === 'marketing' || reportType === 'summary') {
        rows.push(['Chi tiêu', formatNumber(summary.spend) + ' đ']);
        rows.push(['Kết quả', formatNumber(summary.results)]);
        rows.push(['Chi phí/KQ', formatNumber(summary.costPerResult) + ' đ']);
        if (summary.impressions) rows.push(['Impressions', formatNumber(summary.impressions)]);
        if (summary.reach) rows.push(['Reach', formatNumber(summary.reach)]);
        if (summary.clicks) rows.push(['Clicks', formatNumber(summary.clicks)]);
        if (summary.ctr) rows.push(['CTR', summary.ctr.toFixed(2) + '%']);
    }

    if (reportType === 'sales' || reportType === 'summary') {
        if (summary.revenue !== undefined) rows.push(['Doanh thu', formatNumber(summary.revenue) + ' đ']);
        if (summary.phones !== undefined) rows.push(['Số SĐT', formatNumber(summary.phones)]);
        if (summary.costPerPhone !== undefined && summary.costPerPhone > 0) {
            rows.push(['Chi phí/SĐT', formatNumber(summary.costPerPhone) + ' đ']);
        }
    }

    rows.push([]); // Empty row

    // Top campaigns section
    if (topCampaigns && topCampaigns.length > 0) {
        rows.push(['--- TOP CHIẾN DỊCH ---']);
        rows.push(['Tên', 'Kết quả', 'Chi tiêu']);

        topCampaigns.forEach((campaign, index) => {
            rows.push([
                `${index + 1}. ${campaign.name}`,
                formatNumber(campaign.results),
                formatNumber(campaign.spend) + ' đ'
            ]);
        });
    }

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baocao_${reportType}_${startDate}_${endDate}.csv`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
}

function formatDateForFile(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}`;
}

function formatNumber(value: number): string {
    return value.toLocaleString('vi-VN');
}

function getReportTypeName(type: 'marketing' | 'sales' | 'summary'): string {
    switch (type) {
        case 'sales': return 'Doanh thu';
        case 'summary': return 'Tổng hợp';
        default: return 'Marketing';
    }
}
