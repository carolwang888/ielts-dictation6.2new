import { useState, useEffect, useCallback } from 'react';
import { Volume2, X, Check, Play } from 'lucide-react';

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
        if (saved) setSelectedVoice(saved);
      }
      
      // 默认选择
      if (!selectedVoice) {
        const brit = allVoices.find(v => v.lang.startsWith('en-GB'));
        const english = allVoices.find(v => v.lang.startsWith('en'));
        setSelectedVoice(brit || english || allVoices[0]);
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // 需求7: 只显示英语语音，去掉不正确的语言播报
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  const displayVoices = englishVoices.length > 0 ? englishVoices : voices;
  
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
  
  const handleSelectVoice = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('selected-voice', voice.name);
  };
  
  const handleSelectAndPreview = (voice) => {
    handleSelectVoice(voice);
    handlePreview(voice);
  };
  
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
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
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
                当前选择: {selectedVoice.name} ({selectedVoice.lang})
              </p>
            )}
          </div>
          
          {/* Voice List - Only English */}
          <div>
            <p className="text-sm text-gray-500 mb-2">
              可用英语语音 ({displayVoices.length})
            </p>
            <div className="space-y-2">
              {displayVoices.map((voice, idx) => (
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
                        <p className="font-medium text-gray-800 truncate">
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
                      <p className="text-xs text-gray-500">
                        {voice.lang}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {/* 需求7: 每个语音都有试听按钮 */}
                      <button
                        onClick={() => handlePreview(voice)}
                        className={`p-1.5 rounded-full transition-colors ${
                          playingVoiceName === voice.name
                            ? 'bg-coral-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-coral-100 hover:text-coral-500'
                        }`}
                        title="试听此语音"
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
            
            {displayVoices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>正在加载语音...</p>
                <p className="text-sm mt-2">如果长时间无响应，请刷新页面</p>
              </div>
            )}
          </div>
          
          {/* Tips */}
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-700">
              💡 <strong>云端语音</strong> 音质更好，与 Chrome 效果一致。
              选择后点击试听按钮可立即听到效果，随时切换。
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              💡 仅显示英语语音，确保听写播报语言正确。
              如果没有可用语音，请检查网络连接。
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
}
