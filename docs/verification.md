# Biên bản kiểm thử

Thực hiện ngày **04/10/2026**, múi giờ Asia/Saigon.

## Môi trường

- Windows, Node.js 24.18.0, npm 11.16.0.
- Express 5.2.1, Supertest 7.3.1, Playwright 1.63.0 (phiên bản được khóa trong package-lock.json).
- Trình duyệt Chromium của Playwright, build 1243, Chrome 153.0.8010.12; chạy channel `chromium`.

## Kết quả thực tế

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 24/24 đạt; không skip |
| `npm run test:e2e` | 12/12 đạt; không skip; lượt cuối 31,6 giây |
| Desktop 1440 × 1080 | 4/4 bài E2E đạt |
| Tablet 768 × 1024 | 4/4 bài E2E đạt |
| Mobile 375 × 812 | 4/4 bài E2E đạt |
| `npm start` | Khởi động thành công tại http://127.0.0.1:3000, không cần `.env` |
| Audit khi `npm install` | 0 lỗ hổng trong dependency tại thời điểm cài |

Các bài E2E thực hiện luồng ví dụ và giải mã ngược cho đủ 6 thuật toán ở từng viewport; so sánh chính xác ciphertext/plaintext, kiểm tra không tràn chiều ngang toàn trang, tải TXT, clipboard, sinh khóa, chuẩn hóa tiếng Việt, validation và bỏ kết quả cũ. Response không phải JSON, mất kết nối và sửa đầu vào trong khi request đang chạy được kiểm tra bằng mô phỏng lỗi mạng có chủ đích.

Unit/integration test kiểm tra các vector chuẩn, round-trip nhiều độ dài, Rail Fence tới 10.000 ký tự/1000 rail, Caesar khóa âm/số nguyên an toàn, Playfair hàng/cột/hình chữ nhật và chữ lặp, giới hạn raw/normalized/prepared, OTP đúng độ dài, sinh hoán vị, envelope API, JSON hỏng và body quá lớn.

Ảnh chụp cuối cùng đã được xem và kiểm tra trực quan:

- [Desktop — Caesar](desktop.png)
- [Tablet — Caesar](tablet.png)
- [Mobile — Playfair giải mã](mobile.png)

Sau lần kiểm tra trực quan đầu tiên, cỡ chữ hướng dẫn và độ tương phản đã được tăng; toàn bộ 12 bài E2E được chạy lại và đạt. Các hình sử dụng dữ liệu ví dụ công khai.

## Giới hạn kiểm chứng

Đã kiểm tra Chromium; chưa kiểm tra Firefox hoặc Safari và chưa kiểm tra bằng screen reader thực tế. API không có cơ chế lưu dữ liệu và không triển khai hosting công khai. GitHub Pages không hỗ trợ backend Node.js. Việc xác minh thuật toán không đồng nghĩa với việc mật mã cổ điển đủ an toàn cho dữ liệu thực tế.
