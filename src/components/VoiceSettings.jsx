import { useState, useEffect, useCallback } from 'react';
import { Volume2, X, Check, Play, Square } from 'lucide-react';

// 精选12种清晰发音：每种口音3种（年轻男、年轻女、老人）
// 这些是 Google Chrome 和主流浏览器中最常见的高质量英语语音
const CURATED_VOICES = [
  // 英式 en-GB
  { lang: 'en-GB', gender: 'female-young', label: '🇬🇧 英式 · 年轻女声', keywords: ['google uk english female', 'microsoft hazel', 'karen', 'serena', 'martha', 'libby'] },
  { lang: 'en-GB', gender: 'male-young', label: '🇬🇧 英式 · 年轻男声', keywords: ['google uk english male', 'microsoft ryan', 'daniel', 'george', 'ryan', 'thomas'] },
  { lang: 'en-GB', gender: 'elder', label: '🇬🇧 英式 · 成熟声', keywords: ['microsoft susan', 'kate', 'oliver', 'arthur'] },
  // 美式 en-US
  { lang: 'en-US', gender: 'female-young', label: '🇺🇸 美式 · 年轻女声', keywords: ['google us english female', 'microsoft zira', 'samantha', 'allison', 'ava', 'jenny', 'aria'] },
  { lang: 'en-US', gender: 'male-young', label: '🇺🇸 美式 · 年轻男声', keywords: ['google us english male', 'microsoft david', 'alex', 'tom', 'guy', 'brandon', 'christopher'] },
  { lang: 'en-US', gender: 'elder', label: '🇺🇸 美式 · 成熟声', keywords: ['microsoft mark', 'fred', 'ralph', 'albert'] },
  // 澳式 en-AU
  { lang: 'en-AU', gender: 'female-young', label: '🇦🇺 澳式 · 年轻女声', keywords: ['google australian english female', 'microsoft natasha', 'catherine', 'karen'] },
  { lang: 'en-AU', gender: 'male-young', label: '🇦🇺 澳式 · 年轻男声', keywords: ['google australian english male', 'microsoft william', 'james', 'lee'] },
  { lang: 'en-AU', gender: 'elder', label: '🇦🇺 澳式 · 成熟声', keywords: ['gordon', 'duncan'] },
  // 印度 en-IN
  { lang: 'en-IN', gender: 'female-young', label: '🇮🇳 印度 · 年轻女声', keywords: ['google indian english female', 'microsoft heera', 'neerja', 'priya'] },
  { lang: 'en-IN', gender: 'male-young', label: '🇮🇳 印度 · 年轻男声', keywords: ['google indian english male', 'microsoft ravi', 'prabhat'] },
  { lang: 'en-IN', gender: 'elder', label: '🇮🇳 印度 · 成熟声', keywords: ['hemant', 'kalpana'] },
];

const ALLOWED_LANGS = ['en-GB', 'en-US', 'en-AU', 'en-IN'];

function matchVoiceToCurated(voice, curatedEntry) {
  const nameLower = voice.name.toLowerCase();
  // 语言必须匹配
  if (!voice.lang.startsWith(curatedEntry.lang)) return false;
  // 名称关键词匹配
  return curatedEntry.keywords.some(kw => nameLower.includes(kw.toLowerCase()));
}

export default function VoiceSettings({ onClose }) {
  const [allVoices, setAllVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [previewText, setPreviewText] = useState('Hello, how are you today?');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceName, setPlayingVoiceName] = useState(null);
  
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAllVoices(voices);
      
      // 恢复保存的选择
      const savedVoiceName = localStorage.getItem('selected-voice');
      if (savedVoiceName) {
        const saved = voices.find(v => v.name === savedVoiceName);
        if (saved) {
          setSelectedVoice(saved);
          return;
        }
      }
      
      // 默认选择第一个英式云端语音
      const englishVoices = voices.filter(v => ALLOWED_LANGS.some(l => v.lang.startsWith(l)));
      const defaultVoice = englishVoices.find(v => !v.localService && v.lang.startsWith('en-GB'))
        || englishVoices.find(v => !v.localService && v.lang.startsWith('en-US'))
        || englishVoices.find(v => !v.localService)
        || englishVoices[0];
      if (defaultVoice) {
        setSelectedVoice(defaultVoice);
        localStorage.setItem('selected-voice', defaultVoice.name);
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // 构建精选语音列表：每个 curated slot 匹配一个实际可用的语音
  const curatedList = CURATED_VOICES.map(entry => {
    // 先找精确匹配
    let matched = allVoices.find(v => matchVoiceToCurated(v, entry));
    // 如果没找到精确匹配，按语言兜底取第一个未被使用的
    return { ...entry, voice: matched || null };
  }).filter(item => item.voice !== null);
  
  // 如果精选匹配不到足够的，补充所有符合语言条件的语音
  const curatedVoiceNames = new Set(curatedList.map(item => item.voice.name));
  const extraVoices = allVoices.filter(v => 
    ALLOWED_LANGS.some(l => v.lang.startsWith(l)) && !curatedVoiceNames.has(v.name)
  );
  
  const handlePreview = useCallback((voice) => {
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setPlayingVoiceName(voice ? voice.name : selectedVoice?.name);
    
    const voiceToUse = voice || selectedVoice;
    if (!voiceToUse) return;
    
    const utterance = new SpeechSynthesisUtterance(previewText);
    utterance.voice = voiceToUse;
    utterance.lang = voiceToUse.lang;
    utterance.rate = 0.9;
    
    utterance.onend = () => {
      setIsPlaying(false);
      setPlayingVoiceName(null);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setPlayingVoiceName(null);
    };
    
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, previewText]);
  
  const handleSelectVoice = useCallback((voice) => {
    window.speechSynthesis.cancel();
    setSelectedVoice(voice);
    localStorage.setItem('selected-voice', voice.name);
    window.dispatchEvent(new CustomEvent('voice-changed', { detail: { voiceName: voice.name } }));
  }, []);
  
  const handleSelectAndPreview = useCallback((voice) => {
    handleSelectVoice(voice);
    setTimeout(() => handlePreview(voice), 100);
  }, [handleSelectVoice, handlePreview]);
  
  const stopPreview = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setPlayingVoiceName(null);
  };

  // 按语言分组显示
  const langGroups = [
    { lang: 'en-GB', label: '🇬🇧 英式英语' },
    { lang: 'en-US', label: '🇺🇸 美式英语' },
    { lang: 'en-AU', label: '🇦🇺 澳式英语' },
    { lang: 'en-IN', label: '🇮🇳 印度英语' },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Volume2 className="text-coral-500" />
            <h2 className="font-handwritten text-xl text-coral-600">语音设置</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Preview */}
          <div className="bg-coral-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">语音试听</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="输入试听文本"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              {isPlaying ? (
                <button
                  onClick={stopPreview}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1 text-sm"
                >
                  <Square size={12} />
                  停止
                </button>
              ) : (
                <button
                  onClick={() => handlePreview(null)}
                  className="btn-primary px-3 text-sm"
                >
                  试听
                </button>
              )}
            </div>
            {selectedVoice && (
              <p className="text-xs text-gray-400 mt-2">
                当前: {selectedVoice.name}
              </p>
            )}
          </div>
          
          {/* Curated Voice List */}
          {curatedList.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">精选语音</p>
              {langGroups.map(({ lang, label }) => {
                const langItems = curatedList.filter(item => item.lang === lang);
                if (langItems.length === 0) return null;
                return (
                  <div key={lang} className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5 font-medium">{label}</p>
                    <div className="space-y-1.5">
                      {langItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`w-full p-2.5 rounded-xl transition-all ${
                            selectedVoice?.name === item.voice.name
                              ? 'bg-coral-100 ring-2 ring-coral-400'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleSelectVoice(item.voice)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="font-medium text-gray-800 text-sm">{item.label}</p>
                              <p className="text-xs text-gray-400 truncate">{item.voice.name}</p>
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <button
                                onClick={() => handleSelectAndPreview(item.voice)}
                                className={`p-1.5 rounded-full transition-colors ${
                                  playingVoiceName === item.voice.name
                                    ? 'bg-coral-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-coral-100 hover:text-coral-500'
                                }`}
                                title="选择并试听"
                              >
                                <Play size={14} />
                              </button>
                              {selectedVoice?.name === item.voice.name && (
                                <Check className="text-coral-500" size={18} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Extra voices if curated list is too short */}
          {curatedList.length < 4 && extraVoices.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">其他可用语音</p>
              <div className="space-y-1.5">
                {extraVoices.map((voice, idx) => (
                  <div
                    key={idx}
                    className={`w-full p-2.5 rounded-xl transition-all ${
                      selectedVoice?.name === voice.name
                        ? 'bg-coral-100 ring-2 ring-coral-400'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSelectVoice(voice)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="font-medium text-gray-800 text-sm truncate">{voice.name}</p>
                        <p className="text-xs text-gray-400">{voice.lang} {!voice.localService ? '· 云端' : '· 本地'}</p>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <button
                          onClick={() => handleSelectAndPreview(voice)}
                          className={`p-1.5 rounded-full transition-colors ${
                            playingVoiceName === voice.name
                              ? 'bg-coral-500 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-coral-100 hover:text-coral-500'
                          }`}
                          title="选择并试听"
                        >
                          <Play size={14} />
                        </button>
                        {selectedVoice?.name === voice.name && (
                          <Check className="text-coral-500" size={18} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {curatedList.length === 0 && extraVoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>正在加载语音...</p>
              <p className="text-sm mt-2">如果长时间无响应，请刷新页面</p>
            </div>
          )}
          
          {/* Tips */}
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-sm text-green-700">
              💡 点击 ▶️ 按钮试听后自动选择该语音，切换后立即生效，无需重新开始听写。
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose} className="w-full btn-primary">
            确认并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
