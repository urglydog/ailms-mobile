// Nội dung Trung tâm trợ giúp — sao từ `fe/messages/vi.json` (supportHelp.categories + supportHelp.faq).
// Khi sửa FAQ ở web, cập nhật lại file này cho đồng bộ.
export type SupportCategory =
  | 'ACCOUNT' | 'PAYMENT' | 'COURSE' | 'LEARNING' | 'AI_FEATURES' | 'EXAM' | 'CERTIFICATE'
  | 'COMMUNITY' | 'LIVE' | 'INSTRUCTOR' | 'PRIVACY' | 'TECHNICAL' | 'OTHER';

export interface Faq { q: string; a: string; hint: string }

export const SUPPORT_CATEGORIES: SupportCategory[] = ["ACCOUNT", "PAYMENT", "COURSE", "LEARNING", "AI_FEATURES", "EXAM", "CERTIFICATE", "COMMUNITY", "LIVE", "INSTRUCTOR", "PRIVACY", "TECHNICAL", "OTHER"];

export const CATEGORY_INFO: Record<SupportCategory, { title: string; desc: string }> = {
  "ACCOUNT": {
    "title": "Tài khoản & đăng nhập",
    "desc": "Quên mật khẩu, OTP, tài khoản bị khóa, đăng nhập Google"
  },
  "PAYMENT": {
    "title": "Thanh toán & hoàn tiền",
    "desc": "Đã trả tiền chưa vào khóa, trừ tiền hai lần, hoàn tiền, mã giảm giá"
  },
  "COURSE": {
    "title": "Khóa học & nội dung",
    "desc": "Không vào được khóa học, video, tài liệu, nội dung sai"
  },
  "LEARNING": {
    "title": "Học tập: quiz, flashcard, học liệu",
    "desc": "Chấm điểm quiz, flashcard, học liệu AI, bài tập, chuỗi ngày học"
  },
  "AI_FEATURES": {
    "title": "Tính năng AI",
    "desc": "AI Tutor, lộ trình học AI, bị khóa AI, lồng tiếng AI"
  },
  "EXAM": {
    "title": "Thi & giám sát",
    "desc": "Camera, mất kết nối, nộp bài, báo vi phạm nhầm, điểm thi"
  },
  "CERTIFICATE": {
    "title": "Chứng chỉ",
    "desc": "Chưa có chứng chỉ, sai tên, mã xác minh, tải PDF"
  },
  "COMMUNITY": {
    "title": "Cộng đồng & đánh giá",
    "desc": "Báo cáo vi phạm, quấy rối, đánh giá bị ẩn, hỏi đáp, tin nhắn"
  },
  "LIVE": {
    "title": "Buổi học trực tiếp",
    "desc": "Không vào được live, mất hình/tiếng, phụ đề dịch, buổi live bị hủy"
  },
  "INSTRUCTOR": {
    "title": "Dành cho giảng viên",
    "desc": "Duyệt khóa học, doanh thu, tải lên, bị báo cáo, đăng ký giảng viên"
  },
  "PRIVACY": {
    "title": "Quyền riêng tư & dữ liệu",
    "desc": "Xóa tài khoản, xuất dữ liệu, hồ sơ công khai, nghi bị xâm nhập"
  },
  "TECHNICAL": {
    "title": "Lỗi kỹ thuật",
    "desc": "Trang lỗi, tải chậm, app di động, thông báo, hiển thị"
  },
  "OTHER": {
    "title": "Vấn đề khác",
    "desc": "Góp ý, hợp tác, các nội dung còn lại"
  }
};

export const FAQS: Record<SupportCategory, Faq[]> = {
  "ACCOUNT": [
    {
      "q": "Tôi quên mật khẩu",
      "a": "Vào trang Đăng nhập, chọn Quên mật khẩu và nhập email để nhận mã OTP (hiệu lực 5 phút). Nếu không thấy email, hãy kiểm tra thư mục Spam.",
      "hint": "Email đăng ký tài khoản và thời điểm bạn thử đặt lại."
    },
    {
      "q": "Không nhận được mã OTP",
      "a": "Chờ vài phút và kiểm tra thư mục Spam. Nếu vẫn không có, hãy gửi yêu cầu: quản trị viên sẽ xác minh và gửi liên kết đặt lại mật khẩu (hiệu lực 30 phút) tới email của bạn.",
      "hint": "Email tài khoản, thời điểm đã thử và bạn đã kiểm tra thư mục Spam chưa."
    },
    {
      "q": "Tôi đăng nhập bằng Google, có đổi mật khẩu được không?",
      "a": "Tài khoản đăng nhập bằng Google không có mật khẩu riêng nên không đặt lại mật khẩu được. Hãy dùng nút Đăng nhập bằng Google mỗi lần vào.",
      "hint": "Email Google bạn đang dùng và lỗi bạn gặp khi đăng nhập."
    },
    {
      "q": "Tài khoản của tôi bị khóa",
      "a": "Tài khoản có thể bị khóa khi vi phạm quy định hoặc có dấu hiệu bất thường. Hãy gửi yêu cầu kèm email tài khoản và nội dung thông báo bạn thấy để được xem xét.",
      "hint": "Email tài khoản, thời điểm bị khóa và thông báo hiển thị trên màn hình."
    },
    {
      "q": "Có thiết bị lạ đăng nhập hoặc tôi bị đăng xuất liên tục",
      "a": "Vào Cài đặt tài khoản, chọn đăng xuất khỏi tất cả thiết bị khác rồi đổi mật khẩu ngay. Nếu vẫn thấy hoạt động lạ, hãy gửi yêu cầu để chúng tôi kiểm tra.",
      "hint": "Thiết bị/địa chỉ IP lạ bạn thấy và thời điểm xảy ra."
    },
    {
      "q": "Tôi muốn đổi email hoặc thông tin tài khoản",
      "a": "Họ tên, ảnh đại diện và thông tin hồ sơ chỉnh được trong Cài đặt tài khoản. Nếu cần đổi email đăng nhập, hãy gửi yêu cầu để quản trị viên xác minh danh tính và hỗ trợ.",
      "hint": "Email hiện tại, email muốn đổi sang và lý do."
    }
  ],
  "PAYMENT": [
    {
      "q": "Tôi đã thanh toán nhưng chưa vào được khóa học",
      "a": "Hệ thống có thể mất vài phút để xác nhận giao dịch. Nếu sau 15 phút khóa học vẫn chưa xuất hiện trong mục Khóa học của tôi, hãy gửi yêu cầu để chúng tôi đối soát.",
      "hint": "Mã giao dịch, số tiền, thời điểm thanh toán và ảnh chụp biên lai/biến động số dư."
    },
    {
      "q": "Tôi bị trừ tiền hai lần cho cùng một khóa học",
      "a": "Hãy giữ lại cả hai biên lai và gửi yêu cầu. Chúng tôi sẽ đối soát và hoàn lại khoản thanh toán trùng nếu đúng như bạn mô tả.",
      "hint": "Hai mã giao dịch, số tiền từng lần, thời điểm và ảnh biến động số dư."
    },
    {
      "q": "Thanh toán thất bại hoặc mã QR hết hạn",
      "a": "Mã QR thanh toán chỉ có hiệu lực trong thời gian ngắn; hãy quay lại giỏ hàng để tạo mã mới. Nếu tiền đã bị trừ mà đơn vẫn thất bại, hãy gửi yêu cầu kèm biên lai.",
      "hint": "Khóa học muốn mua, thời điểm thanh toán và ảnh biên lai (nếu đã bị trừ tiền)."
    },
    {
      "q": "Tôi muốn được hoàn tiền",
      "a": "Xem Chính sách hoàn tiền, sau đó gửi khiếu nại tại mục Yêu cầu hoàn tiền trong menu tài khoản của bạn (kèm lý do và minh chứng). Yêu cầu hoàn tiền được xử lý riêng ở mục đó.",
      "hint": "Khóa học, mã giao dịch và lý do bạn muốn hoàn tiền."
    },
    {
      "q": "Tôi chưa nhận được tiền hoàn",
      "a": "Thời gian tiền về tài khoản phụ thuộc ngân hàng. Nếu đã quá thời hạn dự kiến, hãy mở lại khiếu nại tại mục Yêu cầu hoàn tiền (chỉ mở lại được trong thời hạn cho phép) hoặc gửi yêu cầu tại đây.",
      "hint": "Mã khiếu nại/giao dịch, ngày được xác nhận hoàn tiền và số tài khoản nhận (che bớt số)."
    },
    {
      "q": "Mã giảm giá không áp dụng được",
      "a": "Mã có thể hết hạn, hết lượt dùng hoặc không áp dụng cho khóa học/gói bạn chọn. Kiểm tra điều kiện của mã; nếu vẫn lỗi hãy gửi yêu cầu kèm tên mã.",
      "hint": "Tên mã giảm giá, khóa học/gói bạn mua và thông báo lỗi."
    },
    {
      "q": "Tôi cần hóa đơn hoặc biên lai thanh toán",
      "a": "Hãy gửi yêu cầu kèm thông tin cần xuất hóa đơn để được hỗ trợ.",
      "hint": "Mã giao dịch, họ tên/đơn vị và thông tin cần ghi trên hóa đơn."
    }
  ],
  "COURSE": [
    {
      "q": "Tôi không vào được khóa học đã đăng ký",
      "a": "Đăng xuất rồi đăng nhập lại và kiểm tra mục Khóa học của tôi. Nếu khóa học vẫn không xuất hiện hoặc không mở được, hãy gửi yêu cầu.",
      "hint": "Tên khóa học, thời điểm đăng ký và thông báo lỗi."
    },
    {
      "q": "Video bài học không phát",
      "a": "Kiểm tra kết nối mạng, tải lại trang hoặc thử trình duyệt khác. Nếu vẫn lỗi, hãy gửi yêu cầu kèm tên bài học và ảnh chụp màn hình.",
      "hint": "Tên khóa học, tên bài học, trình duyệt/thiết bị và ảnh chụp màn hình."
    },
    {
      "q": "Tài liệu bài học không tải được",
      "a": "Thử tải lại trang hoặc tải bằng trình duyệt khác. Nếu file vẫn lỗi, hãy gửi yêu cầu để chúng tôi kiểm tra tệp.",
      "hint": "Tên khóa học, tên bài học và tên tài liệu."
    },
    {
      "q": "Nội dung khóa học bị sai, thiếu hoặc lỗi thời",
      "a": "Hãy gửi yêu cầu mô tả đúng chỗ sai, chúng tôi sẽ chuyển cho giảng viên và đội kiểm duyệt. Bạn cũng có thể đặt câu hỏi trong mục Hỏi đáp của bài học.",
      "hint": "Tên khóa học, bài học, vị trí (mốc thời gian video) và nội dung bị sai."
    },
    {
      "q": "Tiến độ học của tôi không được cập nhật",
      "a": "Tiến độ được ghi khi bạn xem hết bài; thử tải lại trang sau khi học. Nếu vẫn thiếu, hãy gửi yêu cầu để chúng tôi kiểm tra.",
      "hint": "Tên khóa học, các bài đã học nhưng chưa được tính và ảnh chụp tiến độ."
    },
    {
      "q": "Khóa học tôi đã mua bị gỡ hoặc không còn truy cập được",
      "a": "Khóa học có thể bị ẩn tạm thời để chỉnh sửa hoặc kiểm duyệt. Hãy gửi yêu cầu để chúng tôi xác nhận tình trạng và quyền truy cập của bạn.",
      "hint": "Tên khóa học, mã giao dịch và thời điểm bạn thấy khóa học biến mất."
    }
  ],
  "LEARNING": [
    {
      "q": "Quiz chấm điểm sai hoặc đáp án chưa đúng",
      "a": "Hãy gửi yêu cầu nêu rõ câu hỏi bạn cho là sai, chúng tôi sẽ chuyển cho giảng viên xem xét lại đáp án.",
      "hint": "Tên quiz, số câu, đáp án bạn chọn và lý do bạn cho là chấm sai."
    },
    {
      "q": "Tôi không làm lại được quiz hoặc mất kết quả",
      "a": "Một số quiz giới hạn số lần làm. Nếu kết quả bị mất bất thường, hãy gửi yêu cầu để chúng tôi kiểm tra lịch sử làm bài.",
      "hint": "Tên quiz, thời điểm làm bài và thông báo bạn thấy."
    },
    {
      "q": "Flashcard không đồng bộ hoặc lỗi ôn tập",
      "a": "Tải lại trang hoặc đăng nhập lại để đồng bộ. Nếu thẻ ôn tập vẫn sai lịch hoặc mất, hãy gửi yêu cầu.",
      "hint": "Tên bộ flashcard, thiết bị đang dùng và mô tả lỗi."
    },
    {
      "q": "Học liệu AI tạo ra (quiz/flashcard/sơ đồ tư duy) bị lỗi hoặc trống",
      "a": "Thử tạo lại sau ít phút. Nếu vẫn lỗi hoặc nội dung sai lệch, hãy gửi yêu cầu kèm bài học bạn dùng để tạo.",
      "hint": "Loại học liệu, bài học nguồn và ảnh chụp màn hình lỗi."
    },
    {
      "q": "Chuỗi ngày học (streak) bị mất hoặc tính sai",
      "a": "Chuỗi được tính theo ngày bạn hoàn thành bài học hoặc quiz. Nếu bạn đã học mà chuỗi vẫn bị ngắt, hãy gửi yêu cầu.",
      "hint": "Các ngày bạn đã học, chuỗi hiện tại và ảnh chụp màn hình."
    },
    {
      "q": "Bài tập đã nộp nhưng không thấy điểm hoặc không nộp được",
      "a": "Kiểm tra dung lượng và định dạng tệp, thử nộp lại. Nếu bài đã nộp mà không hiện hoặc chưa có điểm lâu, hãy gửi yêu cầu.",
      "hint": "Tên khóa học, tên bài tập, thời điểm nộp và tên tệp."
    }
  ],
  "AI_FEATURES": [
    {
      "q": "AI Tutor trả lời sai hoặc không phù hợp",
      "a": "AI có thể nhầm lẫn; hãy đối chiếu với bài giảng. Nếu câu trả lời sai nghiêm trọng hoặc không phù hợp, hãy gửi yêu cầu kèm đoạn hội thoại để chúng tôi cải thiện.",
      "hint": "Bài học, câu hỏi bạn hỏi và câu trả lời của AI (hoặc ảnh chụp màn hình)."
    },
    {
      "q": "AI báo lỗi hoặc không phản hồi",
      "a": "Thử lại sau ít phút. Nếu lỗi kéo dài, hãy gửi yêu cầu kèm thông báo lỗi để đội kỹ thuật kiểm tra.",
      "hint": "Tính năng AI đang dùng, thời điểm lỗi và thông báo hiển thị."
    },
    {
      "q": "Tôi bị khóa quyền dùng AI",
      "a": "Quyền dùng AI có thể bị khóa khi tài khoản bị gắn cờ vi phạm hoặc spam. Hãy gửi yêu cầu kèm email tài khoản để được xem xét.",
      "hint": "Email tài khoản và thông báo bạn thấy khi dùng AI."
    },
    {
      "q": "Lộ trình học AI không hợp lý hoặc không tạo được",
      "a": "Cập nhật mục tiêu và thời gian học rồi tạo lại. Nếu lộ trình vẫn sai lệch hoặc không tạo được, hãy gửi yêu cầu.",
      "hint": "Mục tiêu học bạn nhập, khóa học liên quan và ảnh chụp lộ trình."
    },
    {
      "q": "Đánh giá hoặc bình luận của tôi bị bộ lọc AI chặn nhầm",
      "a": "Bộ lọc tự động có thể chặn nhầm nội dung bình thường. Hãy gửi yêu cầu kèm nội dung bạn đã đăng để chúng tôi xem lại.",
      "hint": "Nội dung bạn đã đăng, nơi đăng (khóa học/bài học) và thời điểm."
    },
    {
      "q": "Lồng tiếng hoặc phụ đề AI sai, lệch tiếng",
      "a": "Hãy gửi yêu cầu nêu bài học, ngôn ngữ và mốc thời gian bị sai để chúng tôi chuyển cho đội xử lý lồng tiếng.",
      "hint": "Bài học, ngôn ngữ và mốc thời gian video bị sai."
    }
  ],
  "EXAM": [
    {
      "q": "Camera không bật khi làm bài thi",
      "a": "Cho phép trình duyệt truy cập camera và micro, đóng các ứng dụng khác đang dùng camera rồi tải lại trang. Trên điện thoại, bạn có thể thử làm bài bằng máy tính hoặc ứng dụng di động.",
      "hint": "Thiết bị, trình duyệt và thông báo lỗi camera."
    },
    {
      "q": "Bài thi bị treo hoặc mất kết nối khi đang làm",
      "a": "Giữ nguyên trang và kiểm tra mạng, đừng tải lại liên tục. Hãy gửi yêu cầu ngay kèm thời điểm xảy ra để chúng tôi ghi nhận sự cố với giảng viên.",
      "hint": "Tên bài thi, thời điểm treo/mất kết nối và ảnh chụp màn hình."
    },
    {
      "q": "Nộp bài thi không thành công",
      "a": "Không đóng trang. Chờ khoảng 1 phút; nếu vẫn treo hãy chụp màn hình và gửi yêu cầu ngay để bài làm của bạn được kiểm tra.",
      "hint": "Tên bài thi, thời điểm bấm nộp và ảnh chụp màn hình."
    },
    {
      "q": "Tôi bị báo vi phạm giám sát nhầm",
      "a": "Hệ thống giám sát có thể nhận diện sai (ánh sáng yếu, người khác đi ngang...). Hãy gửi yêu cầu kèm bối cảnh để giảng viên và quản trị viên xem lại.",
      "hint": "Tên bài thi, thời điểm bị báo vi phạm và hoàn cảnh lúc đó."
    },
    {
      "q": "Điểm bài thi không đúng hoặc chưa có kết quả",
      "a": "Một số bài cần giảng viên chấm nên kết quả có thể chưa hiện ngay. Nếu đã quá thời hạn dự kiến hoặc điểm có vẻ sai, hãy gửi yêu cầu.",
      "hint": "Tên bài thi, thời điểm nộp và điểm bạn mong đợi."
    },
    {
      "q": "Làm bài thi trên điện thoại bị lỗi",
      "a": "Trình duyệt trên điện thoại có thể hạn chế camera hoặc ghi hình. Hãy thử làm bài bằng máy tính hoặc ứng dụng di động của LinguaLearn.",
      "hint": "Hãng/đời điện thoại, trình duyệt và mô tả lỗi."
    }
  ],
  "CERTIFICATE": [
    {
      "q": "Tôi hoàn thành khóa học nhưng chưa thấy chứng chỉ",
      "a": "Gửi yêu cầu kèm tên khóa học để quản trị viên kiểm tra tiến độ và điều kiện cấp chứng chỉ của bạn.",
      "hint": "Tên khóa học, thời điểm hoàn thành và ảnh chụp tiến độ học."
    },
    {
      "q": "Tên trên chứng chỉ bị sai",
      "a": "Chứng chỉ in họ tên theo hồ sơ. Hãy cập nhật họ tên trong Cài đặt tài khoản hoặc gửi yêu cầu để chúng tôi cấp lại bản đúng tên.",
      "hint": "Họ tên đúng, họ tên đang in trên chứng chỉ và tên khóa học."
    },
    {
      "q": "Mã xác minh chứng chỉ không dùng được",
      "a": "Kiểm tra lại mã (phân biệt chữ hoa/thường) và đường dẫn xác minh. Nếu vẫn không xác minh được, hãy gửi yêu cầu kèm mã chứng chỉ.",
      "hint": "Mã chứng chỉ và đường dẫn/ảnh chụp trang xác minh."
    },
    {
      "q": "Không tải được file PDF chứng chỉ",
      "a": "Thử tải lại trang hoặc dùng trình duyệt khác. Nếu vẫn lỗi, hãy gửi yêu cầu kèm tên khóa học.",
      "hint": "Tên khóa học, trình duyệt/thiết bị và thông báo lỗi."
    }
  ],
  "COMMUNITY": [
    {
      "q": "Tôi muốn báo cáo nội dung vi phạm",
      "a": "Hãy gửi yêu cầu kèm đường dẫn hoặc ảnh chụp nội dung vi phạm (bình luận, câu hỏi, tin nhắn, khóa học). Đội kiểm duyệt sẽ xem xét và xử lý.",
      "hint": "Đường dẫn/ảnh chụp nội dung, tên người đăng và lý do bạn cho là vi phạm."
    },
    {
      "q": "Tôi bị quấy rối hoặc nhận tin nhắn spam",
      "a": "Hãy chụp lại các tin nhắn và gửi yêu cầu. Chúng tôi sẽ xem xét và có thể xử lý tài khoản vi phạm.",
      "hint": "Tên/email người gửi, ảnh chụp tin nhắn và thời điểm."
    },
    {
      "q": "Đánh giá của tôi bị ẩn hoặc bị từ chối",
      "a": "Đánh giá có thể bị ẩn nếu vi phạm quy tắc nội dung hoặc bị bộ lọc tự động chặn. Hãy gửi yêu cầu kèm nội dung bạn đã viết để xem xét lại.",
      "hint": "Khóa học, nội dung đánh giá và thời điểm đăng."
    },
    {
      "q": "Câu hỏi của tôi chưa được giảng viên trả lời",
      "a": "Giảng viên cần thời gian để phản hồi. Nếu câu hỏi tồn đọng quá lâu, hãy gửi yêu cầu kèm đường dẫn câu hỏi.",
      "hint": "Khóa học, bài học và nội dung câu hỏi."
    },
    {
      "q": "Tôi không nhắn tin được với giảng viên",
      "a": "Bạn chỉ nhắn được giảng viên của khóa học bạn đang theo học. Nếu đã đủ điều kiện mà vẫn lỗi, hãy gửi yêu cầu.",
      "hint": "Tên giảng viên, khóa học và thông báo lỗi."
    }
  ],
  "LIVE": [
    {
      "q": "Tôi không vào được buổi học trực tiếp",
      "a": "Kiểm tra bạn đã đăng nhập và có quyền xem buổi live, rồi tải lại trang. Nếu vẫn không vào được, hãy gửi yêu cầu kèm tên buổi live.",
      "hint": "Tên buổi live, giờ bắt đầu, thiết bị và thông báo lỗi."
    },
    {
      "q": "Bị mất hình hoặc mất tiếng khi đang học live",
      "a": "Kiểm tra mạng, tải lại trang và thử trình duyệt khác. Nếu lỗi lặp lại, hãy gửi yêu cầu kèm thời điểm xảy ra.",
      "hint": "Tên buổi live, thời điểm mất hình/tiếng, mạng và thiết bị."
    },
    {
      "q": "Phụ đề dịch thời gian thực sai hoặc không hiện",
      "a": "Chọn lại ngôn ngữ phụ đề trong buổi live. Nếu phụ đề vẫn sai hoặc không xuất hiện, hãy gửi yêu cầu.",
      "hint": "Tên buổi live, ngôn ngữ bạn chọn và thời điểm gặp lỗi."
    },
    {
      "q": "Buổi live bị hủy hoặc đổi giờ",
      "a": "Giảng viên có thể thay đổi lịch buổi live. Nếu bạn không nhận được thông báo hoặc cần được hỗ trợ, hãy gửi yêu cầu.",
      "hint": "Tên buổi live, khóa học và lịch bạn đã thấy."
    }
  ],
  "INSTRUCTOR": [
    {
      "q": "Khóa học của tôi bị từ chối duyệt",
      "a": "Lý do từ chối hiển thị ở trang quản lý khóa học của bạn. Chỉnh sửa theo góp ý rồi gửi duyệt lại; nếu cần làm rõ, hãy gửi yêu cầu.",
      "hint": "Tên khóa học và phần góp ý/lý do từ chối bạn thấy."
    },
    {
      "q": "Khóa học của tôi chờ duyệt quá lâu",
      "a": "Thời gian duyệt phụ thuộc số lượng khóa học đang chờ. Nếu đã chờ lâu bất thường, hãy gửi yêu cầu kèm tên khóa học.",
      "hint": "Tên khóa học và ngày bạn gửi duyệt."
    },
    {
      "q": "Doanh thu hoặc thanh toán cho giảng viên không đúng",
      "a": "Hãy gửi yêu cầu nêu kỳ và khoản bạn thấy chưa đúng để chúng tôi đối soát.",
      "hint": "Kỳ thanh toán, khóa học liên quan, số tiền bạn mong đợi và số đang hiển thị."
    },
    {
      "q": "Tôi không tải được video hoặc tài liệu lên",
      "a": "Kiểm tra dung lượng, định dạng và kết nối mạng, rồi thử lại. Nếu vẫn lỗi, hãy gửi yêu cầu kèm tên tệp.",
      "hint": "Tên tệp, dung lượng, định dạng và thông báo lỗi."
    },
    {
      "q": "Khóa học hoặc nội dung của tôi bị báo cáo",
      "a": "Hãy gửi yêu cầu để cung cấp thêm thông tin và giải trình; đội kiểm duyệt sẽ xem xét công bằng.",
      "hint": "Tên khóa học, nội dung bị báo cáo và giải trình của bạn."
    },
    {
      "q": "Tôi muốn trở thành giảng viên",
      "a": "Vào mục Trở thành Giảng viên trong menu tài khoản và hoàn tất đăng ký. Nếu gặp lỗi hoặc cần hỗ trợ, hãy gửi yêu cầu.",
      "hint": "Email tài khoản và bước bạn gặp khó khăn."
    }
  ],
  "PRIVACY": [
    {
      "q": "Tôi muốn xóa tài khoản và dữ liệu của mình",
      "a": "Hãy gửi yêu cầu từ email của tài khoản. Chúng tôi sẽ xác minh danh tính trước khi xử lý và thông báo kết quả qua email.",
      "hint": "Email tài khoản và phạm vi dữ liệu bạn muốn xóa."
    },
    {
      "q": "Tôi muốn nhận bản sao dữ liệu cá nhân",
      "a": "Hãy gửi yêu cầu từ email tài khoản nêu loại dữ liệu cần xuất. Chúng tôi sẽ xác minh và phản hồi qua email.",
      "hint": "Email tài khoản và loại dữ liệu bạn cần."
    },
    {
      "q": "Hồ sơ công khai hiển thị thông tin tôi không muốn",
      "a": "Vào Cài đặt tài khoản để tắt hiển thị khóa học hoặc danh sách yêu thích trên hồ sơ công khai. Nếu thông tin vẫn lộ, hãy gửi yêu cầu.",
      "hint": "Đường dẫn hồ sơ công khai và thông tin đang hiển thị ngoài ý muốn."
    },
    {
      "q": "Tôi nghi ngờ tài khoản bị xâm nhập hoặc lộ thông tin",
      "a": "Đổi mật khẩu ngay và đăng xuất khỏi mọi thiết bị khác trong Cài đặt tài khoản, sau đó gửi yêu cầu để chúng tôi kiểm tra hoạt động bất thường.",
      "hint": "Dấu hiệu bất thường, thời điểm phát hiện và thiết bị/địa chỉ IP lạ (nếu có)."
    }
  ],
  "TECHNICAL": [
    {
      "q": "Trang web báo lỗi, trắng trang hoặc tải rất chậm",
      "a": "Tải lại trang, xóa bộ nhớ đệm hoặc đổi trình duyệt. Nếu vẫn lỗi, hãy gửi yêu cầu kèm đường dẫn trang và ảnh chụp màn hình.",
      "hint": "Đường dẫn trang, trình duyệt/thiết bị và ảnh chụp màn hình."
    },
    {
      "q": "Ứng dụng di động bị lỗi hoặc đóng đột ngột",
      "a": "Cập nhật Expo Go/ứng dụng lên bản mới nhất và đăng nhập lại. Nếu vẫn lỗi, hãy gửi yêu cầu kèm thiết bị và màn hình xảy ra lỗi.",
      "hint": "Hãng/đời điện thoại, phiên bản hệ điều hành và màn hình gặp lỗi."
    },
    {
      "q": "Tôi không nhận được thông báo hoặc email",
      "a": "Kiểm tra thư mục Spam và quyền thông báo của trình duyệt/ứng dụng. Nếu vẫn không nhận được, hãy gửi yêu cầu kèm email tài khoản.",
      "hint": "Email tài khoản, loại thông báo thiếu và thời điểm."
    },
    {
      "q": "Giao diện hiển thị sai trên thiết bị hoặc trình duyệt của tôi",
      "a": "Hãy gửi yêu cầu kèm ảnh chụp màn hình, thiết bị và trình duyệt để chúng tôi tái hiện lỗi.",
      "hint": "Thiết bị, hệ điều hành, trình duyệt, kích thước màn hình và ảnh chụp."
    },
    {
      "q": "Nội dung giao diện bị sai ngôn ngữ hoặc bản dịch",
      "a": "Hãy gửi yêu cầu nêu màn hình và đoạn chữ bị sai để chúng tôi chỉnh lại bản dịch.",
      "hint": "Ngôn ngữ đang chọn, màn hình và đoạn chữ bị sai."
    }
  ],
  "OTHER": [
    {
      "q": "Tôi muốn góp ý về tính năng hoặc trải nghiệm",
      "a": "Chúng tôi trân trọng mọi góp ý. Hãy gửi yêu cầu mô tả điều bạn muốn cải thiện.",
      "hint": "Màn hình/tính năng liên quan và điều bạn mong muốn."
    },
    {
      "q": "Tôi muốn hợp tác hoặc liên hệ về kinh doanh",
      "a": "Hãy gửi yêu cầu kèm thông tin đơn vị và nội dung hợp tác, chúng tôi sẽ phản hồi qua email.",
      "hint": "Tên đơn vị, người liên hệ và đề xuất hợp tác."
    },
    {
      "q": "Vấn đề của tôi không thuộc nhóm nào ở trên",
      "a": "Hãy gửi yêu cầu và mô tả rõ vấn đề của bạn, đội ngũ sẽ phản hồi qua email.",
      "hint": "Mô tả chi tiết vấn đề, thời điểm và ảnh chụp màn hình (nếu có)."
    }
  ]
};
