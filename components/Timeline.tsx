import React from 'react';
import { IntegrityEvent } from '../types';

interface TimelineProps {
  events: IntegrityEvent[];
  onEventClick: (event: IntegrityEvent) => void;
}

const Timeline: React.FC<TimelineProps> = ({ events, onEventClick }) => {
  return (
    <div className="h-full w-full bg-black border-t border-white/20 flex flex-col">
      <div className="px-4 py-2 text-xs text-zinc-500 uppercase tracking-widest font-bold">
        Event Timeline
      </div>
      <div className="flex-1 relative overflow-x-auto overflow-y-hidden px-4 flex items-center space-x-1">
        {events.length === 0 && (
          <div className="text-zinc-700 text-xs italic w-full text-center">
            Session clear. No suspicious activity detected.
          </div>
        )}
        
        {events.map((evt) => (
          <div
            key={evt.id}
            onClick={() => onEventClick(evt)}
            className="group relative cursor-pointer flex-shrink-0"
          >
            {/* The Marker */}
            <div 
              className={`w-1 h-8 transition-all duration-300 ${
                evt.severity === 'HIGH' ? 'bg-red-600 h-12' : 
                evt.severity === 'MEDIUM' ? 'bg-red-400 h-10' : 'bg-zinc-400 h-6'
              }`} 
            />
            
            {/* Tooltip on Hover */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-[9999] w-80 max-h-80 overflow-auto">
                <div className="bg-zinc-900 border border-white/20 p-3 shadow-xl rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-red-500 font-bold text-xs flex items-center">
                            {evt.type}
                            {/* Multiple People Indicator */}
                            {evt.type === 'MULTIPLE_FACES' && (
                                <span className="ml-2 bg-red-600 text-white text-[8px] px-1 rounded">
                                    👥 MULTIPLE
                                </span>
                            )}
                        </span>
                        <span className="text-zinc-500 text-[10px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-white mb-2 leading-relaxed">
                        {evt.description}
                    </p>
                    {evt.screenshotUrl && (
                        <div className="relative max-h-48 overflow-hidden rounded">
                            <img 
                                src={evt.screenshotUrl} 
                                alt="Proof" 
                                className="w-full h-auto object-contain rounded" 
                            />
                            {/* Multiple People Overlay */}
                            {evt.type === 'MULTIPLE_FACES' && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                                    👥 Multiple Faces
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Arrow */}
                <div className="w-2 h-2 bg-zinc-900 border-r border-b border-white/20 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;