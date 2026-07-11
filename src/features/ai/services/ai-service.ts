import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { getAIClient } from "../../../services/ai.ts";

/**
 * Supported models based on the gemini-api skill instructions
 */
export const SUPPORTED_MODELS = {
  "gemini-3.5-flash": {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash (Recommended)",
    description: "Ideal for basic text, summarization, and fast Q&A.",
    isPaid: false,
  },
  "gemini-3.1-pro-preview": {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    description: "Advanced reasoning, complex coding, and STEM topics. Requires a paid key.",
    isPaid: true,
  },
};

/**
 * Flexible interface for any future AI model settings
 */
export interface AISettings {
  preferredModel: string;
  temperature: number; // Creativity (0.0 to 1.0 or 2.0 depending on provider)
  maxOutputTokens?: number;
  systemPrompt?: string;
  responseLength?: "short" | "medium" | "detailed";
}

/**
 * Clean context attachment interface - prepared for Subjects, Notes, Documents, etc.
 */
export interface AIContextAttachment {
  type: "subject" | "note" | "document" | "planner" | "flashcard" | "quiz";
  id: string | number;
  title: string;
  content: string; // The text content or structural representation to inject as context
}

/**
 * Standard message format for multi-turn chat history
 */
export interface AIChatMessage {
  role: "user" | "model" | "system";
  content: string;
}

/**
 * Unified AI Provider interface to make provider switching seamless without touching business logic
 */
export interface AIProvider {
  name: string;
  generateText(
    messages: AIChatMessage[],
    settings: AISettings,
    contexts?: AIContextAttachment[]
  ): Promise<string>;
  
  generateTextStream(
    messages: AIChatMessage[],
    settings: AISettings,
    contexts: AIContextAttachment[],
    onChunk: (text: string) => void
  ): Promise<void>;
}

/**
 * Google Gemini Provider implementation using the recommended @google/genai SDK
 */
export class GeminiProvider implements AIProvider {
  name = "Google Gemini";

  private formatContents(messages: AIChatMessage[]) {
    // Format AIChatMessage format to @google/genai contents list format
    // Note: System prompts should be passed via config, not in contents
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));
  }

  private buildSystemInstruction(settings: AISettings, contexts?: AIContextAttachment[]): string {
    const baseInstruction = settings.systemPrompt || "You are a highly helpful and intelligent academic study assistant in AI Study Hub.";
    
    let contextPrompt = "";
    if (contexts && contexts.length > 0) {
      contextPrompt = "\n\nAvailable Context for current query:";
      contexts.forEach((ctx) => {
        contextPrompt += `\n[Context Type: ${ctx.type.toUpperCase()} | Title: ${ctx.title}]\n${ctx.content}\n---`;
      });
      contextPrompt += "\nUse the above context to inform your responses when relevant, but prioritize answering the student's question accurately and clearly.";
    }

    let lengthInstruction = "";
    if (settings.responseLength === "short") {
      lengthInstruction = "\nKeep your answer short and highly concise (under 3 sentences).";
    } else if (settings.responseLength === "medium") {
      lengthInstruction = "\nKeep your answer reasonably concise and focused.";
    } else if (settings.responseLength === "detailed") {
      lengthInstruction = "\nProvide a detailed, thorough, step-by-step academic response with examples.";
    }

    return `${baseInstruction}${contextPrompt}${lengthInstruction}`;
  }

  async generateText(
    messages: AIChatMessage[],
    settings: AISettings,
    contexts?: AIContextAttachment[]
  ): Promise<string> {
    try {
      const ai = getAIClient();
      const model = settings.preferredModel || "gemini-3.5-flash";
      const systemInstruction = this.buildSystemInstruction(settings, contexts);
      const contents = this.formatContents(messages);

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: settings.temperature,
          maxOutputTokens: settings.maxOutputTokens,
        },
      });

      return response.text || "";
    } catch (error) {
      console.error("Gemini API generation error:", error);
      throw error;
    }
  }

  async generateTextStream(
    messages: AIChatMessage[],
    settings: AISettings,
    contexts: AIContextAttachment[] = [],
    onChunk: (text: string) => void
  ): Promise<void> {
    try {
      const ai = getAIClient();
      const model = settings.preferredModel || "gemini-3.5-flash";
      const systemInstruction = this.buildSystemInstruction(settings, contexts);
      const contents = this.formatContents(messages);

      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: settings.temperature,
          maxOutputTokens: settings.maxOutputTokens,
        },
      });

      for await (const chunk of stream) {
        const text = (chunk as GenerateContentResponse).text || "";
        if (text) {
          onChunk(text);
        }
      }
    } catch (error) {
      console.error("Gemini API streaming error:", error);
      throw error;
    }
  }
}

/**
 * Factory helper to get active AI provider (currently defaults to Gemini, expandable to others)
 */
export function getActiveAIProvider(): AIProvider {
  return new GeminiProvider();
}
