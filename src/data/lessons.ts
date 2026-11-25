import type { Lesson } from "../types.ts"

export const lessons: Lesson[] = [
  {
    id: "greetings",
    title: "日常問候",
    blurb: "打招呼、道謝、道別",
    tone: "amber",
    items: [
      { id: "g01", en: "Hello.", zh: "你好。", ipa: "/həˈloʊ/" },
      { id: "g02", en: "Good morning.", zh: "早安。", ipa: "/ˌɡʊd ˈmɔrnɪŋ/" },
      { id: "g03", en: "Good afternoon.", zh: "午安。", ipa: "/ˌɡʊd ˌæftərˈnun/" },
      { id: "g04", en: "Good evening.", zh: "晚上好。", ipa: "/ˌɡʊd ˈivnɪŋ/" },
      { id: "g05", en: "How are you?", zh: "你好嗎？", ipa: "/ˌhaʊ ˈɑr ju/" },
      { id: "g06", en: "I'm fine, thank you.", zh: "我很好，謝謝。", ipa: "/aɪm ˈfaɪn ˌθæŋk ju/" },
      { id: "g07", en: "Nice to meet you.", zh: "很高興認識你。", ipa: "/ˌnaɪs tə ˈmit ju/" },
      { id: "g08", en: "What's your name?", zh: "你叫什麼名字？", ipa: "/ˌwʌts jər ˈneɪm/" },
      { id: "g09", en: "My name is Anna.", zh: "我的名字是安娜。", ipa: "/maɪ ˈneɪm ɪz ˈænə/" },
      { id: "g10", en: "Excuse me.", zh: "不好意思。", ipa: "/ɪkˈskjuz mi/" },
      { id: "g11", en: "Thank you very much.", zh: "非常感謝。", ipa: "/ˌθæŋk ju ˌvɛri ˈmʌtʃ/" },
      { id: "g12", en: "You're welcome.", zh: "不客氣。", ipa: "/ˌjʊr ˈwɛlkəm/" },
      { id: "g13", en: "Please.", zh: "請。", ipa: "/pliz/" },
      { id: "g14", en: "See you later.", zh: "待會見。", ipa: "/ˌsi ju ˈleɪtər/" },
      { id: "g15", en: "Have a nice day.", zh: "祝你有美好的一天。", ipa: "/ˌhæv ə ˌnaɪs ˈdeɪ/" },
    ],
  },
  {
    id: "food",
    title: "食物與點餐",
    blurb: "點飲料、點餐、結帳",
    tone: "orange",
    items: [
      { id: "f01", en: "water", zh: "水", ipa: "/ˈwɔtər/" },
      { id: "f02", en: "coffee", zh: "咖啡", ipa: "/ˈkɔfi/" },
      { id: "f03", en: "tea", zh: "茶", ipa: "/ti/" },
      { id: "f04", en: "rice", zh: "米飯", ipa: "/raɪs/" },
      { id: "f05", en: "I'd like a coffee, please.", zh: "請給我一杯咖啡。", ipa: "/aɪd ˈlaɪk ə ˈkɔfi pliz/" },
      { id: "f06", en: "One bubble tea, less ice.", zh: "一杯珍珠奶茶，少冰。", ipa: "/wʌn ˈbʌbəl ti ˌlɛs ˈaɪs/" },
      { id: "f07", en: "Can I see the menu?", zh: "可以看一下菜單嗎？", ipa: "/kən aɪ ˈsi ðə ˈmɛnju/" },
      { id: "f08", en: "How much is this?", zh: "這個多少錢？", ipa: "/ˌhaʊ ˈmʌtʃ ɪz ˈðɪs/" },
      { id: "f09", en: "I'm vegetarian.", zh: "我吃素。", ipa: "/aɪm ˌvɛdʒəˈtɛriən/" },
      { id: "f10", en: "No spicy, please.", zh: "請不要辣。", ipa: "/ˌnoʊ ˈspaɪsi pliz/" },
      { id: "f11", en: "This is delicious.", zh: "這很好吃。", ipa: "/ˈðɪs ɪz dɪˈlɪʃəs/" },
      { id: "f12", en: "A table for two.", zh: "兩位，謝謝。", ipa: "/ə ˈteɪbəl fər tu/" },
      { id: "f13", en: "The check, please.", zh: "請結帳。", ipa: "/ðə ˈtʃɛk pliz/" },
      { id: "f14", en: "Bottled water, please.", zh: "請給我瓶裝水。", ipa: "/ˈbɑtəld ˈwɔtər pliz/" },
      { id: "f15", en: "Breakfast is at eight.", zh: "早餐八點開始。", ipa: "/ˈbrɛkfəst ɪz ət eɪt/" },
    ],
  },
  {
    id: "travel",
    title: "旅行移動",
    blurb: "問路、買票、入住",
    tone: "sky",
    items: [
      { id: "t01", en: "airport", zh: "機場", ipa: "/ˈɛrpɔrt/" },
      { id: "t02", en: "hotel", zh: "飯店", ipa: "/hoʊˈtɛl/" },
      { id: "t03", en: "passport", zh: "護照", ipa: "/ˈpæspɔrt/" },
      { id: "t04", en: "Where is the station?", zh: "車站在哪裡？", ipa: "/ˌwɛr ɪz ðə ˈsteɪʃən/" },
      { id: "t05", en: "A ticket to Taipei, please.", zh: "請給我一張到台北的票。", ipa: "/ə ˈtɪkɪt tə ˌtaɪˈpeɪ pliz/" },
      { id: "t06", en: "What time does the train leave?", zh: "火車幾點開？", ipa: "/ˌwʌt ˈtaɪm dəz ðə ˈtreɪn liv/" },
      { id: "t07", en: "I need a taxi.", zh: "我需要計程車。", ipa: "/aɪ ˈnid ə ˈtæksi/" },
      { id: "t08", en: "How long does it take?", zh: "要多久？", ipa: "/ˌhaʊ ˈlɔŋ dəz ɪt ˈteɪk/" },
      { id: "t09", en: "Turn left.", zh: "左轉。", ipa: "/ˌtɝn ˈlɛft/" },
      { id: "t10", en: "Turn right.", zh: "右轉。", ipa: "/ˌtɝn ˈraɪt/" },
      { id: "t11", en: "Go straight.", zh: "直走。", ipa: "/ˌɡoʊ ˈstreɪt/" },
      { id: "t12", en: "I'm lost.", zh: "我迷路了。", ipa: "/aɪm ˈlɔst/" },
      { id: "t13", en: "Can you help me?", zh: "可以幫我嗎？", ipa: "/kən ju ˈhɛlp mi/" },
      { id: "t14", en: "Is this seat taken?", zh: "這個位子有人坐嗎？", ipa: "/ɪz ˈðɪs ˈsit ˈteɪkən/" },
      { id: "t15", en: "I'd like to check in.", zh: "我想辦理入住。", ipa: "/aɪd ˈlaɪk tə ˈtʃɛk ɪn/" },
    ],
  },
  {
    id: "work",
    title: "工作溝通",
    blurb: "會議、改期、同事",
    tone: "teal",
    items: [
      { id: "w01", en: "meeting", zh: "會議", ipa: "/ˈmitɪŋ/" },
      { id: "w02", en: "deadline", zh: "截止日期", ipa: "/ˈdɛdlaɪn/" },
      { id: "w03", en: "colleague", zh: "同事", ipa: "/ˈkɑliɡ/" },
      { id: "w04", en: "schedule", zh: "行程表", ipa: "/ˈskɛdʒul/" },
      { id: "w05", en: "project", zh: "專案", ipa: "/ˈprɑdʒɛkt/" },
      { id: "w06", en: "I have a meeting at three.", zh: "我三點有一個會議。", ipa: "/aɪ ˈhæv ə ˈmitɪŋ ət ˈθri/" },
      { id: "w07", en: "Can we reschedule?", zh: "我們可以改時間嗎？", ipa: "/kən wi ˌriˈskɛdʒul/" },
      { id: "w08", en: "I'll send you an email.", zh: "我會寄電子郵件給你。", ipa: "/aɪl ˈsɛnd ju ən ˈimeɪl/" },
      { id: "w09", en: "Let's take a break.", zh: "我們休息一下吧。", ipa: "/ˌlɛts ˈteɪk ə ˈbreɪk/" },
      { id: "w10", en: "I'm working from home today.", zh: "我今天在家工作。", ipa: "/aɪm ˈwɝkɪŋ frəm ˈhoʊm təˈdeɪ/" },
      { id: "w11", en: "Could you repeat that?", zh: "可以再說一次嗎？", ipa: "/ˌkʊd ju rɪˈpit ˈðæt/" },
      { id: "w12", en: "I agree.", zh: "我同意。", ipa: "/aɪ əˈɡri/" },
      { id: "w13", en: "Let me check.", zh: "我確認一下。", ipa: "/ˈlɛt mi ˈtʃɛk/" },
      { id: "w14", en: "The report is ready.", zh: "報告好了。", ipa: "/ðə rɪˈpɔrt ɪz ˈrɛdi/" },
      { id: "w15", en: "Nice working with you.", zh: "跟你一起工作很愉快。", ipa: "/ˈnaɪs ˈwɝkɪŋ wɪð ju/" },
    ],
  },
]

export function getLesson(id: string | undefined): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}

export function itemKey(lessonId: string, itemId: string): string {
  return `${lessonId}:${itemId}`
}

export function totalItemCount(): number {
  return lessons.reduce((sum, lesson) => sum + lesson.items.length, 0)
}
