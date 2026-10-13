import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * AI 텍스트 생성 공통 함수 (서버 전용).
 *
 * - 기본은 Gemini(gemini-2.5-flash)로 생성합니다.
 * - task가 "realtime"(사용자가 기다리는 요청)이면, Gemini가 한도 초과·오류·시간 초과로
 *   실패했을 때 Claude Haiku 5.5가 같은 프롬프트로 대신 답합니다. (ANTHROPIC_API_KEY 필요)
 * - task가 "background"(관리자 도구 등 급하지 않은 요청)이면 Gemini만 씁니다.
 *
 * 예비(Claude) 사용 기록은 monitoring_log에 event_type "ai_fallback"으로 남습니다.
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const CLAUDE_FALLBACK_MODEL = "claude-haiku-5-5";
/** 사용자가 기다리는 요청에서 Gemini를 기다리는 최대 시간 */
const REALTIME_GEMINI_TIMEOUT_MS = 8000;

export type LlmTask = "realtime" | "background";
export type LlmProvider = "gemini" | "claude";

export interface GenerateTextOptions {
  task: LlmTask;
  /** 로그에 남길 기능 이름 (예: "analyzeWord") */
  label: string;
  /** Gemini 전용 생성 설정 (temperature, responseMimeType 등) */
  geminiConfig?: GenerationConfig;
}

export interface GenerateTextResult {
  text: string;
  provider: LlmProvider;
}

/** 두 AI 모두 쓸 수 없을 때 */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    /** 마지막으로 실패한 쪽이 한도 초과(429)였는지 */
    readonly rateLimited: boolean
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

let anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic(); // ANTHROPIC_API_KEY를 환경 변수에서 읽음
  return anthropic;
}

function isRateLimit(error: unknown) {
  const err = error as { status?: number; message?: string } | null;
  return err?.status === 429 || !!err?.message?.includes("429");
}

async function generateWithGemini(prompt: string, options: GenerateTextOptions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
    { model: GEMINI_MODEL, generationConfig: options.geminiConfig },
    options.task === "realtime" ? { timeout: REALTIME_GEMINI_TIMEOUT_MS } : undefined
  );
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateWithClaude(prompt: string) {
  const response = await getAnthropic().messages.create({
    model: CLAUDE_FALLBACK_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude refused: ${response.stop_details?.category ?? "unknown"}`);
  }
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  if (!text) throw new Error(`Claude returned no text (stop_reason: ${response.stop_reason})`);
  return text;
}

function logFallback(label: string, geminiError: unknown) {
  const reason = geminiError instanceof Error ? geminiError.message : String(geminiError);
  try {
    createClient()
      .from("monitoring_log")
      .insert({
        event_type: "ai_fallback",
        level: "WARNING",
        message: `[${label}] Gemini 실패 → ${CLAUDE_FALLBACK_MODEL} 사용`,
        reason: reason.slice(0, 500),
        details: { label, model: CLAUDE_FALLBACK_MODEL, rateLimited: isRateLimit(geminiError) },
      })
      .then(({ error }) => error && console.error("ai_fallback log error:", error.message));
  } catch (e) {
    console.error("ai_fallback log error:", e);
  }
}

export async function generateText(prompt: string, options: GenerateTextOptions): Promise<GenerateTextResult> {
  try {
    return { text: await generateWithGemini(prompt, options), provider: "gemini" };
  } catch (geminiError) {
    const canFallback = options.task === "realtime" && !!process.env.ANTHROPIC_API_KEY;
    if (!canFallback) {
      throw new LlmUnavailableError(
        geminiError instanceof Error ? geminiError.message : String(geminiError),
        isRateLimit(geminiError)
      );
    }

    console.warn(`[${options.label}] Gemini failed, falling back to Claude:`, geminiError);
    logFallback(options.label, geminiError);
    try {
      return { text: await generateWithClaude(prompt), provider: "claude" };
    } catch (claudeError) {
      console.error(`[${options.label}] Claude fallback failed:`, claudeError);
      throw new LlmUnavailableError(
        claudeError instanceof Error ? claudeError.message : String(claudeError),
        claudeError instanceof Anthropic.RateLimitError
      );
    }
  }
}

/**
 * 답에서 첫 JSON 객체({...}) 또는 배열([...])을 꺼냅니다. 코드 블록(```json)으로 감싸져 있어도 됩니다.
 * 반환 타입은 기존 JSON.parse와 같이 any입니다. (호출하는 쪽에서 필요한 형태를 가정하고 씀)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractJson<T = any>(text: string, kind: "object" | "array" = "object"): T {
  const match = kind === "object" ? text.match(/\{[\s\S]*\}/) : text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON not found in AI response");
  return JSON.parse(match[0]) as T;
}

/** 오류가 한도 초과 때문인지 (화면 문구 선택용) */
export function isLlmRateLimited(error: unknown) {
  return error instanceof LlmUnavailableError ? error.rateLimited : isRateLimit(error);
}
