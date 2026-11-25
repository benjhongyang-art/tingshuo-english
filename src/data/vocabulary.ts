import type { Lesson } from "../types.ts"
import { extraVocabulary } from "./extra-vocabulary.ts"
import { lessons } from "./lessons.ts"

export type VocabCard = {
  id: string
  topicId: string
  word: string
  zh: string
  ipa: string
  example: string
}

export const vocabulary: VocabCard[] = [
  { id: "greetings:hello", topicId: "greetings", word: "hello", zh: "你好", ipa: "/həˈloʊ/", example: "Hello. How are you?" },
  { id: "greetings:morning", topicId: "greetings", word: "morning", zh: "早上", ipa: "/ˈmɔrnɪŋ/", example: "Good morning." },
  { id: "greetings:afternoon", topicId: "greetings", word: "afternoon", zh: "下午", ipa: "/ˌæftərˈnun/", example: "Good afternoon." },
  { id: "greetings:evening", topicId: "greetings", word: "evening", zh: "晚上", ipa: "/ˈivnɪŋ/", example: "Good evening." },
  { id: "greetings:thank", topicId: "greetings", word: "thank", zh: "謝謝", ipa: "/θæŋk/", example: "Thank you very much." },
  { id: "greetings:welcome", topicId: "greetings", word: "welcome", zh: "不客氣", ipa: "/ˈwɛlkəm/", example: "You're welcome." },
  { id: "greetings:please", topicId: "greetings", word: "please", zh: "請", ipa: "/pliz/", example: "Please come in." },
  { id: "greetings:name", topicId: "greetings", word: "name", zh: "名字", ipa: "/neɪm/", example: "What's your name?" },

  { id: "food:water", topicId: "food", word: "water", zh: "水", ipa: "/ˈwɔtər/", example: "Bottled water, please." },
  { id: "food:coffee", topicId: "food", word: "coffee", zh: "咖啡", ipa: "/ˈkɔfi/", example: "I'd like a coffee, please." },
  { id: "food:tea", topicId: "food", word: "tea", zh: "茶", ipa: "/ti/", example: "One bubble tea, less ice." },
  { id: "food:rice", topicId: "food", word: "rice", zh: "米飯", ipa: "/raɪs/", example: "I'd like rice, please." },
  { id: "food:menu", topicId: "food", word: "menu", zh: "菜單", ipa: "/ˈmɛnju/", example: "Can I see the menu?" },
  { id: "food:delicious", topicId: "food", word: "delicious", zh: "好吃的", ipa: "/dɪˈlɪʃəs/", example: "This is delicious." },
  { id: "food:vegetarian", topicId: "food", word: "vegetarian", zh: "素食的", ipa: "/ˌvɛdʒəˈtɛriən/", example: "I'm vegetarian." },
  { id: "food:spicy", topicId: "food", word: "spicy", zh: "辣的", ipa: "/ˈspaɪsi/", example: "No spicy, please." },

  { id: "travel:airport", topicId: "travel", word: "airport", zh: "機場", ipa: "/ˈɛrpɔrt/", example: "Where is the airport?" },
  { id: "travel:hotel", topicId: "travel", word: "hotel", zh: "飯店", ipa: "/hoʊˈtɛl/", example: "The hotel is near the station." },
  { id: "travel:passport", topicId: "travel", word: "passport", zh: "護照", ipa: "/ˈpæspɔrt/", example: "Here is my passport." },
  { id: "travel:ticket", topicId: "travel", word: "ticket", zh: "票", ipa: "/ˈtɪkɪt/", example: "A ticket to Taipei, please." },
  { id: "travel:station", topicId: "travel", word: "station", zh: "車站", ipa: "/ˈsteɪʃən/", example: "Where is the station?" },
  { id: "travel:taxi", topicId: "travel", word: "taxi", zh: "計程車", ipa: "/ˈtæksi/", example: "I need a taxi." },
  { id: "travel:left", topicId: "travel", word: "left", zh: "左邊", ipa: "/lɛft/", example: "Turn left." },
  { id: "travel:straight", topicId: "travel", word: "straight", zh: "直走", ipa: "/streɪt/", example: "Go straight." },

  { id: "work:meeting", topicId: "work", word: "meeting", zh: "會議", ipa: "/ˈmitɪŋ/", example: "I have a meeting at three." },
  { id: "work:deadline", topicId: "work", word: "deadline", zh: "截止日期", ipa: "/ˈdɛdlaɪn/", example: "The deadline is tomorrow." },
  { id: "work:colleague", topicId: "work", word: "colleague", zh: "同事", ipa: "/ˈkɑliɡ/", example: "I'll ask my colleague." },
  { id: "work:schedule", topicId: "work", word: "schedule", zh: "行程", ipa: "/ˈskɛdʒul/", example: "Let's check the schedule." },
  { id: "work:project", topicId: "work", word: "project", zh: "專案", ipa: "/ˈprɑdʒɛkt/", example: "The project is ready." },
  { id: "work:email", topicId: "work", word: "email", zh: "電子郵件", ipa: "/ˈimeɪl/", example: "I'll send you an email." },
  { id: "work:report", topicId: "work", word: "report", zh: "報告", ipa: "/rɪˈpɔrt/", example: "The report is ready." },
  { id: "work:break", topicId: "work", word: "break", zh: "休息", ipa: "/breɪk/", example: "Let's take a break." },
  ...extraVocabulary,
]

const byId = new Map(vocabulary.map((card) => [card.id, card]))

export function getVocabCard(id: string): VocabCard | undefined {
  return byId.get(id)
}

export function vocabIds(): string[] {
  return vocabulary.map((card) => card.id)
}

export function topicTitle(topicId: string, catalog: Lesson[] = lessons): string {
  return catalog.find((lesson) => lesson.id === topicId)?.title ?? topicId
}
