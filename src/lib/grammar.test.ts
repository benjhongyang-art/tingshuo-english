import { describe, expect, it } from "vitest"
import { grammarQuestions, grammarTopics, questionsFor } from "../data/grammar.ts"
import {
  emptyGrammarStats,
  grammarAccuracy,
  grammarMistakeTarget,
  gradeGrammar,
  normalizeAnswer,
  parseGrammarStats,
  recordGrammarAttempt,
  summarizeGrammar,
  topicAccuracy,
} from "./grammar.ts"
import { emptyMistakeBook, mistakeId, recordGrammarOutcome } from "./mistakes.ts"

describe("grammar scoring", () => {
  it("accepts the listed answer and rejects a wrong or empty one", () => {
    const choice = grammarQuestions.find((item) => item.id === "tenses-01")!
    expect(gradeGrammar(choice, "drink")).toBe(true)
    expect(gradeGrammar(choice, " drinks ")).toBe(false)
    expect(gradeGrammar(choice, "drinks")).toBe(false)
    expect(gradeGrammar(choice, "")).toBe(false)

    const blank = grammarQuestions.find((item) => item.id === "tenses-03")!
    expect(gradeGrammar(blank, "  Met. ")).toBe(true)
    expect(gradeGrammar(blank, "meet")).toBe(false)

    const negative = grammarQuestions.find((item) => item.id === "tenses-07")!
    expect(gradeGrammar(negative, "does not like")).toBe(true)
    expect(gradeGrammar(negative, "doesn’t like")).toBe(true)
    expect(normalizeAnswer("  Does   Not   Like. ")).toBe("does not like")

    const request = grammarQuestions.find((item) => item.id === "questions-09")!
    expect(gradeGrammar(request, "could")).toBe(true)
    expect(gradeGrammar(request, "please")).toBe(false)
  })

  it("rounds accuracy and keeps topics separate", () => {
    expect(grammarAccuracy(0, 0)).toBeNull()
    expect(grammarAccuracy(2, 3)).toBe(67)

    const empty = emptyGrammarStats()
    const once = recordGrammarAttempt(empty, "tenses", true)
    expect(empty.topics).toEqual({})
    const twice = recordGrammarAttempt(once, "tenses", false)
    const other = recordGrammarAttempt(twice, "articles", true)
    expect(other.topics.tenses).toEqual({ attempts: 2, correct: 1 })
    expect(summarizeGrammar(other)).toEqual({ attempts: 3, correct: 2, accuracy: 67 })
    expect(topicAccuracy(other, "questions")).toBeNull()
    expect(topicAccuracy(other, "articles")).toBe(100)
  })

  it("repairs stored stats without inventing attempts", () => {
    expect(
      parseGrammarStats({
        version: 1,
        topics: {
          tenses: { attempts: 2, correct: 9 },
          bad: { attempts: "1", correct: 1 },
          articles: { attempts: 1, correct: 1 },
          zero: { attempts: 0, correct: 0 },
        },
      }),
    ).toEqual({
      topics: {
        tenses: { attempts: 2, correct: 2 },
        articles: { attempts: 1, correct: 1 },
      },
    })
    expect(parseGrammarStats("{")).toEqual({ topics: {} })
  })
})

describe("grammar questions", () => {
  it("gives every topic at least ten mixed questions with a Chinese explanation", () => {
    const ids = new Set<string>()
    for (const topic of grammarTopics) {
      const questions = questionsFor(topic.id)
      expect(questions.length).toBeGreaterThanOrEqual(10)
      expect(new Set(questions.map((item) => item.kind))).toEqual(new Set(["choice", "blank"]))
      for (const question of questions) {
        expect(ids.has(question.id)).toBe(false)
        ids.add(question.id)
        expect(question.topicId).toBe(topic.id)
        expect(question.explanation).toMatch(/[\u4e00-\u9fff]/)
        expect(question.correctSentence).toMatch(/[A-Za-z]/)
        expect(gradeGrammar(question, question.answer)).toBe(true)
        if (question.kind === "choice") {
          expect(question.choices).toContain(question.answer)
          const wrong = question.choices?.find((choice) => choice !== question.answer)
          expect(wrong).toBeTruthy()
          expect(gradeGrammar(question, wrong ?? "")).toBe(false)
        } else {
          expect(question.correctSentence.toLowerCase()).toContain(question.answer.toLowerCase())
          expect(gradeGrammar(question, "not-the-answer")).toBe(false)
        }
      }
    }
    expect(ids.size).toBe(grammarQuestions.length)
  })
})

describe("grammar mistakes", () => {
  const today = "2026-11-25"

  it("collects a wrong answer and leaves a correct new answer out of the book", () => {
    const question = questionsFor("tenses")[0]!
    const target = grammarMistakeTarget(question, "drinks")
    expect(target).toMatchObject({
      kind: "phrase",
      topicId: "tenses",
      refId: question.id,
      en: question.correctSentence,
      zh: question.explanation,
      note: `題目：${question.sentence}　你的答案：drinks`,
    })

    const empty = emptyMistakeBook()
    expect(recordGrammarOutcome(empty, target, true, today).book).toBe(empty)
    const book = recordGrammarOutcome(empty, target, false, today).book
    expect(book.items).toHaveLength(1)
    expect(book.items[0]).toMatchObject({
      id: mistakeId(target),
      sources: ["grammar"],
      kind: "phrase",
      en: question.correctSentence,
      wrongCount: 1,
      correctStreak: 0,
    })
  })
})
