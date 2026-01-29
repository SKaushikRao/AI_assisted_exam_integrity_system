import React, { useEffect, useRef, useState } from 'react';

type VisualizationProps = {
  onClose: () => void;
};

const Visualization: React.FC<VisualizationProps> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Loading AI Models...');
  const lastHandRef = useRef<{ x: number; y: number } | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const lastHandTimeRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0, z: 50, vx: 0, vy: 0, vz: 0 });
  const [fact, setFact] = useState<string>('');

  useEffect(() => {
    let active = true;
    let renderer: any;
    let scene: any;
    let camera: any;
    let animationId = 0;
    let handsInstance: any;
    let cameraFeed: any;
    const resizeHandlers: Array<() => void> = [];
    let statusInterval: number | undefined;
    const followSpeed = 0.18;
    const zoomSpeed = 0.12;
    const damping = 0.82;
    const maxStep = 12;

    const init = async () => {
      if (!active) return;
      const container = containerRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!container || !video || !canvas) return;

      const THREE = (window as any).THREE;
      const HandsCtor = (window as any).Hands;
      const CameraCtor = (window as any).Camera;

      if (!THREE || !HandsCtor || !CameraCtor) {
        setStatus('Loading libraries...');
        setTimeout(init, 300);
        return;
      }

      setStatus('Initializing 3D Scene...');

      // --- THREE.JS SETUP ---
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      // Add Stars
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
      const starVertices: number[] = [];
      for (let i = 0; i < 10000; i++) {
        starVertices.push(
          THREE.MathUtils.randFloatSpread(2000),
          THREE.MathUtils.randFloatSpread(2000),
          THREE.MathUtils.randFloatSpread(2000)
        );
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      scene.add(new THREE.Points(starGeometry, starMaterial));

      // Create Sun
      const sunGeo = new THREE.SphereGeometry(5, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const sun = new THREE.Mesh(sunGeo, sunMat);
      scene.add(sun);

      // Create Planets
      const planets: Array<{ mesh: any; orbit: any; speed: number }> = [];
      const createPlanet = (size: number, color: number, distance: number, speed: number) => {
        const geo = new THREE.SphereGeometry(size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        const orbit = new THREE.Object3D();
        scene.add(orbit);
        orbit.add(mesh);
        mesh.position.x = distance;
        planets.push({ mesh, orbit, speed });
      };

      createPlanet(0.8, 0x888888, 10, 0.02); // Mercury
      createPlanet(1.2, 0xffaa00, 15, 0.015); // Venus
      createPlanet(1.3, 0x2233ff, 20, 0.01); // Earth
      createPlanet(1.0, 0xff3300, 25, 0.008); // Mars

      const light = new THREE.PointLight(0xffffff, 2, 100);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x404040));

      camera.position.z = 50;

      // --- MEDIAPIPE HANDS SETUP ---
      setStatus('Loading Hand Tracking...');
      const canvasCtx = canvas.getContext('2d');
      canvas.width = 640;
      canvas.height = 480;
      video.width = 640;
      video.height = 480;

      handsInstance = new HandsCtor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsInstance.onResults((results: any) => {
        if (!canvasCtx) return;
        lastHandTimeRef.current = Date.now();

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setStatus('Tracking Hands');
          if ((window as any).drawConnectors && (window as any).HAND_CONNECTIONS) {
            for (const landmarks of results.multiHandLandmarks) {
              (window as any).drawConnectors(canvasCtx, landmarks, (window as any).HAND_CONNECTIONS, { color: '#00ffcc', lineWidth: 2 });
              (window as any).drawLandmarks?.(canvasCtx, landmarks, { color: '#00ffcc', lineWidth: 1 });
            }
          }

          // Rotation using first hand
          const hand = results.multiHandLandmarks[0];
          lastHandRef.current = {
            x: (hand[0].x - 0.5) * 100,
            y: -(hand[0].y - 0.5) * 100
          };

          // Zoom if two hands detected
          if (results.multiHandLandmarks.length === 2) {
            const h1 = results.multiHandLandmarks[0][0];
            const h2 = results.multiHandLandmarks[1][0];
            const dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));
            lastZoomRef.current = Math.max(20, 150 - dist * 200);
          }
        } else {
          setStatus('No hands detected');
        }

        canvasCtx.restore();
      });

      cameraFeed = new CameraCtor(video, {
        onFrame: async () => {
          if (!active) return;
          try {
            await handsInstance.send({ image: video });
          } catch (err) {
            console.error('Hands processing error', err);
            setStatus('Hand tracking error');
          }
        },
        width: 640,
        height: 480
      });

      try {
        await cameraFeed.start();
      } catch (e) {
        setStatus('Camera permission denied');
      }

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        if (lastHandRef.current) {
          targetRef.current.x = lastHandRef.current.x;
          targetRef.current.y = lastHandRef.current.y;
        }
        if (lastZoomRef.current !== null) {
          targetRef.current.z = lastZoomRef.current;
        }

        const dx = targetRef.current.x - camera.position.x;
        const dy = targetRef.current.y - camera.position.y;
        const dz = targetRef.current.z - camera.position.z;

        targetRef.current.vx = (targetRef.current.vx + dx * followSpeed) * damping;
        targetRef.current.vy = (targetRef.current.vy + dy * followSpeed) * damping;
        targetRef.current.vz = (targetRef.current.vz + dz * zoomSpeed) * damping;

        const stepX = Math.max(-maxStep, Math.min(maxStep, targetRef.current.vx));
        const stepY = Math.max(-maxStep, Math.min(maxStep, targetRef.current.vy));
        const stepZ = Math.max(-maxStep, Math.min(maxStep, targetRef.current.vz));

        camera.position.x += stepX;
        camera.position.y += stepY;
        camera.position.z += stepZ;
        camera.lookAt(scene.position);
        planets.forEach(p => {
          p.orbit.rotation.y += p.speed;
          p.mesh.rotation.y += 0.01;
        });
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);
      resizeHandlers.push(() => window.removeEventListener('resize', handleResize));

      statusInterval = window.setInterval(() => {
        if (Date.now() - lastHandTimeRef.current > 1200) {
          setStatus('No hands detected');
        }
      }, 1000);
    };

    init();

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (cameraFeed) cameraFeed.stop();
      if (handsInstance) handsInstance.close();
      if (statusInterval) window.clearInterval(statusInterval);
      resizeHandlers.forEach(fn => fn());
      if (renderer) {
        renderer.dispose();
        if (containerRef.current && renderer.domElement.parentElement === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  useEffect(() => {
    const facts = [
      'A day on Venus is longer than its year.',
      'Neutron stars can spin 600 times per second.',
      'Jupiter has at least 95 moons.',
      'The Sun contains 99.8% of the Solar System’s mass.',
      'Saturn’s rings are mostly ice and dust.',
      'Mars has the largest volcano in the Solar System.',
      'Light from the Sun takes about 8 minutes to reach Earth.',
      'There may be more stars in the universe than grains of sand on Earth.',
      'The Milky Way is about 100,000 light-years across.',
      'Europa may have more water than all of Earth’s oceans combined.'
    ];

    let active = true;
    const pickFact = () => {
      const next = facts[Math.floor(Math.random() * facts.length)];
      if (active) setFact(next);
    };

    pickFact();
    const interval = window.setInterval(() => {
      pickFact();
    }, 12000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20"
        >
          Exit Visualization
        </button>
      </div>

      <div className="absolute top-4 left-4 mt-12 z-40 bg-black/60 text-white px-4 py-3 rounded-lg">
        <h2 className="text-lg font-semibold">🌌 Hand-Controlled Universe</h2>
        <p className="text-xs text-white/80 mt-1">1. Move hand to Rotate</p>
        <p className="text-xs text-white/80">2. Use two hands to Zoom (distance-based)</p>
        <p className="text-xs text-white/70 mt-1">Status: {status}</p>
      </div>

      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />

      <div className="absolute bottom-5 right-5 w-[200px] border border-white/30 rounded-lg overflow-hidden transform -scale-x-100 bg-black/50 z-40">
        <canvas ref={canvasRef} style={{ width: '100%' }} />
      </div>

      <div className="absolute top-4 right-4 z-40 max-w-xs bg-black/60 text-white px-4 py-3 rounded-lg border border-white/10">
        <div className="text-xs uppercase tracking-widest text-white/60">Space Fact</div>
        <div className="text-sm mt-2">{fact}</div>
      </div>

      <div ref={containerRef} className="w-screen h-screen" />
    </div>
  );
};

export default Visualization;
