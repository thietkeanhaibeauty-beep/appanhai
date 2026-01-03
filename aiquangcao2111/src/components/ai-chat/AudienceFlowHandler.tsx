import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { validateAudienceData } from '@/services/aiChatAudienceOrchestratorService';

interface AudienceFlowHandlerProps {
    audience: any;
    addMessage: (role: "user" | "assistant", content: string) => void;
    setIsLoading: (loading: boolean) => void;
    isLoading: boolean;
    getTokens: () => { adsToken: string; pageToken: string; adAccountId: string; pageId: string };
    refreshTokens: () => Promise<{ adsToken: string; pageToken: string; adAccountId: string; pageId: string }>;
    onRunAds?: (audienceId: string, audienceName: string) => void;
}

export function AudienceFlowHandler({
    audience,
    addMessage,
    setIsLoading,
    isLoading,
    getTokens,
    refreshTokens,
    onRunAds
}: AudienceFlowHandlerProps) {

    if (audience.stage === 'idle') return null;

    return (
        <>
            {/* Audience Type Selection Buttons */}
            {audience.stage === 'selecting_type' && (
                <div className="pb-2">
                    <div
                        className="flex flex-row gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                audience.selectType('phone_numbers');
                                addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
                            }}
                            className="h-7 text-xs px-3 whitespace-nowrap shrink-0 bg-white/50 backdrop-blur-sm"
                        >
                            📞 Danh sách SĐT
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                audience.selectType('page_messenger');
                                addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
                            }}
                            className="h-7 text-xs px-3 whitespace-nowrap shrink-0 bg-white/50 backdrop-blur-sm"
                        >
                            💬 Khách nhắn tin Page
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                audience.selectType('lookalike');
                                addMessage('assistant', '📋 Vui lòng cung cấp tên đối tượng:');
                            }}
                            className="h-7 text-xs px-3 whitespace-nowrap shrink-0 bg-white/50 backdrop-blur-sm"
                        >
                            🎯 Tệp tương tự
                        </Button>
                    </div>
                </div>
            )}



            {/* Phone Input Method Selection */}
            {
                audience.stage === 'select_phone_method' && (
                    <div className="pb-2">
                        <div className="flex flex-row gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    audience.setStage('collecting_file');
                                    addMessage('assistant', '📄 Vui lòng upload file CSV chứa số điện thoại.');
                                }}
                                className="flex-1"
                            >
                                📁 Upload File CSV
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    audience.setStage('collecting_phone_input');
                                    addMessage('assistant', '📝 Vui lòng dán danh sách số điện thoại vào ô bên dưới.');
                                }}
                                className="flex-1"
                            >
                                ⌨️ Nhập trực tiếp
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Phone Number Textarea Input */}
            {
                audience.stage === 'collecting_phone_input' && (
                    <div className="pb-2">
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs text-muted-foreground">
                                📋 Dán danh sách SĐT (mỗi số 1 dòng hoặc phân cách bởi dấu phẩy)
                            </Label>
                            <textarea
                                className="w-full h-32 p-2 border rounded-md bg-background text-sm resize-y"
                                style={{ fontSize: '16px' }}
                                placeholder={"0912345678\n0987654321\n0901234567\n\nHoặc: 0912345678, 0987654321, 0901234567"}
                                id="phone-input-textarea"
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const textarea = document.getElementById('phone-input-textarea') as HTMLTextAreaElement;
                                        if (!textarea || !textarea.value.trim()) {
                                            addMessage('assistant', '⚠️ Vui lòng nhập ít nhất 1 số điện thoại.');
                                            return;
                                        }

                                        // Smart phone number parsing (handles messy real-world data)
                                        const rawInput = textarea.value.trim();

                                        // Split by newlines, commas, tabs, or multiple spaces
                                        const rawNumbers = rawInput
                                            .split(/[\n,\t]+/)
                                            .flatMap(line => line.trim().split(/\s{2,}/)) // Split by 2+ spaces too
                                            .map(p => p.trim())
                                            .filter(p => p.length > 0);

                                        const phones = rawNumbers
                                            .map(p => {
                                                // Remove all non-digit characters (dots, spaces, dashes, etc.)
                                                let cleaned = p.replace(/\D/g, '');

                                                // Skip if less than 9 digits (not a valid phone)
                                                if (cleaned.length < 9) return null;

                                                // Handle old format: 82xxxxxxxxx (old country code) -> convert to 84
                                                if (cleaned.startsWith('82') && cleaned.length >= 11) {
                                                    cleaned = '84' + cleaned.substring(2);
                                                }

                                                // Handle 84xxxxxxxxx format
                                                if (cleaned.startsWith('84') && cleaned.length >= 11) {
                                                    return '+' + cleaned;
                                                }

                                                // Handle 0xxxxxxxxx format (Vietnam local)
                                                if (cleaned.startsWith('0') && cleaned.length >= 10) {
                                                    return '+84' + cleaned.substring(1);
                                                }

                                                // Handle 9xxxxxxxx format (missing leading 0) - all Vietnam mobile prefixes
                                                if ((cleaned.startsWith('9') || cleaned.startsWith('8') || cleaned.startsWith('7') || cleaned.startsWith('6') || cleaned.startsWith('3') || cleaned.startsWith('5'))
                                                    && cleaned.length >= 9 && cleaned.length <= 10) {
                                                    return '+84' + cleaned;
                                                }

                                                // Fallback: add +84 prefix
                                                return '+84' + cleaned;
                                            })
                                            .filter((p): p is string => p !== null && p.length >= 12) // +84 + 9 digits = 12 chars min
                                            .filter((p, index, self) => self.indexOf(p) === index); // Remove duplicates

                                        if (phones.length === 0) {
                                            addMessage('assistant', '⚠️ Không tìm thấy số điện thoại hợp lệ. Vui lòng kiểm tra lại.');
                                            return;
                                        }

                                        // Store in audience data
                                        audience.setData({ phoneNumbers: phones });
                                        audience.setStage('confirming');

                                        addMessage('assistant',
                                            `✅ Đã trích xuất **${phones.length}** số điện thoại (đã loại trùng)!\n\n` +
                                            `📱 Mẫu: ${phones.slice(0, 5).join(', ')}${phones.length > 5 ? '...' : ''}\n\n` +
                                            `Anh xác nhận tạo đối tượng không?`
                                        );
                                    }}
                                    className="flex-1"
                                >
                                    ✅ Trích xuất & Xác nhận
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        audience.reset();
                                        addMessage('assistant', '❌ Đã hủy.');
                                    }}
                                >
                                    ❌ Hủy
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Page Selection for Messenger Audience */}
            {
                audience.stage === 'collecting_messenger_page' && audience.data?.availablePages && (
                    <div className="pb-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="page-select">Chọn Page</Label>
                            <Select
                                onValueChange={(value) => {
                                    const selectedPage = audience.data.availablePages?.find((p: any) => p.page_id === value);
                                    if (!selectedPage) return;

                                    audience.setData({ pageId: selectedPage.page_id, pageName: selectedPage.page_name });
                                    audience.setStage('collecting_messenger_days');
                                    addMessage('assistant', `✅ Đã chọn Page: **${selectedPage.page_name}**`);
                                    addMessage('assistant', '📅 Vui lòng nhập số ngày lưu trữ (1-365 ngày):\n\n💡 Ví dụ: nhập "30" để lấy người nhắn tin trong 30 ngày qua');
                                }}
                            >
                                <SelectTrigger id="page-select" className="bg-background">
                                    <SelectValue placeholder="Chọn Page..." />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                    {audience.data.availablePages.map((page: any, index: number) => (
                                        <SelectItem key={`${page.page_id}-${index}`} value={page.page_id}>
                                            📄 {page.page_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Buttons (Generic for Confirming Stage) */}
            {
                (audience.stage === 'confirming' ||
                    (audience.stage === 'collecting_messenger_days' && audience.data?.audienceName && audience.data?.pageId && audience.data?.retentionDays)) && (
                    <div className="pb-2">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={async () => {
                                    setIsLoading(true);
                                    const { adsToken, adAccountId } = getTokens();
                                    addMessage('assistant', '⏳ Đang tạo đối tượng...');

                                    const result = await audience.createAudience(adAccountId, adsToken);

                                    if (result.success) {
                                        addMessage('assistant', `✅ ${result.message}`);
                                    } else if (result.tosLink) {
                                        // TOS error - don't reset, let needs_tos_verification stage show buttons
                                        addMessage('assistant', `⚠️ ${result.error || result.message}`);
                                    } else {
                                        addMessage('assistant', `❌ ${result.error || result.message}`);
                                        audience.reset();
                                    }

                                    setIsLoading(false);
                                }}
                                disabled={isLoading}
                            >
                                ✅ Xác nhận tạo
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    audience.reset();
                                    addMessage('assistant', '❌ Đã hủy tạo đối tượng');
                                }}
                                disabled={isLoading}
                            >
                                ❌ Hủy
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* TOS Verification Required */}
            {
                audience.stage === 'needs_tos_verification' && audience.data?.tosLink && (
                    <div className="pb-2">
                        <div className="flex flex-col gap-2">
                            <div className="text-sm text-amber-600 font-medium">
                                ⚠️ Chưa chấp nhận điều khoản Custom Audience
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Bấm nút bên dưới để mở trang Facebook xác nhận điều khoản
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        window.open(audience.data?.tosLink, '_blank');
                                    }}
                                    className="flex-1"
                                >
                                    📋 Mở trang xác nhận
                                </Button>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        setIsLoading(true);
                                        addMessage('user', '✅ Đã xác nhận, thử lại');

                                        try {
                                            // Force refresh tokens to get verified status
                                            const freshTokens = await refreshTokens();
                                            addMessage('assistant', '⏳ Đang refresh token...');

                                            // Go back to confirming and retry
                                            audience.setStage('confirming');

                                            // Re-call createAudience with FRESH tokens
                                            const result = await audience.createAudience(freshTokens.adAccountId, freshTokens.adsToken);

                                            if (result.success) {
                                                addMessage('assistant', `✅ ${result.message}`);
                                                // Ensure we leave the TOS error stage if successful
                                                if (audience.stage === 'needs_tos_verification') {
                                                    audience.reset();
                                                    // Actually createAudience calls internal setStage('idle') on success?
                                                    // Let's check useAudienceFlow. But for now this is safe.
                                                }
                                            } else if (result.tosLink) {
                                                addMessage('assistant', `⚠️ Vẫn chưa xác nhận hoặc cần đợi một lát (cache). Vui lòng thử lại sau 30s.`);
                                            } else {
                                                addMessage('assistant', `❌ ${result.error || result.message}`);
                                                audience.reset();
                                            }
                                        } catch (error: any) {
                                            addMessage('assistant', `❌ Lỗi: ${error.message}`);
                                            audience.reset();
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    ✅ Đã xác nhận, thử lại
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        audience.reset();
                                        addMessage('assistant', '❌ Đã hủy.');
                                    }}
                                    disabled={isLoading}
                                >
                                    ❌ Hủy
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Source Audience Selection for Lookalike */}
            {
                audience.stage === 'collecting_lookalike' && audience.data?.availableAudiences && (
                    <div className="pb-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="source-audience">Chọn đối tượng nguồn</Label>
                            <Select
                                onValueChange={async (value) => {
                                    setIsLoading(true);

                                    const selectedAudience = audience.data.availableAudiences?.find((a: any) => a.id === value);
                                    if (!selectedAudience) return;

                                    // Store source info
                                    const sourceData = {
                                        sourceId: selectedAudience.id,
                                        sourceName: selectedAudience.name,
                                        availableAudiences: undefined
                                    };
                                    audience.setData(sourceData);

                                    // Re-validate after adding sourceId
                                    const updatedData = { ...audience.data, ...sourceData };
                                    const validation = validateAudienceData('lookalike', updatedData);

                                    if (validation.needsMoreInfo) {
                                        if (validation.missingField === 'country') {
                                            audience.setData({ showCountryButtons: true });
                                        }
                                        addMessage('assistant', validation.missingFieldPrompt!);
                                    } else {
                                        // Show confirmation
                                        addMessage('assistant',
                                            `✅ Đã đủ thông tin!\n\n` +
                                            `📋 Tên: ${updatedData.audienceName}\n` +
                                            `🎯 Nguồn: ${updatedData.sourceName}\n` +
                                            `🌍 Quốc gia: ${updatedData.countryName}\n` +
                                            `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                                            `Anh xác nhận tạo không?`
                                        );
                                        audience.setData({ showConfirmButtons: true });
                                    }

                                    setIsLoading(false);
                                }}
                            >
                                <SelectTrigger id="source-audience" className="bg-background">
                                    <SelectValue placeholder="Chọn đối tượng nguồn..." />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                    {audience.data.availableAudiences.map((aud: any, index: number) => (
                                        <SelectItem key={`${aud.id}-${index}`} value={aud.id}>
                                            🎯 {aud.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )
            }

            {/* Country Selection for Lookalike */}
            {
                audience.stage === 'collecting_lookalike' && audience.data?.showCountryButtons && (
                    <div className="pb-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="country-select">Chọn quốc gia</Label>
                            <Select
                                onValueChange={async (value) => {
                                    setIsLoading(true);

                                    const countries = [
                                        { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
                                        { code: 'US', name: 'United States', flag: '🇺🇸' },
                                        { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
                                        { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
                                        { code: 'MY', name: 'Malaysia', flag: '🇲🇾' }
                                    ];

                                    const country = countries.find(c => c.code === value);
                                    if (!country) return;

                                    // Store country info
                                    const countryData = {
                                        country: country.code,
                                        countryName: `${country.flag} ${country.name}`,
                                        showCountryButtons: false
                                    };
                                    audience.setData(countryData);

                                    // Re-validate after adding country
                                    const updatedData = {
                                        ...audience.data,
                                        ...countryData
                                    };
                                    const validation = validateAudienceData('lookalike', updatedData);

                                    if (validation.needsMoreInfo) {
                                        if (validation.missingField === 'ratio') {
                                            audience.setData({ showRatioButtons: true });
                                        }
                                        addMessage('assistant', validation.missingFieldPrompt!);
                                    } else {
                                        // Show confirmation
                                        addMessage('assistant',
                                            `✅ Đã đủ thông tin!\n\n` +
                                            `📋 Tên: ${updatedData.audienceName}\n` +
                                            `🎯 Nguồn: ${updatedData.sourceName}\n` +
                                            `🌍 Quốc gia: ${updatedData.countryName}\n` +
                                            `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                                            `Anh xác nhận tạo không?`
                                        );
                                        audience.setData({ showConfirmButtons: true });
                                    }

                                    setIsLoading(false);
                                }}
                            >
                                <SelectTrigger id="country-select" className="bg-background">
                                    <SelectValue placeholder="Chọn quốc gia..." />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                    {[
                                        { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
                                        { code: 'US', name: 'United States', flag: '🇺🇸' },
                                        { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
                                        { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
                                        { code: 'MY', name: 'Malaysia', flag: '🇲🇾' }
                                    ].map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.flag} {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )
            }

            {/* Ratio Selection for Lookalike */}
            {
                audience.stage === 'collecting_lookalike' && audience.data?.showRatioButtons && (
                    <div className="pb-2">
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((ratio) => (
                                <Button
                                    key={ratio}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setIsLoading(true);

                                        // Store ratio info
                                        const ratioData = {
                                            ratio: ratio,
                                            showRatioButtons: false
                                        };
                                        audience.setData(ratioData);

                                        // Re-validate after adding ratio
                                        const updatedData = {
                                            ...audience.data,
                                            ...ratioData
                                        };
                                        const validation = validateAudienceData('lookalike', updatedData);

                                        if (validation.needsMoreInfo) {
                                            addMessage('assistant', validation.missingFieldPrompt!);
                                        } else {
                                            // Show confirmation
                                            addMessage('assistant',
                                                `✅ Đã đủ thông tin!\n\n` +
                                                `📋 Tên: ${updatedData.audienceName}\n` +
                                                `🎯 Nguồn: ${updatedData.sourceName}\n` +
                                                `🌍 Quốc gia: ${updatedData.countryName}\n` +
                                                `📊 Tỷ lệ: ${updatedData.ratio}%\n\n` +
                                                `Anh xác nhận tạo không?`
                                            );
                                            audience.setData({ showConfirmButtons: true });
                                        }

                                        setIsLoading(false);
                                    }}
                                >
                                    {ratio}%
                                </Button>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Lookalike Confirmation Buttons */}
            {
                audience.stage === 'collecting_lookalike' && audience.data?.showConfirmButtons && (
                    <div className="pb-2">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={async () => {
                                    setIsLoading(true);


                                    const { adsToken, adAccountId } = getTokens();
                                    addMessage('assistant', '⏳ Đang tạo Tệp tương tự...');

                                    const result = await audience.createAudience(adAccountId, adsToken);

                                    if (result.success) {
                                        addMessage('assistant', `✅ ${result.message}`);
                                    } else {
                                        addMessage('assistant', `❌ ${result.error || result.message}`);
                                        audience.reset();
                                    }

                                    setIsLoading(false);
                                }}
                                disabled={isLoading}
                            >
                                ✅ Xác nhận tạo
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    audience.reset();
                                    addMessage('assistant', '❌ Đã hủy tạo đối tượng');
                                }}
                                disabled={isLoading}
                            >
                                ❌ Hủy
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Post-Creation Options (Create Lookalike or Done) */}
            {
                audience.stage === 'post_creation_options' && (
                    <div className="pb-2 animate-in fade-in-50 slide-in-from-bottom-2">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">Anh muốn làm gì tiếp theo?</p>
                            <div className="flex gap-2 flex-wrap">
                                {/* Run Ads Button */}
                                {onRunAds && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            onRunAds(
                                                audience.data.createdAudienceId,
                                                audience.data.createdAudienceName
                                            );
                                            audience.reset();
                                        }}
                                    >
                                        🚀 Chạy quảng cáo tệp
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        // Keep createdAudiences when transitioning to lookalike
                                        const existingAudiences = audience.data?.createdAudiences || [];

                                        // Transition to lookalike creation with pre-filled source
                                        audience.setStage('collecting_lookalike', 'lookalike');

                                        const sourceData = {
                                            sourceId: audience.data.createdAudienceId,
                                            sourceName: audience.data.createdAudienceName,
                                            audienceName: `Tệp tương tự của ${audience.data.createdAudienceName}`,
                                            // Preserve createdAudiences
                                            createdAudiences: existingAudiences,
                                            // Clear previous lookalike-specific data
                                            country: undefined,
                                            ratio: undefined,
                                            showCountryButtons: undefined,
                                            showRatioButtons: undefined,
                                            showConfirmButtons: undefined
                                        };

                                        audience.setData(sourceData);

                                        // Trigger validation to prompt for next step (Country)
                                        const validation = validateAudienceData('lookalike', {
                                            ...audience.data,
                                            ...sourceData
                                        });

                                        if (validation.needsMoreInfo) {
                                            if (validation.missingField === 'country') {
                                                audience.setData({ showCountryButtons: true });
                                            }
                                            addMessage('assistant', `📝 Đã chọn nguồn: **${audience.data.createdAudienceName}**\n\n${validation.missingFieldPrompt}`);
                                        }
                                    }}
                                >
                                    🎯 Tạo Tệp tương tự
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        audience.reset();
                                        addMessage('assistant', '✅ Đã hoàn tất.');
                                    }}
                                >
                                    ❌ Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Post-Lookalike Creation Options (Run Ads on Both or Done) */}
            {
                audience.stage === 'post_lookalike_creation' && (
                    <div className="pb-2 animate-in fade-in-50 slide-in-from-bottom-2">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-green-600">✅ Đã tạo xong tệp tương tự!</p>
                            <p className="text-sm text-muted-foreground">
                                Bạn có muốn chạy quảng cáo với cả 2 tệp này không?
                            </p>
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                {audience.data?.createdAudiences?.map((a: any, i: number) => (
                                    <div key={i}>• {a.name} ({a.type === 'source' ? 'Nguồn' : 'Tương tự'})</div>
                                ))}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {onRunAds && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            // Pass all audience IDs for targeting
                                            const allIds = audience.data?.createdAudiences?.map((a: any) => a.id) || [];
                                            const allNames = audience.data?.createdAudiences?.map((a: any) => a.name).join(', ') || '';

                                            onRunAds(allIds.join(','), allNames);
                                            audience.reset();
                                        }}
                                    >
                                        🚀 Chạy QC cả 2 tệp
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        audience.reset();
                                        addMessage('assistant', '✅ Đã hoàn tất.');
                                    }}
                                >
                                    ❌ Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
