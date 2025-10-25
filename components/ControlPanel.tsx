
import React from 'react';
import { SessionState } from '../types';

interface ControlPanelProps {
  sessionState: SessionState;
  isModelSpeaking: boolean;
  onStart: () => void;
  onStop: () => void;
}

const AudioVisualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    return (
      <div className="flex items-center justify-center space-x-1 h-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full bg-blue-500 transition-all duration-200 ease-in-out ${isActive ? 'animate-pulse' : ''}`}
            style={{
              height: isActive ? `${12 + Math.sin(i * 0.4) * 8}px` : '4px',
              animationDelay: isActive ? `${i * 100}ms` : '0ms'
            }}
          ></div>
        ))}
      </div>
    );
  };

const ControlPanel: React.FC<ControlPanelProps> = ({ sessionState, isModelSpeaking, onStart, onStop }) => {
  const isRecording = sessionState === SessionState.CONNECTED;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 w-1/3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">You:</span>
        <AudioVisualizer isActive={isRecording && !isModelSpeaking} />
      </div>

      <div className="flex-1 flex justify-center">
        {isRecording ? (
          <button
            onClick={onStop}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
          >
            End Test
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={sessionState === SessionState.CONNECTING}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-transform transform hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {sessionState === SessionState.CONNECTING ? 'Connecting...' : 'Start Test'}
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2 w-1/3 justify-end">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Examiner:</span>
        <AudioVisualizer isActive={isModelSpeaking} />
      </div>
    </div>
  );
};

export default ControlPanel;
