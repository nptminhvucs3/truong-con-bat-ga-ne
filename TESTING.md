# Kiểm thử (Giai đoạn 5)

Thêm `?debug` vào địa chỉ (ví dụ `http://localhost:5173/?debug`) để xem dòng trạng thái ở góc trái màn chơi:
`trạng thái | số gà | lượt nồi | số lần bắt hụt | fps`.

Trong **Cài đặt** có thể ép tình huống: xác suất trốn thoát 0% hoặc 100%, xác suất bắt hụt 0 đến 90%, số lượt nồi tối đa.
Ở màn hình chính có nút **Mẫu 1 / Mẫu 5 / Mẫu 30** để điền nhanh danh sách.

| # | Tình huống | Cách thử | Kết quả mong đợi |
|---|-----------|----------|------------------|
| 1 | 1 học sinh | Mẫu 1, bắt đầu. Trốn thoát 0% | Trường Con vào sân, lùa, chộp, bỏ nồi, gà luộc, hiện tên. BẮT TIẾP thì báo "ĐÃ HOÀN THÀNH DANH SÁCH". Với trốn thoát 100%: báo "KHÔNG BẮT ĐƯỢC GÀ" sau 1 lượt |
| 2 | 5 học sinh | Mẫu 5 | Chơi bình thường, 5 con gà có tên |
| 3 | 30 học sinh | Mẫu 30 | Tên đọc được, ít chồng nhau, game vẫn mượt (xem fps với `?debug`) |
| 4 | Tất cả gà đều trốn thoát | Trốn thoát 100%, tối đa 3 lượt | Sau 3 lần gà trốn: bảng "KHÔNG BẮT ĐƯỢC GÀ"; THỬ LẠI chạy được vòng mới |
| 5 | Một con không trốn | Trốn thoát 0% | Gà luộc, bảng kết quả có đĩa gà và tên |
| 6 | Nhiều lần bắt hụt | Bắt hụt 90% | Trường Con ngã sấp nhiều lần, gà lè lưỡi, vẫn tiếp tục lùa, "Bắt hụt" trên HUD tăng |
| 7 | Tạm dừng khi đang đuổi | Bấm Tạm dừng giữa lúc đuổi | Mọi chuyển động và âm thanh đứng yên; Tiếp tục thì chạy tiếp đúng chỗ cũ |
| 8 | BẮT TIẾP | Ở bảng kết quả | Học sinh vừa gọi biến mất, vòng mới tự bắt đầu, gà cũ trốn thoát lại được chọn |
| 9 | CHƠI LẠI | Ở bảng kết quả hoặc màn hình cuối | Có hộp xác nhận; xác nhận thì đủ danh sách trở lại |
| 10 | Hết danh sách | Bắt tiếp đến khi hết | Báo "ĐÃ HOÀN THÀNH DANH SÁCH", không treo |

Kiểm tra thêm: về màn hình chính rồi vào lại, đổi cài đặt giữa chừng, thu nhỏ cửa sổ/điện thoại, danh sách có tên trùng.
