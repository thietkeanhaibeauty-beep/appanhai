import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Wand2, RefreshCcw, Download, Image as ImageIcon } from 'lucide-react';

export default function Editor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [promptData, setPromptData] = useState({
        headline: "Giáng Sinh Vàng, Ngàn Ưu Đãi",
        description: "Ưu đãi độc quyền! Mua sắm quà tặng, lan tỏa yêu thương mùa lễ hội.",
        productImage: null
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000"); // Mock result

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate API call
        setTimeout(() => {
            setIsGenerating(false);
        }, 2000);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPromptData({ ...promptData, productImage: url });
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
            {/* Left Panel: Controls */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6 glass-panel p-6 rounded-2xl overflow-y-auto">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold">Chỉnh Sửa Mẫu</h2>
                </div>

                {/* Upload Section */}
                <div className="space-y-3">
                    <label className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                        Ảnh Sản Phẩm (Chính)
                    </label>
                    <div className="relative group">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="upload-product"
                        />
                        <label
                            htmlFor="upload-product"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-white/5 transition-all"
                        >
                            {promptData.productImage ? (
                                <img src={promptData.productImage} alt="Product" className="h-full object-contain" />
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-500 mb-2 group-hover:text-blue-400" />
                                    <span className="text-sm text-gray-500">Kéo thả hoặc chọn ảnh</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* Text Inputs */}
                <div className="space-y-4">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 text-blue-400">
                        <Wand2 className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase">Nội Dung Văn Bản</span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400">Tiêu đề lớn</label>
                        <input
                            type="text"
                            value={promptData.headline}
                            onChange={(e) => setPromptData({ ...promptData, headline: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400">Nội dung chi tiết</label>
                        <textarea
                            value={promptData.description}
                            onChange={(e) => setPromptData({ ...promptData, description: e.target.value })}
                            rows={4}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                    </div>
                </div>

                {/* Generate Button */}
                <div className="mt-auto pt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 font-bold text-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <div className="relative flex items-center justify-center gap-2">
                            {isGenerating ? (
                                <>
                                    <RefreshCcw className="w-5 h-5 animate-spin" />
                                    Đang Tạo...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-5 h-5" />
                                    Tạo Thiết Kế Mới
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Right Panel: Preview */}
            <div className="flex-1 glass-panel rounded-2xl p-8 flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 z-10">
                    <div className="flex items-center gap-2 text-gray-400">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-sm">Kết quả (Preview)</span>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
                        <Download className="w-4 h-4" />
                        Tải Ảnh Về Máy
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 flex items-center justify-center relative z-10">
                    {/* Background Glow */}
                    <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -z-10 animate-pulse" />

                    <div className={`relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden transition-all duration-500 ${isGenerating ? 'blur-sm scale-95 opacity-70' : ''}`}>
                        <img
                            src={generatedImage}
                            alt="Generated Result"
                            className="max-h-[70vh] object-contain"
                        />

                        {/* Scanline Effect overlay if generating */}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent translate-y-[-100%] animate-[scan_2s_ease-in-out_infinite]" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
