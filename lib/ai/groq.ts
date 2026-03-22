import "server-only";
let groqClient: any = null;

async function getGroqClient() {
  if (groqClient) return groqClient;
  const { default: Groq } = await import("groq-sdk");
  groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  return groqClient;
}

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Calls Groq AI API with llama-3.3-70b-versatile (high intelligence)
 */
export async function callGroqAI(
  messages: GroqMessage[],
  model: string = "llama-3.3-70b-versatile"
): Promise<string> {
  try {
    console.log(`[Groq] Calling model: ${model}`);
    const groq = await getGroqClient();
    const completion = await groq.chat.completions.create({
      model: model,
      messages: messages as any,
      temperature: 0.1, // Low temperature for deterministic analysis
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("[Groq] Error calling AI:", error);
    throw error;
  }
}
