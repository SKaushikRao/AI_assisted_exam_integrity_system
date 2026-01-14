
// Replaced Groq with Puter.js (Zero API Key)
// Using gpt-4o-mini via Puter for Vision capabilities

export interface AIAnalysisResult {
  status: 'SAFE' | 'SUSPICIOUS' | 'ERROR' | 'INIT';
  message: string;
  model: string;
}

export async function analyzeFrameWithPuter(base64Image: string): Promise<AIAnalysisResult> {
  // Wait for Puter to be available if it's still loading
  if (!window.puter) {
    console.warn("Puter.js not loaded yet.");
    return { status: 'ERROR', message: "AI System Loading...", model: "System" };
  }

  try {
    const response = await window.puter.ai.chat([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "You are a professional exam invigilator AI. Analyze this webcam frame. Return a raw JSON object (no markdown, no explanations) with exactly two keys:\n1. 'status': 'SAFE' or 'SUSPICIOUS'\n2. 'message': A concise summary of the student's behavior for the exam log.\n\nExample:\n{\"status\": \"SAFE\", \"message\": \"Student is focused on the screen.\"}"
          },
          {
            type: "image_url",
            image_url: {
              url: base64Image
            }
          }
        ]
      }
    ], { model: 'gpt-4o-mini' });

    // Puter response structure handling
    const content = response?.message?.content || response?.toString();

    if (!content) return { status: 'ERROR', message: "No analysis received.", model: "gpt-4o-mini" };

    // Robust JSON Parsing
    try {
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        
        return {
            status: (parsed.status === 'SAFE' || parsed.status === 'SUSPICIOUS') ? parsed.status : 'SAFE',
            message: parsed.message || "Analysis complete.",
            model: "gpt-4o-mini"
        };
    } catch (e) {
        console.warn("JSON Parse Failed, raw content:", content);
        return { status: 'SAFE', message: content.substring(0, 100), model: "gpt-4o-mini" };
    }

  } catch (error) {
    console.error("Puter AI Network Error:", error);
    return { status: 'ERROR', message: "AI Connection Failed", model: "gpt-4o-mini" };
  }
}
