export type ExamMode = 'MCQ' | 'Coding' | 'Written';

export interface IntegrityEvent {
  id: string;
  timestamp: number;
  type: 'LOOKING_AWAY' | 'FACE_MISSING' | 'MULTIPLE_FACES' | 'TALKING' | 'HAND_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  screenshotUrl?: string; // Data URL
  description: string;
}

export interface DetectionStatus {
  faceDetected: boolean;
  handsDetected: boolean;
  isTalking: boolean;
  isLookingAway: boolean;
  multipleFaces: boolean;
  handNearFace: boolean;
}

export interface AppConfig {
  privacyMode: boolean; // "Save flagged frames only" vs "Metrics only"
  invisibleProctor: boolean;
  examMode: ExamMode;
  demoMode: boolean;
}

// MediaPipe Global Types (since we load via script tags)
declare global {
  interface Window {
    FaceMesh: any;
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_RIGHT_EYEBROW: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_LEFT_EYEBROW: any;
    FACEMESH_FACE_OVAL: any;
    FACEMESH_LIPS: any;
    HAND_CONNECTIONS: any;
    puter: any;
  }
}