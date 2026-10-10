# Random Class

Website mini-game tĩnh cho lớp học, xây dựng bằng HTML, CSS và JavaScript thuần. Không cần framework, backend hay bước build.

## Chạy website

- **Mở trực tiếp:** mở `index.html` trong trình duyệt. JavaScript dùng các script classic nạp theo thứ tự nên không cần cấu hình CORS cho ES modules.
- **Chạy qua máy chủ tĩnh (khuyến nghị):** trong thư mục dự án chạy `py -m http.server 8000`, sau đó mở `http://localhost:8000`.
- Có thể triển khai toàn bộ thư mục lên GitHub Pages, Netlify hoặc hosting tĩnh tương đương.
- Bản phát hành GitHub Pages được chuẩn bị tại `https://phamquy0226.github.io/random-class/`; mỗi lần push lên nhánh `main` sẽ chạy workflow `.github/workflows/deploy-pages.yml`. Repository cần được tạo dưới tài khoản `phamquy0226`, bật GitHub Pages dùng GitHub Actions và workflow phải chạy thành công trước khi URL công khai hoạt động.

## Chức năng hiện có

- Trang chủ responsive và điều hướng Trang chủ, Trò chơi, Danh sách lớp, Lịch sử.
- Danh sách lớp chỉ lưu tạm trong bộ nhớ phiên website. Dán nhiều tên, mỗi dòng một tên; danh sách được dùng chung ngay trong các trò chơi và tự xóa khi đóng hoặc tải lại trang.
- Có thể sửa trực tiếp hoặc xóa từng tên; xóa toàn bộ có xác nhận. Không có chức năng thêm từng học sinh.
- Tên trùng hoặc tên dài hơn 80 ký tự bị từ chối toàn bộ để tránh nhập dở dang.
- Vòng xoay may mắn hiển thị các phần bằng nhau theo danh sách lớp, cho chọn thời lượng quay 3, 5, 8 hoặc 10 giây, chọn kết quả trước animation giảm tốc, có nút bắt đầu/chơi lại/đặt lại, hiệu ứng chúc mừng và âm thanh có thể bật tắt.
- Thêm nhiều học sinh trực tiếp ở màn hình Vòng xoay; thay đổi được dùng chung tạm thời trên toàn ứng dụng.
- Hộp quà bí ẩn cho phép dán nhiều tên trực tiếp trong trò chơi vào danh sách lớp dùng chung, đồng thời hiển thị danh sách học sinh hiện có ngay tại màn chơi, rồi tạo một hộp cho mỗi học sinh. Các hộp tự chạy liên tục trên hai làn băng chuyền để lần lượt hiển thị toàn bộ hộp mà không cần cuộn. Kết quả được phân vào hộp trước animation; mở hộp sẽ hiện popup chúc mừng, có thể mở nhiều hộp, bật/tắt chế độ mỗi học sinh chỉ xuất hiện một lần, phát âm thanh tùy chọn và bắt đầu lại hoặc đặt lại lượt chơi.
- Thẻ lật 3D cho phép thêm nhiều học sinh ngay trong trò chơi, hiển thị danh sách tham gia dùng chung, tạo một thẻ cho mỗi học sinh và phân tên trước khi lật; hỗ trợ lật từng thẻ hoặc chọn ngẫu nhiên một thẻ đang úp, úp lại toàn bộ, chơi lại, đặt lại, âm thanh và chế độ không lặp giữa các thẻ.
- Máy xổ số Slot Machine cho phép thêm nhiều học sinh trực tiếp và hiển thị danh sách tham gia dùng chung; máy quay ba dải tên theo chiều dọc và dừng đồng bộ ở học sinh đã chọn trước animation, hỗ trợ quay tiếp, chế độ không lặp trong phiên, đặt lại, âm thanh có thể bật tắt và lịch sử kết quả.
- Thẻ cào dùng Canvas để cào bằng chuột hoặc cảm ứng, tên đã chọn nằm dưới lớp phủ và hiện dần theo vùng được cào; thẻ tự mở khi cào đủ hoặc mở bằng nút, không bật popup kết quả, hỗ trợ chế độ không lặp, chơi tiếp, đặt lại, âm thanh tùy chọn và lịch sử.
- Chia nhóm tự động trộn danh sách học sinh rồi chia cân bằng theo số nhóm hoặc số thành viên mỗi nhóm; hỗ trợ kéo thả và menu chọn nhóm cho từng học sinh, xáo trộn lại, đặt lại, xuất CSV, lưu cấu hình và âm thanh tùy chọn. Mỗi học sinh chỉ được phân vào một nhóm trong mỗi lượt.
- Bật chế độ không lặp để không chọn lại học sinh đã trúng trong phiên; khi hết lượt, nhấn Đặt lại để bắt đầu phiên mới. Vòng xoay báo lỗi dữ liệu rỗng, tên trùng hoặc tên không hợp lệ.
- Lịch sử kết quả lưu trên thiết bị và có thể xóa sau xác nhận.
- Các trang tĩnh riêng cho Giới thiệu, Liên hệ, Chính sách quyền riêng tư và Điều khoản sử dụng; nội dung quyền riêng tư/điều khoản mô tả trạng thái hiện tại và cần chủ website rà soát trước khi công bố thương mại.
- Vị trí quảng cáo dự kiến nằm ngoài màn hình chơi, mặc định tắt. Cấu hình ở `src/js/site-config.js` chỉ điều khiển hiển thị chỗ dành trước, không tải quảng cáo hoặc tích hợp nhà cung cấp.
- Favicon SVG tự tạo, metadata mô tả/Open Graph cơ bản, trang dùng system font để không cần yêu cầu phông chữ bên thứ ba, và `robots.txt` cho crawler.

## Cấu trúc

```text
index.html
about.html
contact.html
privacy.html
terms.html
legal-pages.css
robots.txt
assets/
  favicon.svg
src/
  css/
    base.css
    layout.css
    components.css
    games.css
    presentation.css
  js/
    app.js
    data-manager.js
    history-manager.js
    random-engine.js
    storage.js
    site-config.js
    ad-slots.js
    games/
      wheel.js
      mystery-box.js
      flip-card.js
      slot-machine.js
      scratch-card.js
      team-generator.js
```

Từng lớp nền tảng là một script độc lập được gắn vào `window.RandomClass`; thứ tự nạp script trong `index.html` thể hiện quan hệ phụ thuộc. Lựa chọn này giữ trang dễ chạy từ `file://` lẫn hosting tĩnh.

## Chuẩn bị phát hành và doanh thu

- Các chức năng random hiện tại không phụ thuộc đăng nhập hay gói trả phí. Không có API key, dịch vụ thanh toán, tài khoản, đồng bộ đám mây, analytics hay SDK quảng cáo trong frontend.
- Để bật chỗ dành trước cho quảng cáo ở trang chủ hoặc danh sách trò chơi, chỉnh `ads.showReservedSlots` và cờ tương ứng trong `ads.placements` tại `src/js/site-config.js`. Các vùng này chỉ hiện nhãn thông báo vị trí dự kiến; chưa kết nối nhà cung cấp và không phải quảng cáo thực.
- Các trang Giới thiệu, Liên hệ, Quyền riêng tư và Điều khoản là bản nền ban đầu. Chủ website cần thêm kênh liên hệ thật và rà soát pháp lý, thông tin đơn vị vận hành, hosting, khu vực phục vụ, yêu cầu về trẻ em và mọi nhà cung cấp bên thứ ba trước khi phát hành.
- `index.html` và các trang thông tin có metadata Open Graph, canonical URL và sitemap cho GitHub Pages tại `https://phamquy0226.github.io/random-class/`. Nếu đổi tài khoản, repository hoặc nền tảng hosting, phải cập nhật đồng bộ các URL tuyệt đối này.
- Website hiện là frontend tĩnh. Nếu sau này cần tài khoản, trả phí hoặc đồng bộ, cần thiết kế backend/API có xác thực và quyền truy cập phù hợp; không đặt bí mật, khóa API riêng tư hay quyền kiểm soát thanh toán trong mã nguồn frontend. Danh sách học sinh không được dùng cho quảng cáo nếu chưa có cơ sở pháp lý phù hợp.
- Không có tuyên bố về việc được phê duyệt bởi nền tảng quảng cáo. Việc đăng ký/kiểm duyệt, thông báo đồng ý và cấu hình quảng cáo cần được xử lý riêng trước khi tích hợp quảng cáo thật.

## Dữ liệu và riêng tư

Danh sách học sinh chỉ tồn tại trong bộ nhớ của phiên website và không được lưu vào `localStorage` hay tệp; danh sách cũng bị xóa khi đóng hoặc tải lại trang. Lịch sử kết quả vẫn được lưu trong `localStorage` của trình duyệt hiện tại dưới khóa `random-class-state-v1`. Dữ liệu không được gửi lên máy chủ.
Riêng **Chia nhóm tự động** lưu lựa chọn kiểu chia, số nhóm/thành viên và trạng thái âm thanh trong `localStorage`; cấu hình không lưu tên học sinh.

## Kiểm tra thủ công

1. Dán nhiều tên (mỗi dòng một tên) trong **Danh sách lớp**; kiểm tra tên xuất hiện ngay trên Vòng xoay, có thể sửa/xóa, không có nút thêm riêng lẻ và tên trùng bị từ chối.
2. Khi đang ở **Danh sách lớp**, điều hướng sang trò chơi và xác nhận danh sách vẫn dùng được. Tải lại trang để xác nhận tên học sinh đã bị xóa và không được khôi phục từ bộ nhớ trình duyệt.
3. Chơi **Vòng xoay may mắn** với một hoặc nhiều học sinh; thử thời lượng 3, 5, 8 và 10 giây, xác nhận kim dừng đúng người được công bố.
4. Dán nhiều tên trực tiếp trong **Hộp quà bí ẩn**; kiểm tra danh sách lớp dùng chung được cập nhật. Bắt đầu lượt, mở nhiều hộp và xác nhận kết quả đúng với học sinh được phân trước khi mở. Kiểm tra tên trùng bị từ chối, chế độ không lặp, âm thanh, chơi lại, đặt lại và lịch sử.
5. Dán nhiều tên trực tiếp trong **Thẻ lật 3D**; kiểm tra danh sách lớp dùng chung và danh sách tham gia được cập nhật. Lật thẻ riêng lẻ và chọn ngẫu nhiên, xác nhận tên hiện đúng với kết quả được phân trước. Kiểm tra tên trùng bị từ chối, chế độ không lặp, úp lại, âm thanh, chơi lại, đặt lại và lịch sử.
6. Dán nhiều tên trực tiếp trong **Máy xổ số Slot Machine**; kiểm tra danh sách lớp dùng chung và danh sách tham gia được cập nhật. Xác nhận ba dải dừng đúng tên được thông báo. Thử tên trùng, quay tiếp, chế độ không lặp, đặt lại, âm thanh và lịch sử.
7. Dán nhiều tên trong **Thẻ cào**; xác nhận kết quả đã chọn trước khi cào, thử kéo chuột, cảm ứng, tự mở theo ngưỡng, nút Mở kết quả, tên trùng, chế độ không lặp, chơi lại, đặt lại, âm thanh và lịch sử.
8. Trong **Chia nhóm tự động**, thử chia theo số nhóm và số thành viên, sĩ số lẻ, kéo thả/chọn nhóm, xáo trộn lại, đặt lại, xuất CSV, lưu cấu hình và âm thanh.
9. Thử danh sách trống và danh sách một học sinh ở các trò chơi; bảo đảm trò chơi xử lý rõ ràng khi không có dữ liệu.
10. Mở ở chiều rộng điện thoại để kiểm tra menu, lưới hộp quà, thẻ lật, máy xổ số, thẻ cào, chia nhóm, vòng xoay và các nút điều khiển responsive.
