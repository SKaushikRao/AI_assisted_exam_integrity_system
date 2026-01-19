
// AI Service for Exam Integrity Analysis
// Using real-time MediaPipe data for analysis

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

// Main analysis function - can be triggered by events or periodic checks
export async function analyzeFrameWithPuter(
  base64Image: string, 
  eventType?: string, 
  isPeriodic: boolean = false,
  currentStatus?: MediaPipeStatus
): Promise<AIAnalysisResult> {
  // For periodic checks, always analyze with real-time data
  if (!isPeriodic && !eventType) {
    return {
      status: 'SAFE',
      message: "MediaPipe monitoring active - no AI analysis needed",
      model: "MediaPipe Only"
    };
  }

  if (isPeriodic) {
    return await analyzePeriodic(base64Image, currentStatus);
  } else {
    return await analyzeEvent(base64Image, eventType);
  }
}

// Event-triggered analysis (high-severity events)
async function analyzeEvent(base64Image: string, eventType: string): Promise<AIAnalysisResult> {
  console.log("Event-triggered analysis for:", eventType);
  
  const suspiciousEvents = [
    'MULTIPLE_FACES_DETECTED',
    'FACE_MISSING_LONG_DURATION',
    'HAND_NEAR_FACE'
  ];
  
  const isSuspicious = suspiciousEvents.includes(eventType);
  
  const descriptions = {
    'MULTIPLE_FACES_DETECTED': 'Multiple people detected in camera view - potential collaboration',
    'FACE_MISSING_LONG_DURATION': 'Student not visible for extended period - potential cheating',
    'HAND_NEAR_FACE': 'Hand proximity to face detected - potential unauthorized assistance'
  };
  
  return {
    status: isSuspicious ? 'SUSPICIOUS' : 'SAFE',
    message: descriptions[eventType] || `Event analysis: ${eventType}`,
    model: "Rule-Based"
  };
}

// Periodic analysis (every 5 seconds - real-time comprehensive detection)
async function analyzePeriodic(base64Image: string, currentStatus?: MediaPipeStatus): Promise<AIAnalysisResult> {
  console.log("Running real-time analysis with MediaPipe data:", currentStatus);
  
  if (!currentStatus) {
    return {
      status: 'SAFE',
      message: "MediaPipe status unavailable - monitoring active",
      model: "Rule-Based"
    };
  }

  // Generate real-time analysis based on actual MediaPipe detection
  const analysis = generateRealTimeAnalysis(currentStatus);
  
  return {
    status: analysis.status,
    message: analysis.message,
    model: "Rule-Based"
  };
}

// Generate real-time analysis based on actual MediaPipe data
function generateRealTimeAnalysis(status: MediaPipeStatus): { status: 'SAFE' | 'SUSPICIOUS'; message: string } {
  const issues = [];
  
  // Check each detection category
  if (!status.faceDetected) {
    issues.push("face not visible");
  }
  
  if (status.multipleFaces) {
    issues.push("multiple faces detected");
  }
  
  if (status.isLookingAway) {
    issues.push("looking away from screen");
  }
  
  if (status.isTalking) {
    issues.push("mouth movement detected");
  }
  
  if (status.handsDetected) {
    if (status.handNearFace) {
      issues.push("hand near face");
    } else {
      issues.push("hands visible");
    }
  }
  
  // Generate message based on detected issues
  if (issues.length === 0) {
    return {
      status: 'SAFE',
      message: "Student focused on exam - proper posture and attention maintained"
    };
  }
  
  // Prioritize suspicious activities
  const highPriorityIssues = issues.filter(issue => 
    issue.includes("multiple faces") || 
    issue.includes("face not visible") || 
    issue.includes("hand near face")
  );
  
  if (highPriorityIssues.length > 0) {
    return {
      status: 'SUSPICIOUS',
      message: `Suspicious activity detected: ${highPriorityIssues.join(", ")} - potential exam violation`
    };
  }
  
  // Medium priority issues
  const mediumPriorityIssues = issues.filter(issue => 
    issue.includes("looking away") || 
    issue.includes("mouth movement")
  );
  
  if (mediumPriorityIssues.length > 0) {
    return {
      status: 'SUSPICIOUS',
      message: `Concerning behavior: ${mediumPriorityIssues.join(", ")} - please maintain exam focus`
    };
  }
  
  // Low priority (just hands visible)
  return {
    status: 'SAFE',
    message: `Monitoring: ${issues.join(", ")} - continuing observation`
  };
}
