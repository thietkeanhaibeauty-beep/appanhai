
export interface QueueItem {
    id: string;
    type: 'CAMPAIGN' | 'ADSET' | 'AD';
    name: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    data: any;
    error?: string;
}

export interface QueueProgress {
    total: number;
    current: number;
    percent: number;
    currentItem?: string;
    logs: string[];
}

type ProgressCallback = (progress: QueueProgress) => void;

export class CampaignQueueManager {
    private queue: QueueItem[] = [];
    private isProcessing = false;
    private shouldStop = false;
    private logs: string[] = [];
    private delayMs = 2000; // 2 seconds delay between actions to be safe

    constructor(delayMs: number = 2000) {
        this.delayMs = delayMs;
    }

    addToQueue(items: QueueItem[]) {
        this.queue.push(...items);
    }

    clearQueue() {
        this.queue = [];
        this.logs = [];
        this.isProcessing = false;
        this.shouldStop = false;
    }

    stop() {
        this.shouldStop = true;
    }

    async process(onProgress: ProgressCallback): Promise<boolean> {
        if (this.isProcessing) return false;
        this.isProcessing = true;
        this.shouldStop = false;

        const total = this.queue.length;
        let completed = 0;

        this.addLog(`🚀 Bắt đầu xử lý ${total} tác vụ...`);
        onProgress(this.getProgress(total, completed));

        for (let i = 0; i < this.queue.length; i++) {
            if (this.shouldStop) {
                this.addLog("⚠️ Đã dừng xử lý theo yêu cầu.");
                onProgress(this.getProgress(total, completed));
                break;
            }

            const item = this.queue[i];
            item.status = 'PROCESSING';
            this.addLog(`⏳ Đang xử lý: [${item.type}] ${item.name}...`);
            onProgress({ ...this.getProgress(total, completed), currentItem: item.name });

            try {
                // Simulate API Call / Actual Logic will go here
                await this.executeItem(item);

                item.status = 'COMPLETED';
                this.addLog(`✅ Hoàn thành: ${item.name}`);
            } catch (error) {
                item.status = 'FAILED';
                item.error = error instanceof Error ? error.message : "Unknown error";
                this.addLog(`❌ Lỗi: ${item.name} - ${item.error}`);
                // Option: Break on error or continue? For now, continue but log error.
            }

            completed++;
            onProgress(this.getProgress(total, completed));

            // Delay between items
            if (i < this.queue.length - 1) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }

        this.isProcessing = false;
        this.addLog("🏁 Hoàn tất quá trình xử lý.");
        return true;
    }

    private getProgress(total: number, current: number): QueueProgress {
        return {
            total,
            current,
            percent: total === 0 ? 0 : Math.round((current / total) * 100),
            logs: [...this.logs]
        };
    }

    private addLog(message: string) {
        const time = new Date().toLocaleTimeString('vi-VN');
        this.logs.push(`[${time}] ${message}`);
    }

    // This function will be replaced with actual API calls later
    private async executeItem(item: QueueItem): Promise<void> {
        // Mock execution time
        const executionTime = 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, executionTime));

        // Random failure simulation (optional, for testing UI)
        // if (Math.random() < 0.1) throw new Error("Simulated API Error");

        return;
    }
}
