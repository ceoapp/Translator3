import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Copy, RotateCcw, Volume2, Sparkles, Languages, History, Trash2, X } from 'lucide-react';
import { translateText, generateSpeech } from './services/geminiService';
import { TranslationRecord, TranslationStatus, AudioState } from './types';

const App: React.FC = () => {
  // State
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [status, setStatus] = useState<TranslationStatus>(TranslationStatus.IDLE);
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>({ isPlaying: false, isLoading: false });

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const historyLoadedRef = useRef(false);

  // Load history on mount
  useEffect(() => {
    if (!historyLoadedRef.current) {
      const saved = localStorage.getItem('translate3_history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
      historyLoadedRef.current = true;
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    if (historyLoadedRef.current) {
      localStorage.setItem('translate3_history', JSON.stringify(history));
    }
  }, [history]);

  // Handle Translation
  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setStatus(TranslationStatus.TRANSLATING);
    try {
      const result = await translateText(inputText);
      setTranslatedText(result);
      setStatus(TranslationStatus.SUCCESS);

      // Add to history
      const newRecord: TranslationRecord = {
        id: Date.now().toString(),
        original: inputText,
        translated: result,
        timestamp: Date.now(),
      };
      setHistory(prev => [newRecord, ...prev].slice(0, 50)); // Keep last 50
    } catch (error) {
      console.error(error);
      setStatus(TranslationStatus.ERROR);
    }
  };

  // Handle Text-to-Speech
  const handleSpeak = async (text: string) => {
    if (!text || audioState.isLoading || audioState.isPlaying) return;

    setAudioState({ isPlaying: false, isLoading: true });

    try {
      const buffer = await generateSpeech(text);
      playAudioBuffer(buffer);
    } catch (error) {
      setAudioState({ isPlaying: false, isLoading: false });
      alert("Failed to generate speech. Please try again.");
    }
  };

  const playAudioBuffer = (buffer: AudioBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      setAudioState({ isPlaying: false, isLoading: false });
    };

    source.start(0);
    setAudioState({ isPlaying: true, isLoading: false });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const clearAll = () => {
    setInputText('');
    setTranslatedText('');
    setStatus(TranslationStatus.IDLE);
  };

  const loadHistoryItem = (item: TranslationRecord) => {
    setInputText(item.original);
    setTranslatedText(item.translated);
    setStatus(TranslationStatus.SUCCESS);
    setIsHistoryOpen(false);
  };

  const clearHistory = () => {
    if(confirm("Are you sure you want to clear all history?")) {
        setHistory([]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-600 to-violet-600 z-0"></div>
      
      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto p-4 sm:p-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Translate3</h1>
        </div>
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="p-2.5 rounded-full hover:bg-white/10 transition-colors duration-200"
          aria-label="History"
        >
          <History className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        
        {/* Translation Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
          
          {/* Input Section (English) */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 p-6 md:p-8 relative group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold tracking-wider text-slate-500 uppercase">English</span>
              {inputText && (
                <button onClick={clearAll} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full flex-1 resize-none outline-none text-2xl sm:text-3xl text-slate-800 placeholder-slate-300 bg-transparent leading-relaxed"
              spellCheck="false"
            />
            
            <div className="mt-6 flex items-center justify-between">
               <div className="flex gap-2">
                 {/* Reserved for future microphone button */}
               </div>
               <div className="flex gap-2 text-slate-400">
                 {inputText && (
                   <button onClick={() => copyToClipboard(inputText)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors" title="Copy">
                     <Copy className="w-5 h-5" />
                   </button>
                 )}
               </div>
            </div>
          </div>

          {/* Action Area (Mobile: Center, Desktop: Center Vertical Line) */}
          <div className="relative h-12 md:h-auto md:w-12 flex items-center justify-center -my-6 md:-my-0 md:-mx-6 z-20 pointer-events-none">
             <div className="bg-white p-1 rounded-full shadow-lg pointer-events-auto">
                <button 
                  onClick={handleTranslate}
                  disabled={status === TranslationStatus.TRANSLATING || !inputText}
                  className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-indigo-200"
                >
                   {status === TranslationStatus.TRANSLATING ? (
                     <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <ArrowRight className="w-6 h-6 md:w-7 md:h-7 md:rotate-0 rotate-90" />
                   )}
                </button>
             </div>
          </div>

          {/* Output Section (Thai) */}
          <div className="flex-1 flex flex-col bg-slate-50/50 p-6 md:p-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold tracking-wider text-indigo-600 uppercase">Thai</span>
              {status === TranslationStatus.SUCCESS && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Gemini AI
                </span>
              )}
            </div>

            <div className="flex-1">
              {translatedText ? (
                <div className="text-2xl sm:text-3xl text-slate-800 leading-relaxed animate-in fade-in duration-500">
                  {translatedText}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-lg italic">
                  Translation will appear here
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200/60 pt-4">
               <div className="flex gap-2">
                 {translatedText && (
                   <button 
                    onClick={() => handleSpeak(translatedText)}
                    disabled={audioState.isLoading || audioState.isPlaying}
                    className={`p-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${audioState.isPlaying ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'}`}
                    title="Listen"
                   >
                     {audioState.isLoading ? (
                       <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                     ) : (
                       <Volume2 className={`w-5 h-5 ${audioState.isPlaying ? 'animate-pulse' : ''}`} />
                     )}
                     <span className="text-sm font-medium hidden sm:block">
                        {audioState.isPlaying ? 'Playing...' : 'Listen'}
                     </span>
                   </button>
                 )}
               </div>
               <div className="flex gap-2 text-slate-400">
                 {translatedText && (
                   <button 
                    onClick={() => copyToClipboard(translatedText)} 
                    className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all" 
                    title="Copy"
                   >
                     <Copy className="w-5 h-5" />
                   </button>
                 )}
               </div>
            </div>
          </div>

        </div>

        {/* Info / Footer */}
        <div className="text-center text-slate-400 text-sm py-4">
          Powered by Google Gemini 2.5 Flash &bull; Native Audio
        </div>
      </main>

      {/* History Sidebar */}
      {isHistoryOpen && (
        <>
          <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                History
              </h2>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                   <button onClick={clearHistory} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Clear All">
                     <Trash2 className="w-5 h-5" />
                   </button>
                )}
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <History className="w-12 h-12 opacity-20" />
                  <p>No translation history yet</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{formatDate(item.timestamp)}</span>
                    </div>
                    <p className="text-slate-800 font-medium mb-1 line-clamp-2">{item.original}</p>
                    <p className="text-indigo-600 line-clamp-2">{item.translated}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
