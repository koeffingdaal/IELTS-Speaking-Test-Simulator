import React, { useState, useRef, useCallback, useEffect } from 'react';
// Fix: LiveSession is not an exported member of '@google/genai'.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { SessionState, TranscriptMessage } from './types';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import ControlPanel from './components/ControlPanel';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import StatusIndicator from './components/StatusIndicator';

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);

  // Fix: Replaced the non-exported 'LiveSession' type with a structural inline type.
  const sessionRef = useRef<{ close: () => void } | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const lastUserMessageIndexRef = useRef(-1);
  const lastExaminerMessageIndexRef = useRef(-1);

  const handleStartTest = useCallback(async () => {
    if (sessionState !== SessionState.IDLE && sessionState !== SessionState.DISCONNECTED && sessionState !== SessionState.ERROR) {
      return;
    }

    setSessionState(SessionState.CONNECTING);
    setTranscript([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    lastUserMessageIndexRef.current = -1;
    lastExaminerMessageIndexRef.current = -1;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      // Fix: Use a cross-browser compatible AudioContext to resolve TypeScript errors for webkitAudioContext.
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are a certified IELTS examiner conducting a speaking test. Your voice should be clear and professional. Follow the standard three-part structure.
            Part 1: Start with introductions and ask general questions about familiar topics like home, family, work, studies, and interests. Ask 4-5 questions.
            Part 2: Introduce a cue card topic. Give the user 1 minute to prepare, then ask them to speak for 1-2 minutes.
            Part 3: Ask more abstract and detailed questions related to the Part 2 topic. Engage in a broader discussion for 4-5 minutes.
            Guide the user through each part clearly. Keep your responses concise and maintain the persona of a formal examiner. Start the test now.`,
        },
        callbacks: {
          onopen: async () => {
            setSessionState(SessionState.CONNECTED);
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              setIsModelSpeaking(true);
              const outputAudioContext = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              
              source.onended = () => {
                  audioSourcesRef.current.delete(source);
                  if (audioSourcesRef.current.size === 0) {
                      setIsModelSpeaking(false);
                  }
              };
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            // Handle transcription
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setTranscript(prev => {
                const newTranscript = [...prev];
                const msg: TranscriptMessage = { speaker: 'user', text: currentInputTranscriptionRef.current, isFinal: false };
                if (lastUserMessageIndexRef.current !== -1 && !newTranscript[lastUserMessageIndexRef.current]?.isFinal) {
                  newTranscript[lastUserMessageIndexRef.current] = msg;
                } else {
                  lastUserMessageIndexRef.current = newTranscript.length;
                  newTranscript.push(msg);
                }
                return newTranscript;
              });
            }

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setTranscript(prev => {
                const newTranscript = [...prev];
                const msg: TranscriptMessage = { speaker: 'examiner', text: currentOutputTranscriptionRef.current, isFinal: false };
                 if (lastExaminerMessageIndexRef.current !== -1 && !newTranscript[lastExaminerMessageIndexRef.current]?.isFinal) {
                  newTranscript[lastExaminerMessageIndexRef.current] = msg;
                } else {
                  lastExaminerMessageIndexRef.current = newTranscript.length;
                  newTranscript.push(msg);
                }
                return newTranscript;
              });
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscriptionRef.current.trim()) {
                  setTranscript(prev => {
                      const newTranscript = [...prev];
                      if(lastUserMessageIndexRef.current !== -1) {
                           newTranscript[lastUserMessageIndexRef.current] = { ...newTranscript[lastUserMessageIndexRef.current], isFinal: true };
                      }
                      return newTranscript;
                  });
              }
              if (currentOutputTranscriptionRef.current.trim()) {
                   setTranscript(prev => {
                      const newTranscript = [...prev];
                      if(lastExaminerMessageIndexRef.current !== -1) {
                           newTranscript[lastExaminerMessageIndexRef.current] = { ...newTranscript[lastExaminerMessageIndexRef.current], isFinal: true };
                      }
                      return newTranscript;
                  });
              }

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setSessionState(SessionState.ERROR);
            handleStopTest();
          },
          onclose: () => {
            handleStopTest(SessionState.DISCONNECTED);
          },
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start session:', error);
      setSessionState(SessionState.ERROR);
      handleStopTest();
    }
  }, [sessionState]);

  const handleStopTest = useCallback((finalState: SessionState = SessionState.IDLE) => {
    sessionRef.current?.close();
    sessionRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;

    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();

    setIsModelSpeaking(false);
    setSessionState(finalState);
  }, []);
  
  useEffect(() => {
    return () => {
      if(sessionRef.current) {
        handleStopTest();
      }
    };
  }, [handleStopTest]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">IELTS Speaking Simulator</h1>
          <StatusIndicator state={sessionState} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <TranscriptionDisplay transcript={transcript} />
        </main>
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <ControlPanel
            sessionState={sessionState}
            isModelSpeaking={isModelSpeaking}
            onStart={handleStartTest}
            onStop={() => handleStopTest()}
          />
        </footer>
      </div>
    </div>
  );
};

export default App;
