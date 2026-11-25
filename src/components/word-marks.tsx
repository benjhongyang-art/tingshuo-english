import type { WordMark } from "@/lib/score.ts"

export function WordMarks({ marks }: { marks: WordMark[] }) {
  return (
    <span className="inline leading-relaxed">
      {marks.map((mark, index) => (
        <span
          key={`${mark.text}-${index}`}
          className={
            mark.status === "match"
              ? "mx-[0.12em]"
              : "mx-[0.12em] rounded-md bg-rose-100 px-1 text-rose-800"
          }
        >
          {mark.text}
        </span>
      ))}
    </span>
  )
}
