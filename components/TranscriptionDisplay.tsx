
import React, { useEffect, useRef } from 'react';
import { TranscriptMessage } from '../types';

interface TranscriptionDisplayProps {
  transcript: TranscriptMessage[];
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (transcript.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h2 className="text-lg font-semibold">Welcome to the IELTS Simulator</h2>
            <p className="max-w-md mt-1">Press the "Start Test" button below to begin your simulated speaking test. The AI examiner will greet you and start with Part 1.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcript.map((message, index) => (
        <div key={index} className={`flex items-start gap-3 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
           {message.speaker === 'examiner' && (
             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
               AI
             </div>
           )}
          <div
            className={`max-w-xl p-3 rounded-lg ${
              message.speaker === 'user'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-gray-800 dark:text-gray-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            } ${!message.isFinal ? 'opacity-70' : ''}`}
          >
            <p className="text-base leading-relaxed">{message.text}</p>
          </div>
           {message.speaker === 'user' && (
             <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
               U
             </div>
           )}
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default TranscriptionDisplay;
