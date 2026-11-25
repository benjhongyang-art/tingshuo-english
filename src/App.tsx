import { BrowserRouter, Route, Routes } from "react-router-dom"
import { HomeScreen } from "@/components/home-screen.tsx"
import { ListeningPractice } from "@/components/listening-practice.tsx"
import { PronunciationPractice } from "@/components/pronunciation-practice.tsx"
import { ProgressProvider } from "@/lib/progress-context.tsx"

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "")

export default function App() {
  return (
    <ProgressProvider>
      <BrowserRouter basename={routerBasename}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/listen/:lessonId" element={<ListeningPractice />} />
          <Route path="/speak/:lessonId" element={<PronunciationPractice />} />
          <Route path="*" element={<HomeScreen />} />
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}
