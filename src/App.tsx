import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Flashcards } from "@/components/flashcards.tsx"
import { HomeScreen } from "@/components/home-screen.tsx"
import { ListeningPractice } from "@/components/listening-practice.tsx"
import { MistakeBookPage } from "@/components/mistake-book.tsx"
import { MistakePractice } from "@/components/mistake-practice.tsx"
import { PronunciationPractice } from "@/components/pronunciation-practice.tsx"
import { ProgressProvider } from "@/lib/progress-context.tsx"
import { ReviewProvider } from "@/lib/review-context.tsx"

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "")

export default function App() {
  return (
    <ProgressProvider>
      <ReviewProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/cards" element={<Flashcards />} />
            <Route path="/mistakes" element={<MistakeBookPage />} />
            <Route path="/mistakes/practice/:mode" element={<MistakePractice />} />
            <Route path="/listen/:lessonId" element={<ListeningPractice />} />
            <Route path="/speak/:lessonId" element={<PronunciationPractice />} />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
        </BrowserRouter>
      </ReviewProvider>
    </ProgressProvider>
  )
}
