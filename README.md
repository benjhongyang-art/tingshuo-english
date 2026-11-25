# 聽說

給繁體中文使用者的英文聽力與發音練習。介面是繁體中文，練習內容是日常英文短句。不需要帳號，也不需要後端。

線上版：[https://benjhongyang-art.github.io/tingshuo-english/](https://benjhongyang-art.github.io/tingshuo-english/)。推送到 `main` 後，GitHub Actions 會建置並發佈到 GitHub Pages（倉庫設定的 Pages 來源需為 **GitHub Actions**）。

## 可以做什麼

- **聽力**：用瀏覽器朗讀英文，速度可切「慢速 / 正常」。可以用選擇題作答，或自己聽寫。答完會顯示正確句子、音標和中文意思。
- **發音**：看句子、聽示範，再按麥克風用英文說一次。語音辨識（en-US）會和目標句子比對，給出相似度，並把不一樣的字標出來。
- **四個主題**：日常問候、食物與點餐、旅行移動、工作溝通。每個主題 15 句。
- **單字閃卡**：每個主題附一組單字（英文、中文、音標、例句）。翻面自評「忘記 / 模糊 / 記得」，用 SM-2 間隔排程。首頁會顯示今天待複習的張數。
- **錯題本**：聽力答錯、發音低於 60 分，或閃卡按「忘記」，會自動收進來。可以依來源或主題瀏覽，再用聽力或發音重練。連續答對 3 次（發音需 80 分以上）會移出，也可以手動移出。
- **進度**：已練習題數、聽力正確率、發音最高分平均、連續天數，都存在這台裝置的瀏覽器（`localStorage`）。舊的練習紀錄會原樣保留。

## 環境

- Node.js 20 以上
- 聽力播放：支援 Web Speech API `speechSynthesis` 的瀏覽器
- 發音評分：請用 **Chrome** 或 **Edge**（電腦或手機皆可），並允許麥克風。Firefox、部分 iOS 瀏覽器沒有語音辨識，App 會顯示中文說明，仍可聽示範發音。

## 開發

```bash
npm install
npm run dev
```

開發伺服器是 [http://127.0.0.1:43127/tingshuo-english/](http://127.0.0.1:43127/tingshuo-english/)。本機與正式環境都掛在 `/tingshuo-english/` 底下，和 GitHub Pages 的網址一致。

## 測試與建置

```bash
npm test
npm run build
npm run preview
```

## 進度存在哪裡

練習進度的鍵名是 `tingshuo.progress.v1`。單字排程是 `tingshuo.vocab.v1`，錯題本是 `tingshuo.mistakes.v1`。想重頭開始，在瀏覽器清除這個網站的資料即可。
