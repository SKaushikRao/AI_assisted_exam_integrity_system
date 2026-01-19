import React, { useEffect, useRef, useState, useCallback } from 'react';
import Timeline from './components/Timeline';
import ControlPanel from './components/ControlPanel';
import { IntegrityEvent, AppConfig, DetectionStatus } from './types';
import { calculateHeadPose, calculateMouthOpenness, calculateHandFaceDistance } from './services/geometryUtils';
import { analyzeFrameWithPuter, AIAnalysisResult } from './services/groqService';
import { drawEnhancedHandMesh, analyzeHandActivity, HandAnalysis } from './services/handMeshUtils';

// --- Constants ---
const MAX_SCORE = 100;
const YAW_THRESHOLD = 0.25; // Sensitivity for looking left/right
const PITCH_THRESHOLD = 0.20; // Sensitivity for looking up/down
const TALK_THRESHOLD = 0.15; // Mouth openness ratio

// --- Initial State ---
const INITIAL_CONFIG: AppConfig = {
  privacyMode: true,
  invisibleProctor: false,
  examMode: 'MCQ',
  demoMode: false,
  voiceActivityDetection: true, // Enable voice activity detection by default
};

const INITIAL_STATUS: DetectionStatus = {
  faceDetected: false,
  handsDetected: false,
  isTalking: false,
  isLookingAway: false,
  multipleFaces: false,
  handNearFace: false,
};

const App: React.FC = () => {
  // --- Refs & State ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [score, setScore] = useState(100);
  const [events, setEvents] = useState<IntegrityEvent[]>([]);
  const [status, setStatus] = useState<DetectionStatus>(INITIAL_STATUS);
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraPermission, setCameraPermission] = useState(false);

  // AI State
  const [aiResult, setAiResult] = useState<AIAnalysisResult>({ status: 'INIT', message: "MediaPipe AI Ready - Local detection only", model: "MediaPipe (Enhanced)" });
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Logic Timers
  const lastEventTime = useRef<number>(0);
  const missingFaceStartTime = useRef<number | null>(null);
  const lookingAwayStartTime = useRef<number | null>(null);
  const talkingStartTime = useRef<number | null>(null);
  
  // MediaPipe Instances & Results Storage
  const faceMeshRef = useRef<any>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  const latestFaceResults = useRef<any>(null);
  const latestHandResults = useRef<any>(null);
  const previousHandLandmarks = useRef<any[][]>([]);

  // --- Helper: Capture Screenshot (High Res for Logs) ---
  const captureScreenshot = useCallback((): string | undefined => {
    if (!config.privacyMode) return undefined;
    if (canvasRef.current && videoRef.current) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        ctx.drawImage(canvasRef.current, 0, 0); // Overlay mesh
        return tempCanvas.toDataURL('image/jpeg', 0.5);
      }
    }
    return undefined;
  }, [config.privacyMode]);

  // --- Helper: Capture Low Res Frame (For AI API) ---
  const captureLowResFrame = useCallback((): string | undefined => {
      if (!videoRef.current) return undefined;
      const tempCanvas = document.createElement('canvas');
      // Scale down to 240px width to save bandwidth/latency
      const targetWidth = 240;
      const scale = targetWidth / videoRef.current.videoWidth;
      tempCanvas.width = targetWidth;
      tempCanvas.height = videoRef.current.videoHeight * scale;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
          // Low quality jpeg to keep base64 string short
          return tempCanvas.toDataURL('image/jpeg', 0.5);
      }
      return undefined;
  }, []);

  // --- Helper: Log Event ---
  const logEvent = useCallback((type: IntegrityEvent['type'], severity: IntegrityEvent['severity'], description: string) => {
    const now = Date.now();
    // Debounce similar events
    if (now - lastEventTime.current < 2000) return; 

    lastEventTime.current = now;

    const newEvent: IntegrityEvent = {
      id: crypto.randomUUID(),
      timestamp: now,
      type,
      severity,
      description,
      screenshotUrl: captureScreenshot(),
    };

    setEvents(prev => [...prev, newEvent]);

    if (!config.invisibleProctor) {
       console.log("ALERT:", description);
    }
  }, [config.invisibleProctor, captureScreenshot]);

  // --- Core Processing Loop (Draw & Analyze) ---
  const processFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // 1. Clear Canvas
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    
    // 2. Retrieve Latest Data
    const faceResults = latestFaceResults.current;
    const handResults = latestHandResults.current;

    // Debug: Log detection status
    console.log("Processing frame - Face detected:", !!faceResults?.multiFaceLandmarks?.length, "Hands detected:", !!handResults?.multiHandLandmarks?.length);

    // TEST: Draw simple orange box to verify canvas is working
    ctx.fillStyle = '#ff880050';
    ctx.fillRect(10, 10, 80, 30);
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 16px Inter';
    ctx.fillText('HAND DETECTION TEST', 15, 30);

    let currentStatus = { ...INITIAL_STATUS };
    let deduction = 0;

    // --- Face Logic ---
    if (faceResults && faceResults.multiFaceLandmarks && faceResults.multiFaceLandmarks.length > 0) {
      currentStatus.faceDetected = true;
      
      if (faceResults.multiFaceLandmarks.length > 1) {
        currentStatus.multipleFaces = true;
        deduction += 5; // Immediate heavy penalty
        logEvent('MULTIPLE_FACES', 'HIGH', 'Multiple people detected.');
      }

      const landmarks = faceResults.multiFaceLandmarks[0];

      // Draw Face Mesh
      if (window.drawConnectors && window.FACEMESH_TESSELATION) {
          window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, { color: '#ffffff10', lineWidth: 0.5 });
      }
      if (window.drawConnectors && window.FACEMESH_RIGHT_EYE) {
          window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, { color: '#ffffff', lineWidth: 1 });
          window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, { color: '#ffffff', lineWidth: 1 });
          window.drawConnectors(ctx, landmarks, window.FACEMESH_LIPS, { color: '#ffffff', lineWidth: 1 });
          window.drawConnectors(ctx, landmarks, window.FACEMESH_FACE_OVAL, { color: '#ffffff50', lineWidth: 1 });
      }
      
      // Draw face landmarks for debugging
      if (window.drawLandmarks) {
          window.drawLandmarks(ctx, landmarks, { color: '#00ff00', lineWidth: 1, radius: 2 });
      }

      // Head Pose & Exam Mode Logic
      const { yaw, pitch } = calculateHeadPose(landmarks);
      
      let isLookingAway = false;
      if (Math.abs(yaw) > YAW_THRESHOLD) isLookingAway = true;
      if (pitch < -PITCH_THRESHOLD) isLookingAway = true; 
      const maxLookDown = config.examMode === 'Written' ? 0.8 : PITCH_THRESHOLD;
      if (pitch > maxLookDown) isLookingAway = true;

      if (isLookingAway) {
        currentStatus.isLookingAway = true;
        if (!lookingAwayStartTime.current) lookingAwayStartTime.current = Date.now();
        else if (Date.now() - lookingAwayStartTime.current > 2000) {
           deduction += 0.1;
           if (Date.now() - lastEventTime.current > 5000) {
               const dir = yaw > 0 ? "Right" : yaw < 0 ? "Left" : pitch > 0 ? "Down" : "Up";
               logEvent('LOOKING_AWAY', 'MEDIUM', `Looking ${dir} detected.`);
           }
        }
      } else {
        lookingAwayStartTime.current = null;
      }

      // Talking
      const mouthOpen = calculateMouthOpenness(landmarks);
      if (mouthOpen > TALK_THRESHOLD && config.voiceActivityDetection) {
         currentStatus.isTalking = true;
         if (!talkingStartTime.current) talkingStartTime.current = Date.now();
         else if (Date.now() - talkingStartTime.current > 1500) {
             deduction += 0.2;
             if (Date.now() - lastEventTime.current > 4000) {
                 logEvent('TALKING', 'MEDIUM', 'Sustained mouth movement detected.');
             }
         }
      } else {
          talkingStartTime.current = null;
      }

      missingFaceStartTime.current = null;

    } else {
      // No Face Logic
      if (!missingFaceStartTime.current) missingFaceStartTime.current = Date.now();
      else if (Date.now() - missingFaceStartTime.current > 3000) {
          deduction += 0.5; // Heavy drain
          if (Date.now() - lastEventTime.current > 5000) {
            logEvent('FACE_MISSING', 'HIGH', 'Face not visible for > 3 seconds.');
          }
      }
    }

    // --- Enhanced Hand Logic ---
    // Debug: Check if hand results exist
    if (handResults) {
        console.log("Hand results received:", handResults);
        console.log("MultiHandLandmarks:", handResults.multiHandLandmarks);
        console.log("MultiHandedness:", handResults.multiHandedness);
    }
    
    if (handResults && handResults.multiHandLandmarks && handResults.multiHandLandmarks.length > 0) {
        currentStatus.handsDetected = true;
        console.log("Processing", handResults.multiHandLandmarks.length, "hands");
        
        for (let handIndex = 0; handIndex < handResults.multiHandLandmarks.length; handIndex++) {
            const landmarks = handResults.multiHandLandmarks[handIndex];
            const handedness = handResults.multiHandedness?.[handIndex];
            const isRightHand = handedness?.label === 'Right';
            
            console.log(`Hand ${handIndex} landmarks:`, landmarks?.length || 0);
            
            if (!landmarks || landmarks.length < 21) {
                console.warn("Invalid landmarks for hand", handIndex);
                continue;
            }
            
            // Analyze hand activity with enhanced detection
            const faceLandmarks = faceResults?.multiFaceLandmarks?.[0] || null;
            const previousLandmarks = previousHandLandmarks.current[handIndex] || null;
            const handAnalysis: HandAnalysis = analyzeHandActivity(landmarks, previousLandmarks, faceLandmarks);
            
            // Enhanced hand mesh drawing with signature orange color
            let meshColor = '#ff8800'; // Signature orange
            let lineWidth = 3;
            
            if (handAnalysis.suspiciousActivity) {
                meshColor = '#ff4444'; // Red for suspicious
                lineWidth = 4;
                deduction += 0.3;
                
                if (Date.now() - lastEventTime.current > 3000) {
                    if (handAnalysis.isNearFace) {
                        logEvent('HAND_NEAR_FACE', 'HIGH', `Hand near face detected: ${handAnalysis.gesture.description}`);
                    } else if (handAnalysis.movementSpeed > 0.1) {
                        logEvent('SUSPICIOUS_HAND_MOVEMENT', 'MEDIUM', `Rapid hand movement: ${handAnalysis.gesture.description}`);
                    } else {
                        logEvent('SUSPICIOUS_HAND_ACTIVITY', 'MEDIUM', `Suspicious hand activity: ${handAnalysis.gesture.description}`);
                    }
                }
            }
            
            // Draw enhanced hand mesh
            try {
                drawEnhancedHandMesh(ctx, landmarks, {
                    color: meshColor,
                    lineWidth: lineWidth,
                    pointRadius: 4,
                    showConnections: true,
                    showLandmarks: true,
                    fillMesh: false
                });
                
                // Draw gesture label
                if (handAnalysis.gesture.confidence > 0.5) {
                    const wrist = landmarks[0];
                    ctx.fillStyle = meshColor;
                    ctx.font = 'bold 14px Inter';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    ctx.strokeText(
                        `${isRightHand ? 'R' : 'L'}: ${handAnalysis.gesture.type}`,
                        wrist.x * ctx.canvas.width + 10,
                        wrist.y * ctx.canvas.height - 10
                    );
                    ctx.fillText(
                        `${isRightHand ? 'R' : 'L'}: ${handAnalysis.gesture.type}`,
                        wrist.x * ctx.canvas.width + 10,
                        wrist.y * ctx.canvas.height - 10
                    );
                }
                
                console.log(`Successfully drew hand mesh for hand ${handIndex}`);
            } catch (drawError) {
                console.error("Error drawing hand mesh:", drawError);
            }
            
            // Update hand near face detection
            if (handAnalysis.isNearFace) {
                currentStatus.handNearFace = true;
            }
            
            // Store current landmarks for next frame
            previousHandLandmarks.current[handIndex] = landmarks;
        }
    } else {
        // Fallback: Draw simple hand indicator if MediaPipe fails
        if (latestHandResults.current === null && Date.now() % 5000 < 100) {
            console.log("Drawing fallback hand indicator");
            ctx.fillStyle = '#ff880080';
            ctx.fillRect(50, 50, 100, 20);
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 16px Inter';
            ctx.fillText('HAND DETECTION ACTIVE', 60, 65);
        }
    }

    ctx.restore();
    setStatus(currentStatus);

    // Apply Score Updates
    setScore(prev => {
        let recovery = 0.05;
        if (deduction > 0) recovery = 0;
        let multiplier = 1;
        if (config.examMode === 'Coding') multiplier = 1.2;
        if (config.examMode === 'Written') multiplier = 0.8;
        return Math.max(0, Math.min(100, prev - (deduction * multiplier) + recovery));
    });

  }, [config.examMode, config.invisibleProctor, logEvent, config.privacyMode]);

  const processFrameRef = useRef(processFrame);
  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  // --- AI Integration Loop (DISABLED - MediaPipe Only) ---
  useEffect(() => {
    // DISABLED: Using MediaPipe-only detection to prevent external AI interference
    console.log("AI analysis disabled - Using MediaPipe detection only");
    return () => {};
  }, []);

  // --- Initialization Effect ---
  useEffect(() => {
    let active = true;

    // Set a timeout to ensure UI shows even if MediaPipe fails
    const timeoutId = setTimeout(() => {
      if (active) {
        setIsLoading(false);
        console.log("Loading timeout reached - showing UI anyway");
      }
    }, 3000);

    const initAI = async () => {
      if (!window.FaceMesh || !window.Hands || !window.Camera) {
        console.warn("MediaPipe global not found, retrying...");
        setTimeout(initAI, 500);
        return;
      }

      clearTimeout(timeoutId);
      console.log("Initializing MediaPipe Models...");

      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 2,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        staticImageMode: false,
      });

      faceMesh.onResults((results: any) => {
        latestFaceResults.current = results;
        processFrameRef.current();
      });

      const hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      
      // Use the most stable configuration to avoid WASM memory errors
      try {
        hands.setOptions({
          maxNumHands: 1, // Start with 1 hand to reduce memory usage
          minDetectionConfidence: 0.7, // Higher confidence to reduce false positives
          minTrackingConfidence: 0.7, // Higher tracking confidence
          modelComplexity: 0, // Use simplest model
        });
        console.log("Hands model configured with stable settings");
      } catch (error) {
        console.error("Failed to configure Hands model:", error);
        // Try with minimal options
        try {
          hands.setOptions({
            maxNumHands: 1,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.8,
          });
          console.log("Hands model configured with minimal settings");
        } catch (fallbackError) {
          console.error("Failed to configure Hands model even with fallback:", fallbackError);
        }
      }

      hands.onResults((results: any) => {
        if (results && results.multiHandLandmarks) {
          console.log("Hand detected:", results.multiHandLandmarks.length, "hands");
        }
        latestHandResults.current = results;
        processFrameRef.current();
      });

      faceMeshRef.current = faceMesh;
      handsRef.current = hands;

      if (videoRef.current) {
        videoRef.current.width = 1280;
        videoRef.current.height = 720;
        
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (!active) return;
            if (config.demoMode) return;
            try {
               await faceMesh.send({ image: videoRef.current });
               await hands.send({ image: videoRef.current });
            } catch (err) {
               console.error("MediaPipe processing error:", err);
            }
          },
          width: 1280,
          height: 720,
        });
        
        cameraRef.current = camera;
        
        try {
            await camera.start();
            setCameraPermission(true);
            setIsLoading(false);
            console.log("Camera started successfully");
        } catch (e) {
            console.error("Camera failed to start", e);
            setCameraPermission(false);
            setIsLoading(false);
        }
      }
    };

    initAI();

    return () => {
      active = false;
      if (cameraRef.current) cameraRef.current.stop();
      if (faceMeshRef.current) faceMeshRef.current.close();
      if (handsRef.current) handsRef.current.close();
    };
  }, []); 

  // --- Demo Mode Simulation ---
  useEffect(() => {
    if (!config.demoMode) return;
    const interval = setInterval(() => {
        const random = Math.random();
        if (random > 0.95) {
            logEvent('LOOKING_AWAY', 'LOW', 'Simulated: Gaze drift detected');
            setScore(s => Math.max(0, s - 5));
            setStatus(prev => ({...prev, isLookingAway: true}));
            setTimeout(() => setStatus(prev => ({...prev, isLookingAway: false})), 1000);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [config.demoMode, logEvent]);


  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-sans selection:bg-red-900 selection:text-white">
      
      {/* --- Main Content Area --- */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left: Video Feed */}
        <div className={`relative flex-grow flex items-center justify-center bg-zinc-900 transition-colors duration-1000 ${config.invisibleProctor && score < 60 ? 'border-[10px] border-red-900/50' : ''}`}>
           
           {isLoading && (
             <div className="absolute z-10 text-center animate-pulse pointer-events-none">
                <div className="text-2xl font-thin tracking-widest mb-2">INITIALIZING AI MODELS</div>
                <div className="text-xs text-zinc-500">Accessing Camera & Loading WebAssembly...</div>
             </div>
           )}

           {!cameraPermission && !isLoading && !config.demoMode && (
             <div className="absolute z-10 text-center text-red-500 pointer-events-none">
                <div className="text-xl">Camera Access Denied</div>
                <div className="text-sm text-zinc-400 mt-2">Enable Demo Mode in settings to preview UI.</div>
             </div>
           )}

            {/* AI OVERLAY DIALOG */}
            {cameraPermission && !config.demoMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center space-y-2 w-full max-w-md">
                    <div className={`backdrop-blur-md border rounded-full px-6 py-2 flex items-center space-x-3 shadow-2xl transition-all duration-300 ${
                        aiResult.status === 'SUSPICIOUS' ? 'bg-red-900/40 border-red-500/50' : 
                        aiResult.status === 'ERROR' ? 'bg-zinc-900/80 border-red-500/20' :
                        'bg-black/40 border-white/20'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                            isAiAnalyzing ? 'bg-yellow-400 animate-ping' : 
                            aiResult.status === 'SUSPICIOUS' ? 'bg-red-500' :
                            aiResult.status === 'ERROR' ? 'bg-zinc-500' :
                            'bg-green-500'
                        }`} />
                        <span className={`text-xs font-bold tracking-widest uppercase ${
                             aiResult.status === 'SUSPICIOUS' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                            MODEL: {aiResult.model}
                        </span>
                        <div className="h-4 w-px bg-white/20" />
                        <span className={`text-sm font-light truncate max-w-[200px] md:max-w-xs ${
                            aiResult.status === 'SUSPICIOUS' ? 'text-red-100 font-medium' : 'text-white'
                        }`}>
                            {aiResult.message}
                        </span>
                    </div>
                </div>
            )}

           {/* Video Feed - Clean, no filters, mirrored */}
           <video 
             ref={videoRef}
             className="absolute w-full h-full object-cover transform -scale-x-100"
             playsInline
             muted
           />
           {/* Canvas Overlay - Must match video transform & dimensions */}
           <canvas 
             ref={canvasRef}
             className="absolute w-full h-full object-cover z-0 transform -scale-x-100"
             width={1280}
             height={720}
           />

            {/* Bounding Box Effect (Visual Only) */}
            {status.faceDetected && (
                <div className="absolute w-64 h-64 border border-white/30 rounded-full animate-pulse z-0 pointer-events-none" />
            )}

            {/* Invisible Proctor Warning Toast */}
            {!config.invisibleProctor && (status.isLookingAway || status.isTalking || status.multipleFaces) && (
                <div className="absolute top-20 bg-black/80 border-l-4 border-red-600 backdrop-blur-md px-6 py-4 shadow-2xl animate-bounce z-50">
                    <div className="text-red-500 font-bold uppercase tracking-widest text-xs mb-1">Warning</div>
                    <div className="text-lg font-light">
                        {status.multipleFaces ? "Multiple faces detected" : 
                         status.isTalking ? "Talking detected" : "Please look at the screen"}
                    </div>
                </div>
            )}
        </div>

        {/* Right: Control Panel */}
        <div className="w-80 md:w-96 flex-shrink-0 z-10 shadow-2xl bg-black">
          <ControlPanel 
            score={score} 
            status={status}
            config={config}
            setConfig={setConfig}
            aiAnalysis={aiResult}
          />
        </div>
      </div>

      {/* --- Bottom: Timeline --- */}
      <div className="h-32 flex-shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <Timeline 
            events={events} 
            onEventClick={(evt) => console.log("Focus event", evt)} 
        />
      </div>

    </div>
  );
};

export default App;