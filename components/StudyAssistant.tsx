import React from 'react';

interface StudyAssistantProps {
  summary: string;
  showSummary: boolean;
  studyMode: boolean;
  focusStatus: 'focused' | 'distracted' | 'idle';
  isProcessingFile: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStudyModeToggle: () => void;
}

const StudyAssistant: React.FC<StudyAssistantProps> = ({
  summary,
  showSummary,
  studyMode,
  focusStatus,
  isProcessingFile,
  onFileUpload,
  onStudyModeToggle
}) => {
  const getFocusColor = () => {
    switch (focusStatus) {
      case 'focused': return 'bg-green-600/90';
      case 'distracted': return 'bg-red-600/90';
      case 'idle': return 'bg-yellow-600/90';
      default: return 'bg-gray-600/90';
    }
  };

  const getFocusText = () => {
    switch (focusStatus) {
      case 'focused': return '✓ Focused - Keep studying!';
      case 'distracted': return '⚠ Distracted - Please focus';
      case 'idle': return '○ No face detected';
      default: return '? Status unknown';
    }
  };

  return (
    <>
      {/* Translucent Summary Display on Left Side - Bigger */}
      {showSummary && summary && (
        <div className="absolute left-4 top-24 w-96 max-h-[60vh] bg-black/80 backdrop-blur-xl border-2 border-white/30 rounded-xl p-6 z-30 overflow-y-auto shadow-2xl">
          <h3 className="text-white font-bold mb-4 text-xl border-b border-white/20 pb-2">
            📚 Study Summary
          </h3>
          <div className="text-white/95 text-base leading-relaxed space-y-2">
            {summary.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-2">{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessingFile && (
        <div className="absolute left-4 top-24 w-96 bg-blue-900/90 backdrop-blur-xl border-2 border-blue-400 rounded-xl p-4 z-30 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <div className="text-white text-lg font-semibold">
              Processing document...
            </div>
          </div>
        </div>
      )}

      {/* Focus Status Indicator - Bigger and More Visible */}
      {studyMode && (
        <div className="absolute left-4 bottom-32 z-30">
          <div className={`px-6 py-3 rounded-full ${getFocusColor()} text-white text-lg font-bold backdrop-blur-xl border-2 border-white/40 shadow-2xl transition-all duration-300`}>
            {getFocusText()}
          </div>
        </div>
      )}
    </>
  );
};

export default StudyAssistant;
