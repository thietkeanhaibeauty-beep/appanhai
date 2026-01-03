import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link to="/landing" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900">Điều khoản dịch vụ</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-sm border p-6 md:p-10 space-y-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Điều khoản Dịch vụ</h1>
                        <p className="text-gray-500">Cập nhật lần cuối: 22 tháng 12, 2024</p>
                    </div>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">1. Giới thiệu và Chấp nhận Điều khoản</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chào mừng bạn đến với <strong>Climate Resilience International</strong> ("chúng tôi", "của chúng tôi"). Bằng việc truy cập hoặc sử dụng nền tảng AI Quảng Cáo Tự Động của chúng tôi ("Dịch vụ"), bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý bị ràng buộc bởi các Điều khoản Dịch vụ này.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng Dịch vụ của chúng tôi.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">2. Định nghĩa</h2>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>"Dịch vụ"</strong>: Nền tảng AI quảng cáo tự động, bao gồm website, ứng dụng và các tính năng liên quan.</li>
                            <li><strong>"Người dùng"</strong>: Bất kỳ cá nhân hoặc tổ chức nào đăng ký và sử dụng Dịch vụ.</li>
                            <li><strong>"Nội dung"</strong>: Văn bản, hình ảnh, video, quảng cáo và các tài liệu khác được tạo hoặc tải lên Dịch vụ.</li>
                            <li><strong>"Dữ liệu Khách hàng"</strong>: Thông tin và dữ liệu mà Người dùng cung cấp hoặc được thu thập qua việc sử dụng Dịch vụ.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">3. Tài khoản Người dùng</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Để sử dụng Dịch vụ, bạn cần tạo một tài khoản. Bạn có trách nhiệm:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Cung cấp thông tin chính xác và đầy đủ khi đăng ký.</li>
                            <li>Bảo mật thông tin đăng nhập và mật khẩu của bạn.</li>
                            <li>Thông báo ngay cho chúng tôi nếu phát hiện bất kỳ truy cập trái phép nào.</li>
                            <li>Chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của bạn.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">4. Cung cấp Dịch vụ</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi cung cấp các dịch vụ bao gồm nhưng không giới hạn:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Tạo và quản lý chiến dịch quảng cáo Facebook tự động.</li>
                            <li>Tối ưu ngân sách quảng cáo bằng AI.</li>
                            <li>Báo cáo và phân tích hiệu suất quảng cáo.</li>
                            <li>Tự động hóa quy trình quảng cáo theo quy tắc.</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi sẽ nỗ lực hợp lý để cung cấp Dịch vụ một cách liên tục và ổn định, nhưng không đảm bảo Dịch vụ sẽ không bị gián đoạn hoặc không có lỗi.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">5. Quyền Sở hữu Trí tuệ</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Tất cả quyền sở hữu trí tuệ liên quan đến Dịch vụ (bao gồm mã nguồn, thiết kế, logo, nhãn hiệu) thuộc về Climate Resilience International hoặc các bên cấp phép của chúng tôi.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn giữ quyền sở hữu đối với Nội dung mà bạn tạo ra hoặc tải lên Dịch vụ. Bằng việc sử dụng Dịch vụ, bạn cấp cho chúng tôi quyền sử dụng Nội dung của bạn để cung cấp và cải thiện Dịch vụ.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">6. Điều khoản Thanh toán</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Các gói dịch vụ có phí sẽ được thanh toán theo chu kỳ thanh toán đã chọn (hàng tháng hoặc hàng năm). Phí dịch vụ không hoàn lại trừ khi có quy định khác trong chính sách hoàn tiền của chúng tôi.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có quyền thay đổi giá dịch vụ với thông báo trước ít nhất 30 ngày.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">7. Nghĩa vụ và Trách nhiệm của Người dùng</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Khi sử dụng Dịch vụ, bạn cam kết:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Tuân thủ mọi luật pháp và quy định hiện hành.</li>
                            <li>Không sử dụng Dịch vụ cho mục đích bất hợp pháp hoặc lừa đảo.</li>
                            <li>Không vi phạm chính sách quảng cáo của Facebook và các nền tảng liên quan.</li>
                            <li>Không can thiệp hoặc làm gián đoạn hoạt động của Dịch vụ.</li>
                            <li>Không chia sẻ tài khoản hoặc thông tin đăng nhập với người khác.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">8. Giới hạn Trách nhiệm</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Trong phạm vi tối đa được pháp luật cho phép, Climate Resilience International không chịu trách nhiệm về:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Bất kỳ thiệt hại gián tiếp, ngẫu nhiên, đặc biệt hoặc hậu quả nào.</li>
                            <li>Mất mát dữ liệu, lợi nhuận hoặc doanh thu.</li>
                            <li>Các vấn đề phát sinh từ việc sử dụng hoặc không thể sử dụng Dịch vụ.</li>
                            <li>Hành động của các nền tảng bên thứ ba (Facebook, Google, v.v.).</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">9. Chấm dứt</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có quyền tạm ngưng hoặc chấm dứt quyền truy cập của bạn vào Dịch vụ nếu bạn vi phạm các Điều khoản này. Bạn cũng có thể chấm dứt tài khoản bất cứ lúc nào bằng cách liên hệ với chúng tôi.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">10. Luật Điều chỉnh</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Các Điều khoản này được điều chỉnh và giải thích theo pháp luật Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết tại tòa án có thẩm quyền tại Việt Nam.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">11. Thay đổi Điều khoản</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có quyền sửa đổi các Điều khoản này vào bất kỳ lúc nào. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên Dịch vụ. Việc tiếp tục sử dụng Dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
                        </p>
                    </section>

                    <section className="space-y-4 bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <h2 className="text-xl font-semibold text-gray-900">12. Tuân thủ Chính sách Facebook/Meta</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Khi sử dụng Dịch vụ để quản lý quảng cáo Facebook, bạn đồng ý tuân thủ:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>Meta Platform Terms:</strong> Các điều khoản nền tảng Meta/Facebook</li>
                            <li><strong>Facebook Advertising Policies:</strong> Chính sách quảng cáo Facebook</li>
                            <li><strong>Facebook Community Standards:</strong> Tiêu chuẩn cộng đồng Facebook</li>
                            <li><strong>Marketing API Terms of Use:</strong> Điều khoản sử dụng Marketing API</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu phát hiện vi phạm các chính sách của Facebook/Meta hoặc nếu nhận được yêu cầu từ Meta.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            <strong>Lưu ý:</strong> Việc tài khoản quảng cáo Facebook của bạn bị hạn chế hoặc khóa bởi Meta không nằm trong phạm vi trách nhiệm của chúng tôi.
                        </p>
                    </section>

                    <section className="space-y-4 bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                        <h2 className="text-xl font-semibold text-gray-900">13. Trách nhiệm về Nội dung Quảng cáo</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn hoàn toàn chịu trách nhiệm về nội dung quảng cáo được tạo và phân phối thông qua Dịch vụ của chúng tôi, bao gồm:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Văn bản, hình ảnh, video và các tài liệu sáng tạo khác</li>
                            <li>Trang đích (landing page) và website đích</li>
                            <li>Sản phẩm và dịch vụ được quảng cáo</li>
                            <li>Đối tượng nhắm mục tiêu và ngân sách quảng cáo</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn cam kết rằng tất cả nội dung quảng cáo:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Không vi phạm quyền sở hữu trí tuệ của bên thứ ba</li>
                            <li>Không chứa nội dung sai lệch, lừa đảo hoặc gây hiểu lầm</li>
                            <li>Tuân thủ pháp luật về quảng cáo của Việt Nam</li>
                            <li>Tuân thủ chính sách quảng cáo của Facebook/Meta</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Climate Resilience International không chịu trách nhiệm về bất kỳ thiệt hại, khiếu nại hoặc hậu quả pháp lý nào phát sinh từ nội dung quảng cáo của bạn.
                        </p>
                    </section>

                    <section className="space-y-4 bg-green-50 p-6 rounded-xl border border-green-200">
                        <h2 className="text-xl font-semibold text-gray-900">14. Sử dụng API và Tích hợp</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Dịch vụ của chúng tôi sử dụng Facebook Marketing API và các API khác của Meta theo các điều khoản và điều kiện của Meta. Khi kết nối tài khoản Facebook Business:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Bạn ủy quyền cho chúng tôi truy cập và quản lý tài khoản quảng cáo của bạn</li>
                            <li>Bạn chịu trách nhiệm duy trì quyền truy cập hợp lệ vào các tài khoản Facebook Business</li>
                            <li>Bạn đồng ý rằng chúng tôi có thể thực hiện các thao tác quảng cáo (tạo, chỉnh sửa, tạm dừng, xóa) theo cấu hình của bạn</li>
                            <li>Chúng tôi không lưu trữ mật khẩu Facebook của bạn - xác thực được thực hiện thông qua OAuth của Facebook</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn có thể thu hồi quyền truy cập của chúng tôi bất cứ lúc nào thông qua cài đặt Facebook Business của bạn.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">15. Thông tin Liên hệ</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Nếu bạn có bất kỳ câu hỏi nào về các Điều khoản này, vui lòng liên hệ với chúng tôi:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                            <p><strong>Climate Resilience International</strong></p>
                            <p className="text-sm">IRS Determination — Recognized as a 501(c)(3) public charity; EIN: 931391894</p>
                            <p>Address: 125 E BIDWELL ST APT 421, FOLSOM, CA 95630</p>
                            <p>Hotline: <a href="tel:+17602849613" className="text-pink-500 hover:underline">+1 760 284 9613</a></p>
                            <p>Email: <a href="mailto:mentor@aiadsfb.com" className="text-pink-500 hover:underline">mentor@aiadsfb.com</a></p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
