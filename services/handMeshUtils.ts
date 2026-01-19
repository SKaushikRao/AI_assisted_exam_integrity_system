// Hand Mesh Utilities for Enhanced Hand Detection and Gesture Recognition

export interface HandGesture {
  type: 'OPEN_PALM' | 'CLOSED_FIST' | 'POINTING' | 'PEACE_SIGN' | 'THUMBS_UP' | 'OK_SIGN' | 'UNKNOWN';
  confidence: number;
  description: string;
}

export interface HandAnalysis {
  landmarks: any[];
  gesture: HandGesture;
  isNearFace: boolean;
  handSize: number;
  movementSpeed: number;
  suspiciousActivity: boolean;
}

// Enhanced hand mesh drawing with better visualization
export function drawEnhancedHandMesh(ctx: CanvasRenderingContext2D, landmarks: any[], options: {
  color?: string;
  lineWidth?: number;
  pointRadius?: number;
  showConnections?: boolean;
  showLandmarks?: boolean;
  fillMesh?: boolean;
} = {}) {
  const {
    color = '#ff8800',
    lineWidth = 3,
    pointRadius = 4,
    showConnections = true,
    showLandmarks = true,
    fillMesh = false
  } = options;

  // Hand connections for better mesh visualization
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],     // Index finger
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
    [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [0, 17]                              // Palm
  ];

  // Ensure landmarks are valid
  if (!landmarks || landmarks.length < 21) {
    console.warn("Invalid hand landmarks provided");
    return;
  }

  // Draw connections first (behind landmarks)
  if (showConnections) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;

    HAND_CONNECTIONS.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
        ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;
  }

  // Draw landmarks with enhanced visibility
  if (showLandmarks) {
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, pointRadius * 3);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.3, color + '80');
      gradient.addColorStop(1, color + '00');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, pointRadius * 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Middle ring
      ctx.fillStyle = color + '60';
      ctx.beginPath();
      ctx.arc(x, y, pointRadius * 1.5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Solid center point
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // White center for visibility
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, pointRadius * 0.3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // Draw filled mesh if enabled
  if (fillMesh && landmarks.length > 0) {
    ctx.fillStyle = color + '30'; // Add transparency
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    
    // Create palm shape
    if (landmarks[0] && landmarks[5] && landmarks[9] && landmarks[13] && landmarks[17]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[0].x * ctx.canvas.width, landmarks[0].y * ctx.canvas.height);
      ctx.lineTo(landmarks[5].x * ctx.canvas.width, landmarks[5].y * ctx.canvas.height);
      ctx.lineTo(landmarks[9].x * ctx.canvas.width, landmarks[9].y * ctx.canvas.height);
      ctx.lineTo(landmarks[13].x * ctx.canvas.width, landmarks[13].y * ctx.canvas.height);
      ctx.lineTo(landmarks[17].x * ctx.canvas.width, landmarks[17].y * ctx.canvas.height);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }
}

// Gesture recognition function
export function recognizeGesture(landmarks: any[]): HandGesture {
  if (!landmarks || landmarks.length < 21) {
    return {
      type: 'UNKNOWN',
      confidence: 0,
      description: 'Insufficient landmarks'
    };
  }

  // Key landmark indices for MediaPipe hands
  const THUMB_TIP = 4;
  const INDEX_FINGER_TIP = 8;
  const MIDDLE_FINGER_TIP = 12;
  const RING_FINGER_TIP = 16;
  const PINKY_TIP = 20;
  const WRIST = 0;
  const INDEX_FINGER_MCP = 5;
  const MIDDLE_FINGER_MCP = 9;

  // Calculate if fingers are extended
  const isThumbExtended = landmarks[THUMB_TIP].y < landmarks[THUMB_TIP - 1].y;
  const isIndexExtended = landmarks[INDEX_FINGER_TIP].y < landmarks[INDEX_FINGER_TIP - 2].y;
  const isMiddleExtended = landmarks[MIDDLE_FINGER_TIP].y < landmarks[MIDDLE_FINGER_TIP - 2].y;
  const isRingExtended = landmarks[RING_FINGER_TIP].y < landmarks[RING_FINGER_TIP - 2].y;
  const isPinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_TIP - 2].y;

  const extendedFingers = [
    isThumbExtended,
    isIndexExtended,
    isMiddleExtended,
    isRingExtended,
    isPinkyExtended
  ].filter(Boolean).length;

  // Gesture detection logic
  if (extendedFingers === 5) {
    return {
      type: 'OPEN_PALM',
      confidence: 0.9,
      description: 'Open palm detected'
    };
  } else if (extendedFingers === 0) {
    return {
      type: 'CLOSED_FIST',
      confidence: 0.9,
      description: 'Closed fist detected'
    };
  } else if (isIndexExtended && extendedFingers === 1) {
    return {
      type: 'POINTING',
      confidence: 0.85,
      description: 'Pointing gesture detected'
    };
  } else if (isIndexExtended && isMiddleExtended && extendedFingers === 2) {
    return {
      type: 'PEACE_SIGN',
      confidence: 0.8,
      description: 'Peace sign detected'
    };
  } else if (isThumbExtended && extendedFingers === 1) {
    return {
      type: 'THUMBS_UP',
      confidence: 0.8,
      description: 'Thumbs up detected'
    };
  } else if (isThumbExtended && isIndexExtended && extendedFingers === 2) {
    // Check if thumb and index form a circle (OK sign)
    const thumbIndexDistance = Math.sqrt(
      Math.pow(landmarks[THUMB_TIP].x - landmarks[INDEX_FINGER_TIP].x, 2) +
      Math.pow(landmarks[THUMB_TIP].y - landmarks[INDEX_FINGER_TIP].y, 2)
    );
    
    if (thumbIndexDistance < 0.1) {
      return {
        type: 'OK_SIGN',
        confidence: 0.75,
        description: 'OK sign detected'
      };
    }
  }

  return {
    type: 'UNKNOWN',
    confidence: 0.3,
    description: `${extendedFingers} fingers extended`
  };
}

// Calculate hand size for better tracking
export function calculateHandSize(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 21) return 0;

  const wrist = landmarks[0];
  const middleFingerTip = landmarks[12];
  
  return Math.sqrt(
    Math.pow(middleFingerTip.x - wrist.x, 2) +
    Math.pow(middleFingerTip.y - wrist.y, 2)
  );
}

// Calculate hand movement speed
export function calculateMovementSpeed(currentLandmarks: any[], previousLandmarks: any[]): number {
  if (!currentLandmarks || !previousLandmarks || currentLandmarks.length < 21 || previousLandmarks.length < 21) {
    return 0;
  }

  let totalMovement = 0;
  for (let i = 0; i < Math.min(currentLandmarks.length, previousLandmarks.length); i++) {
    const current = currentLandmarks[i];
    const previous = previousLandmarks[i];
    
    totalMovement += Math.sqrt(
      Math.pow(current.x - previous.x, 2) +
      Math.pow(current.y - previous.y, 2)
    );
  }

  return totalMovement / currentLandmarks.length;
}

// Analyze hand for suspicious activity
export function analyzeHandActivity(landmarks: any[], previousLandmarks: any[] | null, faceLandmarks: any[] | null): HandAnalysis {
  const gesture = recognizeGesture(landmarks);
  const handSize = calculateHandSize(landmarks);
  const movementSpeed = previousLandmarks ? calculateMovementSpeed(landmarks, previousLandmarks) : 0;
  
  // Check if hand is near face
  let isNearFace = false;
  if (faceLandmarks && faceLandmarks.length > 0) {
    const wrist = landmarks[0];
    const nose = faceLandmarks[1]; // Nose landmark in face mesh
    
    const distance = Math.sqrt(
      Math.pow(wrist.x - nose.x, 2) +
      Math.pow(wrist.y - nose.y, 2)
    );
    
    isNearFace = distance < 0.3;
  }

  // Detect suspicious activity
  const suspiciousActivity = (
    isNearFace ||
    movementSpeed > 0.1 ||
    (gesture.type === 'POINTING' && isNearFace) ||
    (gesture.type === 'CLOSED_FIST' && isNearFace) ||
    handSize < 0.05 // Very small hand might indicate hiding
  );

  return {
    landmarks,
    gesture,
    isNearFace,
    handSize,
    movementSpeed,
    suspiciousActivity
  };
}
