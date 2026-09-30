賽事指南新增「賽季時間軸」分頁，將歐洲足球從 7 月資格賽與開季、秋冬多線作戰、春季淘汰賽，到 5 月決賽與夏季大賽整理成可順向閱讀的全年脈絡。桌機與手機「全部功能」也新增直接入口，開啟後會自動定位時間軸分頁與頁首。

頁面先用六張卡分清五大聯賽、國內盃賽、超級盃、歐戰、世俱盃與歐國盃，再以七個月份節點說明典型賽季。內容涵蓋：

- 英超、西甲、義甲 20 隊；德甲、法甲 18 隊。
- 英格蘭足總盃與聯賽盃（卡拉寶盃）的差異，以及西班牙國王盃、義大利盃、德國足協盃、法國盃。
- 社區盾與各國超級盃的冠軍對決性質，並註明西班牙、義大利現行賽制可能採四隊制。
- 歐冠、歐霸、歐洲協會聯賽的層級；歐冠聯賽階段為 36 隊。
- 歐國盃是國家隊賽事，常被稱為「小世界杯」，不屬於每年俱樂部賽季。
- 32 隊世俱盃與年度洲際盃的區別。
- 傳統三冠王＝國內頂級聯賽＋主要國內盃賽＋歐冠。

資料頁保留使用者提供的 YouTube 影片連結，並附 UEFA 歐冠、歐霸、歐協會及 FIFA 世俱盃官方入口。月份採典型歐洲賽季節奏，頁面明示確切日期應以各賽事當季官方賽程為準。

驗證結果：

- `git diff --check` 通過。
- 20 份 UTF-8 JSON、5 份球隊 JavaScript、11 段內嵌 JavaScript 語法檢查通過。
- Playwright v2.179 測試通過：1920×1080、1366×768、1024×768、390×844。
- 四種尺寸皆驗證直接入口、第四分頁可見、6 張分類卡、7 個時間軸節點、三冠王內容、關閉行為與無水平溢出。
- 瀏覽器 JavaScript 錯誤為 0；受測環境封鎖的既有外部隊徽請求不計入程式錯誤。

| 尺寸 | 修改前 | 修改後 |
| --- | --- | --- |
| 桌機 1366×768 | ![修改前](https://raw.githubusercontent.com/bruce690813/fifaworldcup2026/codex/v2.179-season-timeline/artifacts/v2.179/before-season-guide-1366x768.png) | ![修改後](https://raw.githubusercontent.com/bruce690813/fifaworldcup2026/codex/v2.179-season-timeline/artifacts/v2.179/season-timeline-1366x768.png) |
| 手機 390×844 | ![修改前](https://raw.githubusercontent.com/bruce690813/fifaworldcup2026/codex/v2.179-season-timeline/artifacts/v2.179/before-season-guide-390x844.png) | ![修改後](https://raw.githubusercontent.com/bruce690813/fifaworldcup2026/codex/v2.179-season-timeline/artifacts/v2.179/season-timeline-390x844.png) |

較小螢幕使用既有 Modal 內的垂直捲動，頂部分頁列可水平捲動並會自動顯示目前分頁。回復時可 Revert 本 PR。
