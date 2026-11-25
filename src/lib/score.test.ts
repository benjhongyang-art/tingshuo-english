import { describe, expect, it } from "vitest"
import { assessUtterance } from "./score.ts"

describe("assessUtterance", () => {
  it("treats case and punctuation as the same sentence", () => {
    const result = assessUtterance("Thank you very much.", "THANK YOU, VERY MUCH!")
    expect(result.exact).toBe(true)
    expect(result.score).toBe(100)
  })

  it("accepts expanded contractions", () => {
    const result = assessUtterance("I'd like a coffee, please.", "I would like a coffee please")
    expect(result.exact).toBe(true)
    expect(result.score).toBe(100)
  })

  it("accepts I'm as I am", () => {
    const result = assessUtterance("I'm fine, thank you.", "I am fine thank you")
    expect(result.exact).toBe(true)
  })

  it("maps a spoken digit to the number word", () => {
    const result = assessUtterance("I have a meeting at three.", "I have a meeting at 3")
    expect(result.exact).toBe(true)
  })

  it("marks the mismatched word and scores the overlap", () => {
    const result = assessUtterance("Good morning.", "Good evening.")
    expect(result.score).toBe(50)
    expect(result.exact).toBe(false)
    expect(result.targetMarks.map((mark) => mark.status)).toEqual(["match", "miss"])
    expect(result.spokenMarks.map((mark) => mark.status)).toEqual(["match", "miss"])
  })

  it("does not count filler sounds", () => {
    const result = assessUtterance("Hello.", "um hello")
    expect(result.exact).toBe(true)
    expect(result.score).toBe(100)
  })

  it("scores an empty attempt as zero", () => {
    const result = assessUtterance("How are you?", "")
    expect(result.score).toBe(0)
    expect(result.exact).toBe(false)
    expect(result.targetMarks.every((mark) => mark.status === "miss")).toBe(true)
  })

  it("keeps a perfect score when every target word was said, but not exact if there are extras", () => {
    const result = assessUtterance("Hello.", "hello there")
    expect(result.score).toBe(100)
    expect(result.exact).toBe(false)
  })
})
