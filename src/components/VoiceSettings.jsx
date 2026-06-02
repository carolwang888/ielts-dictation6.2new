import { useState, useEffect, useCallback } from 'react';
import { Volume2, X, Check, Play, Square } from 'lucide-react';

const ALLOWED_LANGS = ['en-GB', 'en-US', 'en-AU', 'en-IN'];

// 黑名单：这些语音不清晰，必须排除
const BLACKLIST = [
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
  'fred', 'good news', 'hysterical', 'junior', 'kathy', 'organ',
  'princess', 'ralph', 'trinoids', 'whisper', 'wobble', 'zarvox',
  'deranged', 'pipe organ', 'superstar', 'jester', 'agnes',
  'bruce', 'vicki', 'victoria', 'novelty', 'eddy', 'flo', 'grandma',
  'grandpa', 'reed', 'rocko', 'sandy', 'shelley', 'superstar'
];

// 高质量语音关键词（优先匹配这些）
const HIGH_QUALITY_KEYWORDS = {
  'en-GB': {
    'female-young': ['google uk english female', 'hazel', 'serena', 'martha', 'libby', 'sonia', 'mia', 'amy'],
    'male-young': ['google uk english male', 'ryan', 'daniel', 'george', 'thomas', 'alfie', 'oliver'],
    'elder': ['susan', 'kate', 'arthur'],
  },
  'en-US': {
    'female-young': ['google us english female', 'zira', 'samantha', 'allison', 'ava', 'jenny', 'aria', 'michelle', 'emma', 'amber'],
    'male-young': ['google us english male', 'david', 'alex', 'tom', 'guy', 'brandon', 'christopher', 'eric', 'roger', 'steffan', 'aaron', 'andrew', 'davis'],
    'elder': ['mark', 'matthew'],
  },
  'en-AU': {
    'female-young': ['google australian english female', 'natasha', 'catherine', 'karen', 'nicole'],
    'male-young': ['google australian english male', 'william', 'james', 'lee', 'darren'],
    'elder': ['gordon', 'duncan'],
  },
  'en-IN': {
    'female-young': ['google indian english female', 'heera', 'neerja', 'priya', 'sapna'],
    'male-young': ['google indian english male', 'ravi', 'prabhat', 'hemant'],
    'elder': ['kalpana'],
  },
};

const GENDER_LABELS = {
  'female-young': '年轻女声',
  'male-young': '年轻男声',
  'elder': '成熟声',
};

const LANG_LABELS = {
  'en-GB': '🇬🇧 英式英语',
  'en-US': '🇺🇸 美式英语',
  'en-AU': '🇦🇺 澳式英语',
  'en-IN': '🇮🇳 印度英语',
};

function isBlacklisted(voice) {
  const nameLower = voice.name.toLowerCase();
  return BLACKLIST.some(b => nameLower.includes(b));
}

function matchVoiceToSlot(voice, lang, gender) {
  if (!voice.lang.startsWith(lang)) return false;
  if (isBlacklisted(voice)) return false;
  const keywords = HIGH_QUALITY_KEYWORDS[lang]?.[gender] || [];
  const nameLower = voice.name.toLowerCase();
  return keywords.some(kw => nameLower.includes(kw.toLowerCase()));
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
      
      const savedVoiceName = localStorage.getItem('selected-voice');
      if (savedVoiceName) {
        const saved = voices.find(v => v.name === savedVoiceName);
        if (saved && !isBlacklisted(saved)) {
          setSelectedVoice(saved);
          return;
        }
      }
      
      // 默认选择
      const englishVoices = voices.filter(v => 
        ALLOWED_LANGS.some(l => v.lang.startsWith(l)) && !isBlacklisted(v)
      );
      const defaultVoice = englishVoices.find(v => !v.localService && v.lang.startsWith('en-US'))
        || englishVoices.find(v => !v.localService && v.lang.startsWith('en-GB'))
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
  
  // 构建精选列表
  const buildCuratedList = () => {
    const result = [];
    const usedNames = new Set();
    
    for (const lang of ALLOWED_LANGS) {
      for (const gender of ['female-young', 'male-young', 'elder']) {
        // 找到匹配的语音
        const matched = allVoices.find(v => 
          matchVoiceToSlot(v, lang, gender) && !usedNames.has(v.name)
        );
        if (matched) {
          usedNames.add(matched.name);
          result.push({
            lang,
            gender,
            label: `${LANG_LABELS[lang].split(' ')[0]} ${LANG_LABELS[lang].split(' ')[1]} · ${GENDER_LABELS[gender]}`,
            voice: matched,
          });
        }
      }
    }
    
    return result;
  };
  
  const curatedList = buildCuratedList();
  
  // 如果精选不够，补充其他清晰的英语语音
  const curatedNames = new Set(curatedList.map(item => item.voice.name));
  const extraVoices = allVoices.filter(v => 
    ALLOWED_LANGS.some(l => v.lang.startsWith(l)) && 
    !isBlacklisted(v) && 
    !curatedNames.has(v.name)
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
          
          {/* Curated Voice List by Language */}
          {ALLOWED_LANGS.map(lang => {
            const langItems = curatedList.filter(item => item.lang === lang);
            if (langItems.length === 0) return null;
            return (
              <div key={lang}>
                <p className="text-sm font-medium text-gray-600 mb-2">{LANG_LABELS[lang]}</p>
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
                          <p className="font-medium text-gray-800 text-sm">{GENDER_LABELS[item.gender]}</p>
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
          
          {/* Extra clean voices not in curated list */}
          {extraVoices.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">其他清晰语音</p>
              <div className="space-y-1.5">
                {extraVoices.slice(0, 8).map((voice, idx) => (
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
              💡 点击 ▶️ 试听并选择语音，切换后立即生效。推荐使用云端语音，音质更好。
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
