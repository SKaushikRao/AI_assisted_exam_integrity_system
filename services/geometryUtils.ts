/**
 * Calculates a rough estimate of head pose (yaw/pitch) based on 2D face landmarks.
 * This is a simplified projection for browser performance.
 */
export const calculateHeadPose = (landmarks: any[]) => {
  // Key landmarks for FaceMesh
  const noseTip = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const chin = landmarks[152];
  const forehead = landmarks[10];

  if (!noseTip || !leftCheek || !rightCheek || !chin || !forehead) return { yaw: 0, pitch: 0 };

  // Yaw: Relative horizontal position of nose between cheeks
  const midPointX = (leftCheek.x + rightCheek.x) / 2;
  const width = Math.abs(rightCheek.x - leftCheek.x);
  const yaw = (noseTip.x - midPointX) / width; // -0.5 to 0.5 roughly

  // Pitch: Relative vertical position of nose between chin and forehead
  const midPointY = (forehead.y + chin.y) / 2;
  const height = Math.abs(chin.y - forehead.y);
  const pitch = (noseTip.y - midPointY) / height;

  return { yaw, pitch };
};

/**
 * Calculates mouth openness ratio to detect talking.
 */
export const calculateMouthOpenness = (landmarks: any[]) => {
  // Enhanced mouth detection with multiple landmarks
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];
  const leftMouth = landmarks[61]; // Left corner
  const rightMouth = landmarks[291]; // Right corner
  const forehead = landmarks[10];
  const chin = landmarks[152];

  if (!upperLip || !lowerLip || !forehead || !chin || !leftMouth || !rightMouth) return 0;

  // Calculate mouth opening (vertical distance)
  const mouthDistance = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
  
  // Calculate mouth width (horizontal distance)
  const mouthWidth = Math.hypot(leftMouth.x - rightMouth.x, leftMouth.y - rightMouth.y);
  
  // Face height reference
  const faceHeight = Math.hypot(forehead.x - chin.x, forehead.y - chin.y);

  // Enhanced metric: considers both opening and width changes
  const mouthRatio = mouthDistance / faceHeight;
  const mouthActivity = (mouthWidth / faceHeight) * 2; // Weight mouth width changes
  
  return Math.max(mouthRatio, mouthActivity);
};

/**
 * Enhanced talking detection with multiple metrics.
 */
export const detectTalkingActivity = (landmarks: any[], previousLandmarks?: any[]) => {
  const currentMouthOpenness = calculateMouthOpenness(landmarks);
  
  // Basic mouth opening detection
  const isMouthOpen = currentMouthOpenness > 0.02; // Lowered threshold for sensitivity
  
  // Lip movement detection (comparing with previous frame)
  let lipMovement = 0;
  if (previousLandmarks && previousLandmarks.length > 0) {
    const prevUpperLip = previousLandmarks[13];
    const prevLowerLip = previousLandmarks[14];
    const currUpperLip = landmarks[13];
    const currLowerLip = landmarks[14];
    
    if (prevUpperLip && prevLowerLip && currUpperLip && currLowerLip) {
      const prevDistance = Math.hypot(prevUpperLip.x - prevLowerLip.x, prevUpperLip.y - prevLowerLip.y);
      const currDistance = Math.hypot(currUpperLip.x - currLowerLip.x, currUpperLip.y - currLowerLip.y);
      lipMovement = Math.abs(currDistance - prevDistance);
    }
  }
  
  // Multiple talking indicators
  const indicators = {
    mouthOpen: isMouthOpen,
    lipMovement: lipMovement > 0.005,
    sustainedActivity: currentMouthOpenness > 0.015
  };
  
  // Talking detected if multiple indicators are true
  const talkingScore = [indicators.mouthOpen, indicators.lipMovement, indicators.sustainedActivity].filter(Boolean).length;
  
  return {
    isTalking: talkingScore >= 2, // At least 2 indicators must be true
    confidence: talkingScore / 3,
    mouthOpenness: currentMouthOpenness,
    lipMovement: lipMovement,
    indicators: indicators
  };
};

/**
 * Enhanced eye gaze detection for cheating.
 */
export const detectEyeGaze = (landmarks: any[]) => {
  // Eye landmarks
  const leftEye = [landmarks[33], landmarks[7], landmarks[163], landmarks[144], landmarks[145], landmarks[153], landmarks[154], landmarks[155], landmarks[133]];
  const rightEye = [landmarks[362], landmarks[398], landmarks[384], landmarks[381], landmarks[382], landmarks[380], landmarks[374], landmarks[373], landmarks[390]];
  const nose = landmarks[1];
  
  if (!nose) return { leftGaze: 'center', rightGaze: 'center', suspicious: false };
  
  // Calculate eye centers
  const leftEyeCenter = leftEye.reduce((acc, point) => ({
    x: acc.x + (point?.x || 0) / leftEye.length,
    y: acc.y + (point?.y || 0) / leftEye.length
  }), { x: 0, y: 0 });
  
  const rightEyeCenter = rightEye.reduce((acc, point) => ({
    x: acc.x + (point?.x || 0) / rightEye.length,
    y: acc.y + (point?.y || 0) / rightEye.length
  }), { x: 0, y: 0 });
  
  // Determine gaze direction relative to nose
  const leftGazeX = leftEyeCenter.x - nose.x;
  const rightGazeX = rightEyeCenter.x - nose.x;
  
  const threshold = 0.05; // Sensitivity threshold
  
  const leftGaze = Math.abs(leftGazeX) > threshold ? (leftGazeX > 0 ? 'right' : 'left') : 'center';
  const rightGaze = Math.abs(rightGazeX) > threshold ? (rightGazeX > 0 ? 'right' : 'left') : 'center';
  
  // Suspicious if eyes are looking in different directions
  const suspicious = leftGaze !== rightGaze && leftGaze !== 'center' && rightGaze !== 'center';
  
  return { leftGaze, rightGaze, suspicious };
};

/**
 * Detect suspicious head movements for cheating.
 */
export const detectSuspiciousHeadMovement = (currentLandmarks: any[], previousLandmarks?: any[]) => {
  if (!previousLandmarks || previousLandmarks.length === 0) {
    return { rapidMovement: false, lookingAround: false, confidence: 0 };
  }
  
  const currentNose = currentLandmarks[1];
  const prevNose = previousLandmarks[1];
  
  if (!currentNose || !prevNose) return { rapidMovement: false, lookingAround: false, confidence: 0 };
  
  // Calculate head movement
  const movement = Math.hypot(currentNose.x - prevNose.x, currentNose.y - prevNose.y);
  
  // Rapid movement detection
  const rapidMovement = movement > 0.1; // Significant head movement
  
  // Looking around detection (frequent direction changes)
  const currentPose = calculateHeadPose(currentLandmarks);
  const prevPose = calculateHeadPose(previousLandmarks);
  
  const yawChange = Math.abs(currentPose.yaw - prevPose.yaw);
  const pitchChange = Math.abs(currentPose.pitch - prevPose.pitch);
  
  const lookingAround = yawChange > 0.15 || pitchChange > 0.15;
  
  const confidence = Math.max(movement, yawChange, pitchChange);
  
  return {
    rapidMovement,
    lookingAround,
    confidence,
    movementAmount: movement
  };
};

/**
 * Calculates distance between hand and face centroid.
 */
export const calculateHandFaceDistance = (handLandmarks: any[], faceLandmarks: any[]) => {
    if (!handLandmarks || handLandmarks.length === 0 || !faceLandmarks) return 1.0;

    // Simple centroid calc
    const handX = handLandmarks[9].x; // Middle finger knuckle
    const handY = handLandmarks[9].y;

    const faceX = faceLandmarks[1].x; // Nose tip
    const faceY = faceLandmarks[1].y;

    return Math.hypot(handX - faceX, handY - faceY);
};