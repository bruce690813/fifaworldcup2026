加拿大總教練沒有照片，3 號球員顯示 Al e JONES 且無法配對現有圖片。補入 FIFA 官方 Jesse Marsch 原圖與來源紀錄，將姓名更正為 Alfie Jones，同步內嵌及 JSON 球員／世界盃經驗索引。

FIFA 原站有教練照片：官方 API 的名稱是 Jesse Alan Marsch、Alias 為 Jesse MARSCH、ID 187150；舊版 v2.141 只匯入加拿大 26 張球員照。原圖完整保留，以人物專用 CSS 顯示上半身；不支援 object-view-box 的舊瀏覽器仍以頂端對齊顯示。

驗證：
- git diff --check 通過；20 個 UTF-8 JSON、5 個球隊 JS、11 段 inline script 語法檢查通過。
- HTTP 預覽 1920×1080、1366×768、1024×768、390×844：兩張照片 naturalWidth > 0、姓名正確，console/pageerror 為空。
- 修改範圍：index.html、球員與經驗 JSON、版本紀錄、版本斷言、加拿大教練素材與驗收紀錄。未變更其他國家資料或版面。
- 回復方式：Revert 本 PR。

前後對照（其他尺寸及教練／手機截圖位於 artifacts/v2.180）：

![Before](https://raw.githubusercontent.com/bruce690813/fifaworldcup2026/codex/v2.180-canada-portraits/artifacts/v2.180/before-1366x768.png)
![After](https://raw.githubusercontent.com/bruce690813/fifaworldcup2026/codex/v2.180-canada-portraits/artifacts/v2.180/after-1366x768.png)

相關 Playwright 回歸測試：總教練搜尋、人物紀錄面板四尺寸，2 passed。
