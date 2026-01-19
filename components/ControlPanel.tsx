import React from 'react';
import { AppConfig, DetectionStatus, ExamMode } from '../types';

interface ControlPanelProps {
  score: number;
  status: DetectionStatus;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  aiAnalysis?: { status: string; message: string };
}

const ControlPanel: React.FC<ControlPanelProps> = ({ score, status, config, setConfig, aiAnalysis }) => {
  const isCritical = score < 60;

  return (
    <div className="h-full w-full bg-black border-l border-white/20 p-6 flex flex-col space-y-8 overflow-y-auto">
      
      {/* AI Summary Section (New) */}
      <div className="space-y-4 pb-6 border-b border-white/10">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${aiAnalysis?.status === 'SUSPICIOUS' ? 'bg-red-500' : 'bg-green-500'}`}></span>
            AI Proctor Summary
        </h2>
        <div className={`p-4 border text-sm leading-relaxed transition-colors duration-500 ${
            aiAnalysis?.status === 'SUSPICIOUS' 
                ? 'border-red-500/50 bg-red-900/10 text-red-100' 
                : aiAnalysis?.status === 'ERROR'
                ? 'border-zinc-700 bg-zinc-900 text-zinc-500'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-300'
        }`}>
            {aiAnalysis?.message || "Waiting for initial AI analysis..."}
        </div>
      </div>

      {/* Integrity Score Section */}
      <div className="space-y-4">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Integrity Score</h2>
        <div className="flex items-end space-x-2">
            <span className={`text-6xl font-thin tracking-tighter transition-colors duration-500 ${isCritical ? 'text-red-500' : 'text-white'}`}>
                {Math.round(score)}
            </span>
            <span className="text-zinc-500 pb-2">/ 100</span>
        </div>
        <div className="w-full h-1 bg-zinc-800 relative overflow-hidden">
            <div 
                className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isCritical ? 'bg-red-600' : 'bg-white'}`}
                style={{ width: `${score}%` }}
            />
        </div>
      </div>

      {/* Live Status Indicators */}
      <div className="space-y-4">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Live Signals</h2>
        <div className="space-y-2 text-sm font-light">
            <StatusRow label="Face Detected" active={status.faceDetected} neutral />
            <StatusRow label="Face Consistency" active={!status.multipleFaces} alert={status.multipleFaces} />
            <StatusRow label="Gaze Tracking" active={!status.isLookingAway} alert={status.isLookingAway} />
            <StatusRow label="Voice Activity" active={!status.isTalking} alert={status.isTalking} />
            <StatusRow label="Hands Visible" active={status.handsDetected} neutral />
            <StatusRow label="Hands Clear" active={!status.handNearFace} alert={status.handNearFace} />
        </div>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* Controls */}
      <div className="space-y-6 flex-1">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Configuration</h2>
        
        {/* Exam Mode */}
        <div className="space-y-2">
            <label className="text-xs text-zinc-400">Exam Mode</label>
            <select 
                value={config.examMode}
                onChange={(e) => setConfig(prev => ({ ...prev, examMode: e.target.value as ExamMode }))}
                className="w-full bg-black border border-white/20 text-white text-sm p-2 outline-none focus:border-white transition-colors"
            >
                <option value="MCQ">Multiple Choice</option>
                <option value="Coding">Coding Challenge</option>
                <option value="Written">Written Essay</option>
            </select>
        </div>

        {/* Privacy Mode */}
        <div className="flex items-center justify-between">
            <span className="text-sm">Privacy Mode</span>
            <Toggle 
                checked={config.privacyMode} 
                onChange={() => setConfig(prev => ({ ...prev, privacyMode: !prev.privacyMode }))} 
            />
        </div>
        <p className="text-[10px] text-zinc-600 -mt-4">
            {config.privacyMode ? "Only storing flagged event frames." : "Metrics only. No images saved."}
        </p>

        {/* Voice Activity Detection */}
        <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Voice Activity Detection</span>
            <Toggle 
                checked={config.voiceActivityDetection} 
                onChange={() => setConfig(prev => ({ ...prev, voiceActivityDetection: !prev.voiceActivityDetection }))} 
            />
        </div>

        {/* Invisible Proctor */}
        <div className="flex items-center justify-between">
            <span className="text-sm">Invisible Proctor</span>
            <Toggle 
                checked={config.invisibleProctor} 
                onChange={() => setConfig(prev => ({ ...prev, invisibleProctor: !prev.invisibleProctor }))} 
            />
        </div>

         {/* Demo Mode */}
         <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-sm text-zinc-400">Demo Mode</span>
            <Toggle 
                checked={config.demoMode} 
                onChange={() => setConfig(prev => ({ ...prev, demoMode: !prev.demoMode }))} 
            />
        </div>
      </div>

    </div>
  );
};
//pitch_!

const StatusRow = ({ label, active, alert, neutral }: { label: string, active: boolean, alert?: boolean, neutral?: boolean }) => (
    <div className="flex justify-between items-center">
        <span className="text-zinc-300">{label}</span>
        <span className={`text-xs px-2 py-0.5 border ${
            alert ? 'border-red-500 text-red-500 bg-red-500/10' :
            active ? 'border-zinc-700 text-zinc-500' : // Normal state (e.g. looking straight)
            neutral ? 'border-zinc-800 text-zinc-600' : // Not detected/present
            'border-red-500 text-red-500' // Bad state
        }`}>
            {alert ? 'FLAG' : active ? 'OK' : 'NO'}
        </span>
    </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <div 
        onClick={onChange}
        className={`w-10 h-5 relative cursor-pointer border transition-colors duration-300 ${checked ? 'border-white bg-white/10' : 'border-zinc-700 bg-black'}`}
    >
        <div className={`absolute top-0.5 bottom-0.5 w-3.5 bg-white transition-all duration-300 ${checked ? 'left-5' : 'left-0.5'}`} />
    </div>
);

export default ControlPanel;