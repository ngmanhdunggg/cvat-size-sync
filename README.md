# CVAT: đồng bộ kích thước cuboid theo track

Tiện ích Chrome/Edge **v1.1.2** hỗ trợ giảm thao tác chỉnh kích thước lặp lại khi annotate LiDAR 3D trong CVAT. Bản thử nghiệm, chưa phát hành trên Chrome Web Store.

Tiện ích Chrome/Edge Manifest V3. Chọn một cuboid track tại frame chuẩn rồi bấm **Đồng bộ**. Lấy chính xác ba giá trị kích thước trong dữ liệu CVAT (không làm tròn theo ô hiển thị), áp dụng vào các keyframe đã có của cùng track trong job hiện tại, kể cả keyframe outside. Không tạo keyframe ở frame tham chiếu nếu đó là frame nội suy. CVAT tự nội suy kích thước giữa các keyframe.

Không giới hạn nhãn: dùng được cho object đang chọn. Chỉ hỗ trợ cuboid **3D dạng Track**, không hỗ trợ Shape độc lập hoặc cuboid 2D.

## Cài trên Chrome

**Không cần cài Node.js, Python hay chạy lệnh để sử dụng tiện ích.**

1. [Tải ZIP của tool](https://github.com/ngmanhdunggg/cvat-size-sync/archive/refs/heads/main.zip), hoặc vào repo chọn **Code → Download ZIP**, rồi giải nén.
2. Mở `chrome://extensions`, bật **Developer mode / Chế độ dành cho nhà phát triển**.
3. Bấm **Load unpacked / Tải tiện ích đã giải nén**.
4. Chọn thư mục `cvat-size-sync-main` vừa giải nén, nơi có file `manifest.json`. Không chọn file ZIP hoặc thư mục cha chứa nó.
5. Ghim tiện ích (icon khối hộp trắng trên nền xanh) để dễ mở. Edge dùng `edge://extensions` với cùng thư mục.

Nếu đã cài bản cũ: cập nhật mã nguồn, vào `chrome://extensions`, bấm **Reload / Tải lại** ở thẻ tiện ích rồi bấm lại icon trên tab CVAT. Hoàn tất việc hoàn tác cần thiết trước khi cập nhật vì bản hoàn tác cũ có thể mất khi thay mã.

### Cài trên Microsoft Edge

Mở `edge://extensions`, bật **Developer mode**, chọn **Load unpacked** và trỏ tới thư mục có `manifest.json` như trên. Sau đó ghim tiện ích từ menu Extensions trên thanh trình duyệt.

### Nếu dùng Git

```sh
git clone https://github.com/ngmanhdunggg/cvat-size-sync.git
```

Chọn chính thư mục `cvat-size-sync` vừa clone khi bấm **Load unpacked**. Những lần cập nhật sau chạy `git pull`, rồi bấm **Reload** ở trang quản lý tiện ích.

## Sử dụng

1. Mở job 3D CVAT và dừng phát.
2. Chọn cuboid track ở frame có L/W/H chuẩn; mở khóa track nếu cần.
3. Bấm biểu tượng tiện ích trên thanh Chrome. Bảng nổi và icon khối hộp sẽ xuất hiện ở góc dưới bên phải trang CVAT. Bảng hiển thị ID, nhãn, frame và L/W/H của object đang chọn, tự cập nhật sau tối đa khoảng 0,5 giây khi chọn object khác hoặc chuyển frame. Bạn có thể tiếp tục thao tác CVAT khi bảng mở.
4. Bấm **Đồng bộ L/W/H**. Tiện ích đọc lại object đang chọn ngay lúc bấm và thực hiện, không hỏi xác nhận thêm. Kết quả báo số keyframe đã thay đổi.
5. Kiểm tra Top/Side/Front tại vài keyframe rồi bấm **Save** của CVAT.

Bấm icon nổi hoặc dấu × để thu gọn/mở bảng. Bấm lại icon trên thanh Chrome cũng bật/tắt bảng. Sau khi tải lại trang, bấm icon trên thanh Chrome để mở lại tiện ích.

**Không tự chạy đồng bộ.** Mở tiện ích, chọn object hoặc chuyển frame chỉ đọc dữ liệu. Chỉ nút **Đồng bộ L/W/H** mới áp dụng kích thước; nút **Hoàn tác** chủ động khôi phục lần đồng bộ gần nhất.

Tâm XYZ và góc xoay XYZ giữ nguyên. Khi đổi chiều cao mà giữ tâm, đáy box có thể dịch lên/xuống: hãy kiểm tra độ khớp mặt đường sau đồng bộ. Các trạng thái outside/occluded, thuộc tính, ID và track khác không được chỉnh bởi tiện ích.

## Khi không thấy object hoặc bảng tiện ích

- Không thấy icon: mở menu hình mảnh ghép trên Chrome và ghim **CVAT – Đồng bộ kích thước cuboid**.
- Chưa có bảng nổi: mở đúng tab job CVAT, chờ tải xong rồi bấm icon tiện ích trên thanh Chrome. Mở một trang mới hoặc tải lại trang sẽ cần bấm icon để bật lại.
- Bảng yêu cầu chọn track: chọn trực tiếp cuboid 3D dạng **Track**, dừng phát và mở khóa object. Tool không dùng cho Shape độc lập hoặc cuboid 2D.
- Bảng không đọc được dữ liệu sau cập nhật: kiểm tra đã tải lại tiện ích ở `chrome://extensions` và bấm lại icon trên tab CVAT. Nếu vẫn lỗi, lưu công việc đang làm bằng CVAT trước khi tải lại trang.

## Hoàn tác và phạm vi

- **Hoàn tác lần đồng bộ gần nhất** khôi phục toàn bộ keyframe đã đổi. Bản hoàn tác nằm trong bộ nhớ trang, mất khi tải lại/đóng trang; mỗi lần đồng bộ có thay đổi sẽ thay bản hoàn tác trước đó.
- Hoàn tác sẽ từ chối nếu tọa độ của một keyframe đã bị sửa sau lần đồng bộ, để tránh ghi đè thao tác mới. Undo gốc CVAT có thể hoàn tác riêng từng keyframe, không hứa hẹn một Ctrl+Z cho toàn track.
- Chỉ làm trong job hiện tại, không tự sửa các job khác cùng task. Các keyframe tạo thêm sau này không tự được đồng bộ.
- Không gửi dữ liệu tới dịch vụ bên ngoài và không gọi API lưu lên server. Thay đổi nằm trong bộ nhớ annotation của CVAT; Save hoặc cơ chế autosave sẵn có của CVAT sẽ lưu như chỉnh sửa thủ công.
- Quyền chỉ `activeTab` và `scripting`, không yêu cầu quyền truy cập mọi website thường trực. Mã chạy khi bạn mở tiện ích trên tab đang dùng.
- Cần CVAT có `window.cvatUI.registerComponent`, ObjectState.export/save và Redux action `UPDATE_ANNOTATIONS_SUCCESS` tương thích. Nếu không tương thích, tiện ích báo lỗi; chưa bảo đảm tương thích với mọi phiên bản CVAT.
- Trong lúc đang đồng bộ, chờ hoàn tất, tránh tải lại/đóng tab hoặc chỉnh cùng job từ tab khác.

## Đã kiểm tra

Yêu cầu Node.js 18 trở lên, không cần cài package:

```sh
node --test size-sync.test.cjs
```

7 kiểm thử mô phỏng đã đạt: chỉ sửa ba chiều, giới hạn job, keyframe outside, mở/đọc không ghi dữ liệu, không lọc nhãn, hỗ trợ mảng tọa độ 9/16 số và giữ dữ liệu đuôi, hoàn tác, khôi phục khi lỗi giữa chừng, từ chối ghi đè chỉnh sửa mới, cập nhật annotation mà không tải lại point cloud.

Đã kiểm tra bảng nổi trên một phiên CVAT Online thực tế: hiển thị track đang chọn, nhãn và L/W/H. Luồng ghi/hoàn tác có kiểm thử mô phỏng; chưa xác minh đầy đủ toàn bộ keyframe và dữ liệu lưu trên server của phiên Online đó.

## Thay đổi gần đây

- **1.1.2:** chỉ cập nhật annotation sau đồng bộ; bỏ tải lại toàn bộ frame/point cloud/camera. Không làm mới canvas khi kích thước đã giống nhau.
- **1.1.1:** đọc đúng cuboid 3D dùng mảng 16 số, chỉ thay các phần tử 6–8 và giữ nguyên phần còn lại.
- **1.1.0:** thêm icon và bảng nổi tự cập nhật object đang chọn.

## Cấu trúc

- `manifest.json`, `background.js`: quyền và thao tác mở tiện ích.
- `widget.js`: bảng nổi, đọc object đang chọn định kỳ; chỉ nút Đồng bộ/Hoàn tác mới gọi thao tác sửa.
- `bridge.js`: kết nối CVAT, kiểm tra track, ghi kích thước và hoàn tác.
- `size-sync.js`: lập danh sách thay đổi kích thước.
- `size-sync.test.cjs`: kiểm thử bằng fixture, không cần tài khoản CVAT.

Repo chỉ chứa mã tiện ích, icon và kiểm thử tổng hợp; không kèm point cloud, ảnh camera, annotation hoặc thông tin đăng nhập.

## Tác giả và repo đội

@ngmanhdunggg — Nguyễn Mạnh Dũng. Mã được xây dựng với hỗ trợ của Codex.

Bản lưu trong repo đội: [A-018 / source-tool / cvat-size-sync](https://github.com/AI20K-Build-Phase-Cohort-5/A-018/tree/main/source-tool/cvat-size-sync).
