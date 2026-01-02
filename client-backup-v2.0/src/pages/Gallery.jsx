import React from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_TEMPLATES = [
    {
        id: 1,
        title: "Giáng Sinh Vàng",
        category: "Holiday",
        image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000",
        description: "Sang trọng, lấp lánh cho mùa lễ hội"
    },
    {
        id: 2,
        title: "Sale Cực Sốc",
        category: "Promotion",
        image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000",
        description: "Bùng nổ doanh số với thiết kế nổi bật"
    },
    {
        id: 3,
        title: "Beauty Spa",
        category: "Beauty",
        image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=1000",
        description: "Nhẹ nhàng, tinh tế cho spa và mỹ phẩm"
    },
    {
        id: 4,
        title: "Tech Modern",
        category: "Technology",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1000",
        description: "Hiện đại, tối giản cho sản phẩm công nghệ"
    }
];

export default function Gallery() {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold">
                    Chọn Mẫu Thiết Kế
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Khám phá bộ sưu tập mẫu quảng cáo chuyên nghiệp. Tự động tùy chỉnh với AI chỉ trong vài giây.
                </p>
            </div>

            {/* Filter Tabs (Mock) */}
            <div className="flex justify-center gap-4">
                {['Tất cả', 'Lễ hội', 'Khuyến mãi', 'Mỹ phẩm', 'Công nghệ'].map((tab) => (
                    <button
                        key={tab}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-white/10 border border-transparent hover:border-white/20"
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {MOCK_TEMPLATES.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => navigate(`/editor/${template.id}`)}
                        className="group relative cursor-pointer glass-panel rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
                    >
                        <div className="aspect-[4/5] relative">
                            <img
                                src={template.image}
                                alt={template.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                                {template.category}
                            </span>
                            <h3 className="text-xl font-bold text-white mt-1">
                                {template.title}
                            </h3>
                            <p className="text-sm text-gray-300 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                {template.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
