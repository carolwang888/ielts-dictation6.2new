import { useState, useEffect, useCallback } from 'react';
import { Volume2, X, Check, Play, Square } from 'lucide-react';

// 只保留清晰的英语发音类型
const ALLOWED_LANGS = ['en-GB', 'en-US', 'en-AU', 'en-IN'];

// 语言标签映射
const LANG_LABELS = {
  'en-GB': '🇬🇧 英式',
  'en-US': '🇺🇸 美式',
  'en-AU': '🇦🇺 澳式',
  'en-IN': '🇮🇳 印度',
};

function getLangLabel(lang) {
  for (const [prefix, label] of Object.entries(LANG_LABELS)) {
    if (lang.startsWith(prefix)) return label;
  }
  return lang;
}

export default function VoiceSettings({ onClose }) {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [previewText, setPreviewText] = useState('Hello, how are you today?');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceName, setPlayingVoiceName] = useState(null);
  
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      
      // 尝试恢复保存的选择
      const savedVoiceName = localStorage.getItem('selected-voice');
      if (savedVoiceName) {
        const saved = allVoices.find(v => v.name === savedVoiceName);
        if (saved) {
          setSelectedVoice(saved);
          return;
        }
      }
      
      // 默认选择英式云端语音
      const filteredVoices = allVoices.filter(v => 
        ALLOWED_LANGS.some(lang => v.lang.startsWith(lang))
      );
      const defaultVoice = filteredVoices.find(v => !v.localService && v.lang.startsWith('en-GB'))
        || filteredVoices.find(v => !v.localService && v.lang.startsWith('en-US'))
        || filteredVoices.find(v => v.lang.startsWith('en-GB'))
        || filteredVoices[0];
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
  
  // 只显示清晰的英式/美式/澳式/印度发音
  const filteredVoices = voices.filter(v => 
    ALLOWED_LANGS.some(lang => v.lang.startsWith(lang))
  );
  
  // 按语言分组
  const groupedVoices = {};
  filteredVoices.forEach(voice => {
    const langKey = ALLOWED_LANGS.find(lang => voice.lang.startsWith(lang)) || voice.lang;
    if (!groupedVoices[langKey]) {
      groupedVoices[langKey] = [];
    }
    groupedVoices[langKey].push(voice);
  });
  
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
  
  // 选择语音并立即保存，确保随时切换生效
  const handleSelectVoice = useCallback((voice) => {
    window.speechSynthesis.cancel();
    setSelectedVoice(voice);
    localStorage.setItem('selected-voice', voice.name);
    // 广播事件通知其他组件语音已切换
    window.dispatchEvent(new CustomEvent('voice-changed', { detail: { voiceName: voice.name } }));
  }, []);
  
  // 选择并试听
  const handleSelectAndPreview = useCallback((voice) => {
    handleSelectVoice(voice);
    // 短暂延迟后试听，确保选择已生效
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
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
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200"
              />
              {isPlaying ? (
                <button
                  onClick={stopPreview}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                >
                  <Square size={14} />
                  停止
                </button>
              ) : (
                <button
                  onClick={() => handlePreview(null)}
                  className="btn-primary px-4"
                >
                  试听
                </button>
              )}
            </div>
            {selectedVoice && (
              <p className="text-xs text-gray-400 mt-2">
                当前: {selectedVoice.name} ({getLangLabel(selectedVoice.lang)})
              </p>
            )}
          </div>
          
          {/* Voice List - Grouped by language */}
          {Object.entries(LANG_LABELS).map(([langPrefix, langLabel]) => {
            const langVoices = groupedVoices[langPrefix] || [];
            if (langVoices.length === 0) return null;
            
            return (
              <div key={langPrefix}>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  {langLabel} ({langVoices.length})
                </p>
                <div className="space-y-1.5">
                  {langVoices.map((voice, idx) => (
                    <div
                      key={idx}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800 truncate text-sm">
                              {voice.name}
                            </p>
                            {!voice.localService && (
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex-shrink-0">
                                云端
                              </span>
                            )}
                            {voice.localService && (
                              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                                本地
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {/* 试听按钮 */}
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
                            <Check className="text-coral-500" size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredVoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>正在加载语音...</p>
              <p className="text-sm mt-2">如果长时间无响应，请刷新页面</p>
            </div>
          )}
          
          {/* Tips */}
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-700">
              💡 <strong>云端语音</strong>音质更好。点击播放按钮可选择并试听，切换后立即生效。
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            确认并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
