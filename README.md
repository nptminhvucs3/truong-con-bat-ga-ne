# Trường Con Bắt Gà

```
npm install
npm run dev        # chạy thử
npm run build      # kiểm tra TypeScript + build
```

- Ảnh nhân vật: `public/assets/characters/truong-con/truong-con.png` (nền trong suốt; thay file này để đổi ảnh).
- Thông số gameplay: `src/game/config/gameConfig.ts` (tốc độ, bán kính hoảng loạn của gà, xác suất chuyển sang lùa con khác sau khi bắt hụt...).
- Âm thanh: mặc định dùng âm thanh tự tổng hợp bằng code (không bản quyền). Muốn dùng âm thanh riêng, bỏ file vào
  `src/assets/audio/<sự kiện>/` (xem `src/assets/audio/README.txt`), nhiều file thì chọn ngẫu nhiên.

## Lớp học
Ở màn hình chính chọn lớp, thêm/đổi tên/xóa lớp. Danh sách tên tự lưu theo từng lớp trong trình duyệt (LocalStorage).
Nút **Sao lưu / Khôi phục** để chép danh sách sang máy hoặc trình duyệt khác.

## Animation chạy/đi riêng
Xem hướng dẫn trong `src/game/config/tcAnimConfig.ts`.
