import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link to="/landing" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900">Chính sách bảo mật</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-sm border p-6 md:p-10 space-y-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Chính sách Bảo mật</h1>
                        <p className="text-gray-500">Cập nhật lần cuối: 22 tháng 12, 2024</p>
                    </div>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">1. Giới thiệu</h2>
                        <p className="text-gray-600 leading-relaxed">
                            <strong>Climate Resilience International</strong> ("chúng tôi", "của chúng tôi") cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn. Chính sách Bảo mật này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng nền tảng AI Quảng Cáo Tự Động của chúng tôi ("Dịch vụ").
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Chính sách này tuân thủ các quy định pháp luật về bảo vệ dữ liệu cá nhân của Việt Nam, bao gồm Luật An ninh mạng và các quy định liên quan.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">2. Thông tin Cá nhân được Thu thập</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có thể thu thập các loại thông tin cá nhân sau:
                        </p>

                        <h3 className="text-lg font-medium text-gray-800">2.1. Thông tin bạn cung cấp trực tiếp:</h3>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Họ và tên</li>
                            <li>Địa chỉ email</li>
                            <li>Số điện thoại</li>
                            <li>Thông tin tài khoản Facebook Business (khi kết nối)</li>
                            <li>Thông tin thanh toán (khi mua gói dịch vụ)</li>
                        </ul>

                        <h3 className="text-lg font-medium text-gray-800">2.2. Thông tin thu thập tự động:</h3>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Địa chỉ IP và vị trí địa lý (ước tính)</li>
                            <li>Loại trình duyệt và thiết bị</li>
                            <li>Thời gian truy cập và các trang đã xem</li>
                            <li>Cookie và công nghệ theo dõi tương tự</li>
                        </ul>

                        <h3 className="text-lg font-medium text-gray-800">2.3. Thông tin từ bên thứ ba:</h3>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Dữ liệu quảng cáo từ Facebook Ads API</li>
                            <li>Thông tin trang Facebook và Instagram (khi được cấp quyền)</li>
                            <li>Thông tin xác thực từ Google (nếu đăng nhập bằng Google)</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">3. Mục đích Sử dụng Dữ liệu</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi sử dụng thông tin cá nhân của bạn cho các mục đích sau:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>Cung cấp Dịch vụ:</strong> Tạo và quản lý tài khoản, xử lý giao dịch, cung cấp các tính năng quảng cáo tự động.</li>
                            <li><strong>Cải thiện Dịch vụ:</strong> Phân tích cách người dùng tương tác với Dịch vụ để cải thiện trải nghiệm.</li>
                            <li><strong>Liên lạc:</strong> Gửi thông báo về Dịch vụ, hỗ trợ khách hàng, và thông tin cập nhật.</li>
                            <li><strong>Bảo mật:</strong> Phát hiện và ngăn chặn gian lận, lạm dụng hoặc hoạt động không hợp pháp.</li>
                            <li><strong>Tuân thủ pháp luật:</strong> Đáp ứng các yêu cầu pháp lý và quy định.</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi sẽ không xử lý dữ liệu cá nhân của bạn ngoài phạm vi cần thiết để đạt được các mục đích trên.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">4. Chia sẻ Dữ liệu</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có thể chia sẻ thông tin cá nhân của bạn trong các trường hợp sau:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>Nhà cung cấp dịch vụ:</strong> Các đối tác hỗ trợ vận hành Dịch vụ (lưu trữ dữ liệu, xử lý thanh toán, phân tích).</li>
                            <li><strong>Facebook/Meta:</strong> Để thực hiện các chức năng quảng cáo theo ủy quyền của bạn.</li>
                            <li><strong>Yêu cầu pháp lý:</strong> Khi được yêu cầu bởi luật pháp hoặc cơ quan có thẩm quyền.</li>
                            <li><strong>Bảo vệ quyền lợi:</strong> Để bảo vệ quyền, tài sản hoặc an toàn của chúng tôi và người dùng.</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">5. Bảo mật Dữ liệu</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu cá nhân của bạn, bao gồm:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Mã hóa dữ liệu trong quá trình truyền tải (SSL/TLS)</li>
                            <li>Kiểm soát truy cập nghiêm ngặt</li>
                            <li>Giám sát và phát hiện xâm nhập</li>
                            <li>Sao lưu dữ liệu định kỳ</li>
                            <li>Đào tạo nhân viên về bảo mật thông tin</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Tuy nhiên, không có phương pháp truyền tải qua Internet hoặc lưu trữ điện tử nào an toàn 100%. Chúng tôi không thể đảm bảo tuyệt đối an toàn cho dữ liệu của bạn.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">6. Lưu trữ Dữ liệu</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi lưu trữ dữ liệu cá nhân của bạn trong thời gian cần thiết để:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Cung cấp Dịch vụ cho bạn</li>
                            <li>Tuân thủ các nghĩa vụ pháp lý</li>
                            <li>Giải quyết tranh chấp</li>
                            <li>Thực thi các thỏa thuận của chúng tôi</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Khi dữ liệu không còn cần thiết, chúng tôi sẽ xóa hoặc ẩn danh hóa dữ liệu một cách an toàn.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">7. Quyền của Bạn</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Theo quy định pháp luật Việt Nam, bạn có các quyền sau đối với dữ liệu cá nhân của mình:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>Quyền truy cập:</strong> Yêu cầu xem dữ liệu cá nhân mà chúng tôi lưu giữ về bạn.</li>
                            <li><strong>Quyền chỉnh sửa:</strong> Yêu cầu sửa đổi thông tin không chính xác hoặc không đầy đủ.</li>
                            <li><strong>Quyền xóa:</strong> Yêu cầu xóa dữ liệu cá nhân của bạn trong một số trường hợp nhất định.</li>
                            <li><strong>Quyền rút lại sự đồng ý:</strong> Rút lại sự đồng ý cho việc xử lý dữ liệu bất cứ lúc nào.</li>
                            <li><strong>Quyền phản đối:</strong> Phản đối việc xử lý dữ liệu cá nhân trong một số trường hợp.</li>
                            <li><strong>Quyền di chuyển dữ liệu:</strong> Yêu cầu nhận dữ liệu ở định dạng có thể đọc được bằng máy.</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Để thực hiện các quyền này, vui lòng liên hệ với chúng tôi qua thông tin bên dưới.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">8. Cookie và Công nghệ Theo dõi</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi sử dụng cookie và công nghệ theo dõi tương tự để:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Duy trì phiên đăng nhập của bạn</li>
                            <li>Ghi nhớ tùy chọn của bạn</li>
                            <li>Phân tích cách bạn sử dụng Dịch vụ</li>
                            <li>Cải thiện hiệu suất và bảo mật</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn có thể kiểm soát cookie thông qua cài đặt trình duyệt. Tuy nhiên, việc vô hiệu hóa cookie có thể ảnh hưởng đến chức năng của Dịch vụ.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">9. Trẻ em</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Dịch vụ của chúng tôi không dành cho người dưới 18 tuổi. Chúng tôi không cố ý thu thập dữ liệu cá nhân từ trẻ em. Nếu bạn phát hiện rằng trẻ em đã cung cấp thông tin cho chúng tôi, vui lòng liên hệ ngay để chúng tôi xử lý.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">10. Thay đổi Chính sách</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi có thể cập nhật Chính sách Bảo mật này theo thời gian. Các thay đổi sẽ được thông báo qua email hoặc thông báo trên Dịch vụ. Ngày "Cập nhật lần cuối" ở đầu trang sẽ phản ánh ngày sửa đổi gần nhất.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Việc tiếp tục sử dụng Dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận Chính sách Bảo mật mới.
                        </p>
                    </section>

                    <section className="space-y-4 bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <h2 className="text-xl font-semibold text-gray-900">11. Dữ liệu Facebook/Meta</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Khi bạn kết nối tài khoản Facebook Business với Dịch vụ của chúng tôi, chúng tôi sẽ truy cập và sử dụng dữ liệu sau thông qua Facebook API:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>Thông tin tài khoản:</strong> ID người dùng, tên, email (từ Facebook Login)</li>
                            <li><strong>Tài khoản quảng cáo:</strong> Danh sách Ad Accounts, chiến dịch, nhóm quảng cáo, quảng cáo</li>
                            <li><strong>Insights:</strong> Dữ liệu hiệu suất quảng cáo (impressions, clicks, conversions, chi phí)</li>
                            <li><strong>Trang Facebook:</strong> Danh sách các trang bạn quản lý (khi được cấp quyền)</li>
                            <li><strong>Custom Audiences:</strong> Danh sách đối tượng tùy chỉnh (chỉ khi bạn sử dụng tính năng này)</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            <strong>Mục đích sử dụng:</strong> Chúng tôi sử dụng dữ liệu Facebook để cung cấp các tính năng tự động hóa quảng cáo, báo cáo hiệu suất, và tối ưu hóa chiến dịch theo yêu cầu của bạn.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            <strong>Chia sẻ với Meta:</strong> Chúng tôi chia sẻ dữ liệu với Meta/Facebook thông qua Marketing API để thực hiện các thao tác quảng cáo (tạo, chỉnh sửa, tạm dừng chiến dịch) theo ủy quyền của bạn.
                        </p>
                    </section>

                    <section className="space-y-4 bg-red-50 p-6 rounded-xl border border-red-200">
                        <h2 className="text-xl font-semibold text-gray-900">12. Yêu cầu Xóa Dữ liệu (Data Deletion)</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn có quyền yêu cầu xóa toàn bộ dữ liệu cá nhân của bạn khỏi hệ thống của chúng tôi. Khi bạn gửi yêu cầu xóa dữ liệu, chúng tôi sẽ:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>Xóa tài khoản người dùng và thông tin cá nhân của bạn</li>
                            <li>Xóa kết nối với tài khoản Facebook/Meta của bạn</li>
                            <li>Xóa dữ liệu quảng cáo và báo cáo liên quan đến tài khoản của bạn</li>
                            <li>Xóa lịch sử sử dụng dịch vụ</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            <strong>Thời gian xử lý:</strong> Chúng tôi sẽ xử lý yêu cầu xóa dữ liệu trong vòng <strong>30 ngày</strong> kể từ ngày nhận được yêu cầu.
                        </p>
                        <div className="bg-white rounded-lg p-4 border border-red-200">
                            <p className="font-semibold text-gray-900 mb-2">Cách gửi yêu cầu xóa dữ liệu:</p>
                            <ul className="list-decimal list-inside text-gray-600 space-y-1">
                                <li>Gửi email đến: <a href="mailto:mentor@aiadsfb.com" className="text-pink-500 hover:underline">mentor@aiadsfb.com</a></li>
                                <li>Tiêu đề email: "Yêu cầu xóa dữ liệu - [Email đăng ký của bạn]"</li>
                                <li>Nội dung: Xác nhận bạn muốn xóa toàn bộ dữ liệu</li>
                            </ul>
                            <p className="text-gray-600 mt-2">
                                Hoặc truy cập: <a href="https://aiautofb.com/data-deletion" className="text-pink-500 hover:underline">aiautofb.com/data-deletion</a>
                            </p>
                        </div>
                        <p className="text-gray-500 text-sm">
                            <strong>Lưu ý:</strong> Một số dữ liệu có thể được giữ lại để tuân thủ nghĩa vụ pháp lý hoặc giải quyết tranh chấp.
                        </p>
                    </section>

                    <section className="space-y-4 bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                        <h2 className="text-xl font-semibold text-gray-900">13. Từ chối Quảng cáo Cá nhân hóa (Opt-Out)</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Bạn có quyền từ chối việc sử dụng dữ liệu của bạn cho quảng cáo cá nhân hóa. Để thực hiện điều này:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li><strong>Trong Dịch vụ:</strong> Vào Cài đặt tài khoản → Quyền riêng tư → Tắt "Quảng cáo cá nhân hóa"</li>
                            <li><strong>Trên Facebook:</strong> Vào Cài đặt Facebook → Quảng cáo → Tùy chọn quảng cáo → Quản lý cài đặt</li>
                            <li><strong>Trên trình duyệt:</strong> Sử dụng chế độ duyệt web riêng tư hoặc vô hiệu hóa cookie của bên thứ ba</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed">
                            Việc từ chối quảng cáo cá nhân hóa sẽ không ảnh hưởng đến các chức năng cốt lõi của Dịch vụ.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900">14. Thông tin Liên hệ</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Nếu bạn có bất kỳ câu hỏi hoặc lo ngại nào về Chính sách Bảo mật này hoặc cách chúng tôi xử lý dữ liệu cá nhân của bạn, vui lòng liên hệ:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                            <p><strong>Climate Resilience International - Data Privacy Department</strong></p>
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
