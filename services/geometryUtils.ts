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
  // Upper lip bottom: 13, Lower lip top: 14
  // Face height reference: 10 (top), 152 (bottom)
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  if (!upperLip || !lowerLip || !forehead || !chin) return 0;

  const mouthDistance = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
  const faceHeight = Math.hypot(forehead.x - chin.x, forehead.y - chin.y);

  return mouthDistance / faceHeight;
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