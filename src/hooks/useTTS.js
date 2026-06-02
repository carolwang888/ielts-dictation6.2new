import { useState, useEffect, useRef, useCallback } from 'react';

// 只允许清晰的英语发音
const ALLOWED_LANGS = ['en-GB', 'en-US', 'en-AU', 'en-IN'];

function isAllowedVoice(voice) {
  return ALLOWED_LANGS.some(lang => voice.lang.startsWith(lang));
}

export function useTTS() {
  const abortRef = useRef(false);
  const speakingRef = useRef(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  // 使用 ref 保存最新的 selectedVoice，确保播放中切换语音立即生效
  const selectedVoiceRef = useRef(null);
  
  // rateRef 和 intervalRef 用于在播放过程中动态获取最新值
  const rateRef = useRef(0.8);
  const intervalRef = useRef(5000);
  
  // 更新 ref 保持同步
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);
  
  useEffect(() => {
    const loadVoices = () => {
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        setTimeout(() => {
          voices = window.speechSynthesis.getVoices();
          processVoices(voices);
        }, 100);
      } else {
        processVoices(voices);
      }
    };
    
    const processVoices = (voices) => {
      // 只保留清晰的英语发音
      const filtered = voices.filter(isAllowedVoice);
      setAvailableVoices(filtered);
      
      const savedVoiceName = localStorage.getItem('selected-voice');
      let voiceToUse = null;
      
      if (savedVoiceName) {
        // 优先使用保存的语音（必须在允许列表中）
        voiceToUse = filtered.find(v => v.name === savedVoiceName);
      }
      
      if (!voiceToUse) {
        // 优先选择云端英式英语
        voiceToUse = filtered.find(v => 
          !v.localService && v.lang.startsWith('en-GB')
        ) || filtered.find(v => 
          !v.localService && v.lang.startsWith('en-US')
        ) || filtered.find(v => 
          !v.localService
        ) || filtered.find(v => 
          v.lang.startsWith('en-GB')
        ) || filtered.find(v => 
          v.lang.startsWith('en-US')
        ) || filtered[0];
        
        if (voiceToUse) {
          localStorage.setItem('selected-voice', voiceToUse.name);
        }
      }
      
      setSelectedVoice(voiceToUse);
      selectedVoiceRef.current = voiceToUse;
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // 监听语音切换事件（从 VoiceSettings 组件广播）
    const handleVoiceChanged = (e) => {
      const { voiceName } = e.detail;
      const voices = window.speechSynthesis.getVoices();
      const newVoice = voices.find(v => v.name === voiceName);
      if (newVoice) {
        setSelectedVoice(newVoice);
        selectedVoiceRef.current = newVoice;
      }
    };
    
    window.addEventListener('voice-changed', handleVoiceChanged);
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.removeEventListener('voice-changed', handleVoiceChanged);
    };
  }, []);
  
  const speakWord = useCallback((text, rate = 1.0) => {
    return new Promise((resolve) => {
      if (abortRef.current) {
        resolve();
        return;
      }
      
      // 使用 ref 获取最新的语音设置（支持播放中切换）
      const currentVoice = selectedVoiceRef.current;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      if (currentVoice) {
        utterance.voice = currentVoice;
        utterance.lang = currentVoice.lang;
      } else {
        utterance.lang = 'en-GB';
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      speakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    });
  }, []);
  
  const speakWordTwice = useCallback(async (text, rate = 1.0, gap = 300) => {
    await speakWord(text, rate);
    if (abortRef.current) return;
    await new Promise(r => setTimeout(r, gap));
    if (abortRef.current) return;
    await speakWord(text, rate);
  }, [speakWord]);
  
  // 更新播放参数（在播放中也立即生效）
  const updatePlaybackParams = useCallback((rate, interval) => {
    rateRef.current = rate;
    intervalRef.current = interval;
  }, []);
  
  const playDictation = useCallback(async (words, rate, interval, onWordChange) => {
    // 重置 abort 标志
    abortRef.current = false;
    // 初始化 ref 值
    rateRef.current = rate;
    intervalRef.current = interval;
    
    for (let i = 0; i < words.length; i++) {
      if (abortRef.current) break;
      
      onWordChange?.(i);
      // 每次播放时从 rateRef 读取最新速度（支持播放中调整）
      await speakWord(words[i].word, rateRef.current);
      
      if (i < words.length - 1 && !abortRef.current) {
        // 分段等待，每100ms检查一次 abort 和最新间隔
        const startTime = Date.now();
        while (!abortRef.current) {
          const elapsed = Date.now() - startTime;
          if (elapsed >= intervalRef.current) break;
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    speakingRef.current = false;
  }, [speakWord]);
  
  const stop = useCallback(() => {
    abortRef.current = true;
    window.speechSynthesis.cancel();
    speakingRef.current = false;
  }, []);
  
  const isSpeaking = useCallback(() => {
    return speakingRef.current;
  }, []);
  
  return { 
    speakWord, 
    speakWordTwice, 
    playDictation, 
    stop, 
    isSpeaking, 
    abortRef,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    updatePlaybackParams
  };
}
