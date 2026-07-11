import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

// Global model routing map to bypass rate-limited/exhausted models on subsequent calls
const globalModelOverrideMap: Record<string, string> = {
  "gemini-3.5-flash": "gemini-3.1-flash-lite",
};

function getActiveModel(modelName: string): string {
  let current = modelName;
  const visited = new Set<string>();
  while (globalModelOverrideMap[current] && !visited.has(current)) {
    visited.add(current);
    current = globalModelOverrideMap[current];
  }
  return current;
}

/**
 * Robust retry utility with exponential backoff and jitter for transient/high-demand Gemini API failures
 */
async function retryWithBackoff<T>(
  fn: (currentModel: string) => Promise<T>,
  modelName: string,
  maxAttempts = 4,
  initialDelay = 1000
): Promise<T> {
  let attempt = 0;
  let currentModel = getActiveModel(modelName);
  while (attempt < maxAttempts) {
    try {
      return await fn(currentModel);
    } catch (error: any) {
      attempt++;
      const isTransient = 
        error.status === 503 || 
        error.code === 503 ||
        error.status === 429 ||
        error.code === 429 ||
        error.message?.includes("503") ||
        error.message?.includes("429") ||
        error.message?.includes("UNAVAILABLE") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.message?.includes("Quota exceeded") ||
        error.message?.includes("limit") ||
        error.message?.includes("high demand") ||
        error.message?.includes("Too Many Requests") ||
        error.message?.includes("fetch failed") ||
        error.message?.includes("Timeout") ||
        error.name === "HeadersTimeoutError" ||
        error.code === "UND_ERR_HEADERS_TIMEOUT" ||
        String(error).includes("timeout") ||
        String(error).includes("fetch failed") ||
        String(error).includes("Quota exceeded") ||
        String(error).includes("RESOURCE_EXHAUSTED") ||
        String(error).includes("429") ||
        String(error).includes("limit");

      if (isTransient && attempt < maxAttempts) {
        let nextModel = currentModel;
        // If gemini-3.5-flash is experiencing high demand / unavailability / quota limits, fallback dynamically
        if (currentModel === "gemini-3.5-flash") {
          nextModel = "gemini-3.1-flash-lite";
        } else if (currentModel === "gemini-3.1-flash-lite") {
          nextModel = "gemini-flash-latest";
        } else if (currentModel === "gemini-flash-latest") {
          nextModel = "gemini-3.1-pro-preview";
        }

        if (nextModel !== currentModel) {
          globalModelOverrideMap[currentModel] = nextModel;
          console.warn(`[Gemini Client Wrapper] Dynamically mapping ${currentModel} -> ${nextModel} globally due to rate limit/error.`);
          currentModel = nextModel;
        }

        // Calculate delay with exponential backoff and 20% random jitter
        const delay = initialDelay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
        console.warn(
          `[Gemini Client Wrapper] Transient failure for model ${currentModel} (requested: ${modelName}) (Attempt ${attempt}/${maxAttempts}). ` +
          `Retrying in ${delay.toFixed(0)}ms... Error: ${error.message || error}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`[Gemini Client Wrapper] Persistent error for model ${currentModel} (requested: ${modelName}) after ${attempt} attempts:`, error);
        throw error;
      }
    }
  }
  throw new Error(`[Gemini Client Wrapper] Failed after ${maxAttempts} attempts.`);
}

/**
 * Lazily initialize the Google Gen AI client with global retry resilience and telemetry headers.
 * This prevents the application from crashing on startup if the API key is missing,
 * providing a descriptive error only when the service is invoked.
 */
export function getAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is missing. " +
          "Please configure it via the Secrets panel in Google AI Studio."
      );
    }
    
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    // Monkeypatch generateContent for global retry, logging, and performance instrumentation
    const originalGenerateContent = client.models.generateContent.bind(client.models);
    client.models.generateContent = (async function (params: any, ...args: any[]) {
      const modelName = params?.model || "unknown-model";
      const startTime = performance.now();
      
      const result = await retryWithBackoff(
        (activeModel) => {
          if (params) {
            params.model = activeModel;
          }
          return originalGenerateContent(params, ...args);
        },
        modelName
      );
      
      const duration = performance.now() - startTime;
      console.log(`[Gemini Performance] ${params?.model || modelName} call completed successfully in ${duration.toFixed(1)}ms`);
      return result;
    } as any);

    // Monkeypatch generateContentStream for global connection retry
    const originalGenerateContentStream = client.models.generateContentStream.bind(client.models);
    client.models.generateContentStream = (async function (params: any, ...args: any[]) {
      const modelName = params?.model || "unknown-model";
      const startTime = performance.now();

      const result = await retryWithBackoff(
        (activeModel) => {
          if (params) {
            params.model = activeModel;
          }
          return originalGenerateContentStream(params, ...args);
        },
        modelName
      );

      const duration = performance.now() - startTime;
      console.log(`[Gemini Performance] ${params?.model || modelName} stream connection established in ${duration.toFixed(1)}ms`);
      return result;
    } as any);

    aiInstance = client;
  }
  return aiInstance;
}

/**
 * Service helper to generate text content using the recommended model.
 */
export async function generateText(prompt: string, systemInstruction?: string) {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: systemInstruction
        ? {
            systemInstruction,
          }
        : undefined,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API invocation failed:", error);
    throw new Error("AI service is currently unavailable. Please try again later.", {
      cause: error,
    });
  }
}

