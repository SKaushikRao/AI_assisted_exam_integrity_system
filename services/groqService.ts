// AI Service for Exam Integrity Analysis
// Using Ollama only for reliable AI vision analysis

export interface AIAnalysisResult {
  status: 'SAFE' | 'SUSPICIOUS' | 'ERROR' | 'INIT';
  message: string;
  model: string;
}

export interface MediaPipeStatus {
  faceDetected: boolean;
  handsDetected: boolean;
  isTalking: boolean;
  isLookingAway: boolean;
  multipleFaces: boolean;
  handNearFace: boolean;
}

// Main analysis function - Ollama only
export async function analyzeFrameWithPuter(
  base64Image: string, 
  eventType?: string, 
  isPeriodic: boolean = false,
  currentStatus?: MediaPipeStatus
): Promise<AIAnalysisResult> {
  // Always analyze with Ollama
  try {
    const analysis = await analyzeWithOllama(base64Image, eventType, currentStatus);
    return analysis;
  } catch (error) {
    console.error("Ollama analysis failed:", error);
    return {
      status: 'ERROR',
      message: "AI analysis unavailable - Ollama not responding",
      model: "Ollama (Error)"
    };
  }
}

// Ollama Analysis (Local, Free, Reliable)
async function analyzeWithOllama(
  base64Image: string, 
  eventType: string,
  currentStatus?: MediaPipeStatus
): Promise<AIAnalysisResult> {
  const prompt = createOllamaPrompt(eventType, currentStatus);
  
  console.log("Sending request to Ollama:", { model: 'bakllava', promptLength: prompt.length });
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'bakllava',
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 150
        }
      })
    });
    
    console.log("Ollama response status:", response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.response || "No response";
    
    console.log("Ollama raw response:", aiResponse);
    
    return parseOllamaResponse(aiResponse);
  } catch (error) {
    console.error("Ollama fetch error:", error);
    return {
      status: 'ERROR',
      message: "AI analysis unavailable - Ollama not responding",
      model: "Ollama (Error)"
    };
  }
}

// Create Ollama prompt for vision analysis
function createOllamaPrompt(
  eventType: string,
  currentStatus?: MediaPipeStatus
): string {
  const timestamp = new Date().toISOString();
  
  return `You are an expert exam integrity proctor. Analyze this image and determine if behavior violates exam rules.

CONTEXT:
- Event Type: ${eventType}
- Timestamp: ${timestamp}
- Face Detected: ${currentStatus?.faceDetected || 'unknown'}
- Multiple Faces: ${currentStatus?.multipleFaces || 'unknown'}
- Hands Detected: ${currentStatus?.handsDetected || 'unknown'}
- Hand Near Face: ${currentStatus?.handNearFace || 'unknown'}
- Looking Away: ${currentStatus?.isLookingAway || 'unknown'}
- Talking: ${currentStatus?.isTalking || 'unknown'}

ANALYSIS TASK:
1. Examine the image for exam integrity violations
2. Look specifically for: multiple people, unauthorized materials, cheating attempts, distractions
3. Consider the context of an exam environment
4. Provide clear, concise assessment

RESPONSE FORMAT:
Status: [SAFE|SUSPICIOUS]
Message: [Your analysis in 1-2 sentences]

Examples:
Status: SUSPICIOUS
Message: Multiple people visible in frame - potential collaboration

Status: SAFE  
Message: Student focused on exam - no violations detected

Status: SUSPICIOUS
Message: Hand near face detected - potential unauthorized assistance

Status: SAFE
Message: Student maintaining proper exam conduct - no issues detected`;
}

// Parse Ollama response
function parseOllamaResponse(response: string): AIAnalysisResult {
  try {
    // Extract status and message from Ollama response
    const statusMatch = response.match(/Status:\s*(SAFE|SUSPICIOUS)/i);
    const messageMatch = response.match(/Message:\s*(.+)/i);
    
    const status = statusMatch ? statusMatch[1].toUpperCase() : 'SAFE';
    const message = messageMatch ? messageMatch[1].trim() : response.trim();
    
    return {
      status: status as 'SAFE' | 'SUSPICIOUS',
      message: message || "Analysis completed",
      model: "Ollama (bakllava)"
    };
  } catch (error) {
    console.error("Failed to parse Ollama response:", error);
    return {
      status: 'SAFE',
      message: response || "Analysis completed",
      model: "Ollama (bakllava)"
    };
  }
}
