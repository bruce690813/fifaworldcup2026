歐洲五大聯賽球隊陣容資料（v2.68）

檔案
- premier_league_2026_27.js：英超 20 隊
- laliga_2026_27.js：西甲 20 隊
- bundesliga_2026_27.js：德甲 18 隊
- ligue1_2026_27.js：法甲 18 隊
- serie_a_2026_27.js：義甲 20 隊
- top5_squad_manifest.json：資料結構與數量檢查摘要

運作方式
1. 每個檔案先保存聯賽、球隊、中文／英文名稱、官方網站、來源端點、核對日期與別名。
2. 使用者點選球隊時，網站透過 ESPN public roster endpoint 即時取得球員姓名、背號與位置。
3. 取得後暫存在瀏覽器 localStorage 12 小時，避免重複請求。
4. 畫面會顯示資料狀態、來源與核對時間。
5. 2026/27 季前轉會與背號仍可能變動，因此 dataStatus 使用 live-provisional。

資料格式重點
- clubId：球隊固定識別值
- nameZh／nameEn：繁中與英文名稱
- officialUrl：球隊官網（Logo 點擊連結）
- espnAliases：用來比對 ESPN 球隊名稱
- source：聯賽代碼、球隊清單端點與陣容端點模板
- players：可放入靜態快照；目前預設由即時端點載入
