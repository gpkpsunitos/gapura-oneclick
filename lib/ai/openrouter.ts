import "server-only";

export const OPENROUTER_MODEL = "meta-llama/llama-3-70b-instruct";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function callOpenRouterAI(
  messages: OpenRouterMessage[],
  model: string = OPENROUTER_MODEL,
  maxTokens = 4096
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  try {

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(process.env.OPENROUTER_HTTP_REFERER
          ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
          : {}),
        ...(process.env.OPENROUTER_APP_NAME
          ? { "X-Title": process.env.OPENROUTER_APP_NAME }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_completion_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const completion = (await response.json()) as OpenRouterChatCompletion;
    return completion.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("[OpenRouter] Error calling AI:", error);
    throw error;
  }
}
