import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AiChatScreen } from "@/components/ai-chat.tsx"
import { AiSettingsScreen } from "@/components/ai-settings-screen.tsx"
import { Flashcards } from "@/components/flashcards.tsx"
import { GrammarHome, GrammarQuiz } from "@/components/grammar-practice.tsx"
import { HomeScreen } from "@/components/home-screen.tsx"
import { ListeningPractice } from "@/components/listening-practice.tsx"
import { MistakeBookPage } from "@/components/mistake-book.tsx"
import { MistakePractice } from "@/components/mistake-practice.tsx"
import { PronunciationPractice } from "@/components/pronunciation-practice.tsx"
import { GrammarProvider } from "@/lib/grammar-context.tsx"
import { ProgressProvider } from "@/lib/progress-context.tsx"
import { ReviewProvider } from "@/lib/review-context.tsx"

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "")

export default function App() {
  return (
    <ProgressProvider>
      <ReviewProvider>
        <GrammarProvider>
          <BrowserRouter basename={routerBasename}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/chat" element={<AiChatScreen />} />
              <Route path="/chat/settings" element={<AiSettingsScreen />} />
              <Route path="/grammar" element={<GrammarHome />} />
              <Route path="/grammar/:topicId" element={<GrammarQuiz />} />
              <Route path="/cards" element={<Flashcards />} />
              <Route path="/mistakes" element={<MistakeBookPage />} />
              <Route path="/mistakes/practice/:mode" element={<MistakePractice />} />
              <Route path="/listen/:lessonId" element={<ListeningPractice />} />
              <Route path="/speak/:lessonId" element={<PronunciationPractice />} />
              <Route path="*" element={<HomeScreen />} />
            </Routes>
          </BrowserRouter>
        </GrammarProvider>
      </ReviewProvider>
    </ProgressProvider>
  )
}
