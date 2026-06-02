import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWords } from '../context/WordsContext';
import { AlertCircle, Filter, RotateCcw, Play, CheckSquare, Square, Minus, Plus, Volume2 } from 'lucide-react';

export default function ErrorWords() {
  const { chapters, resetErrorCounts, setErrorCount, initialized } = useWords();
  const navigate = useNavigate();
  const [minErrors, setMinErrors] = useState(1);
  const [maxErrors, setMaxErrors] = useState(9999);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  const errorWords = useMemo(() => {
    if (!initialized) {
      return [];
    }
    
    const words = [];
    chapters.forEach(chapter => {
      chapter.groups.forEach(group => {
        group.words.forEach(word => {
          if (word.errorCount >= minErrors && word.errorCount <= maxErrors) {
            words.push({
              ...word,
              groupId: group.id,
              groupName: group.name
            });
          }
        });
      });
    });
    
    console.log('ErrorWords: found', words.length, 'error words');
    return words.sort((a, b) => b.errorCount - a.errorCount);
  }, [chapters, minErrors, maxErrors, initialized]);
  
  // 需求3: 按组统计错误单词数量
  const groupErrorStats = useMemo(() => {
    if (!initialized) return {};
    const stats = {};
    chapters.forEach(chapter => {
      chapter.groups.forEach(group => {
        const errCount = group.words.filter(w => w.errorCount >= minErrors && w.errorCount <= maxErrors).length;
        if (errCount > 0) {
          stats[group.id] = { name: group.name, count: errCount };
        }
      });
    });
    return stats;
  }, [chapters, minErrors, maxErrors, initialized]);
  
  // 需求6: 播放单词发音
  const playWordAudio = useCallback((word) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-GB';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const savedVoiceName = localStorage.getItem('selected-voice');
    const voices = window.speechSynthesis.getVoices();
    const savedVoice = voices.find(v => v.name === savedVoiceName);
    if (savedVoice) {
      utterance.voice = savedVoice;
      utterance.lang = savedVoice.lang;
    }
    
    window.speechSynthesis.speak(utterance);
  }, []);
  
  const toggleWordSelection = (wordId) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };
  
  const selectAll = () => {
    setSelectedWords(new Set(errorWords.map(w => w.id)));
  };
  
  const clearSelection = () => {
    setSelectedWords(new Set());
  };
  
  const handleDictateSelected = () => {
    if (selectedWords.size === 0) return;
    const selectedIds = errorWords.filter(w => selectedWords.has(w.id)).map(w => w.id);
    localStorage.setItem('error-dictation-words', JSON.stringify(selectedIds));
    localStorage.setItem('error-dictation-words-time', Date.now().toString());
    navigate(`/dictation-error?t=${Date.now()}`);
  };
  
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-200 border-t-coral-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-coral-500" size={28} />
            <div>
              <h1 className="font-handwritten text-2xl text-coral-600">错题本</h1>
              <p className="text-sm text-gray-500">记录你的易错单词</p>
            </div>
          </div>
          
          {errorWords.length > 0 && (
            <button
              onClick={resetErrorCounts}
              className="text-sm text-gray-500 hover:text-coral-500 flex items-center gap-1"
            >
              <RotateCcw size={16} />
              重置所有错误计数
            </button>
          )}
        </div>
        
        {/* Filter */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Filter className="text-gray-400" size={18} />
          <span className="text-sm text-gray-500">错误次数:</span>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="999"
              value={minErrors}
              onChange={(e) => setMinErrors(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-center"
            />
            <span className="text-gray-400">≤</span>
            <span className="text-sm text-gray-600">错误次数</span>
            <span className="text-gray-400">≤</span>
            <input
              type="number"
              min="0"
              max="999"
              value={maxErrors}
              onChange={(e) => setMaxErrors(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-center"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        {errorWords.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setSelectMode(!selectMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectMode 
                  ? 'bg-coral-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {selectMode ? <CheckSquare size={18} /> : <Square size={18} />}
              <span>{selectMode ? '退出选择' : '选择听写'}</span>
            </button>
            
            {selectMode && (
              <>
                <button
                  onClick={selectAll}
                  className="text-sm text-coral-500 hover:underline"
                >
                  全选 ({errorWords.length})
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:underline"
                >
                  清除
                </button>
              </>
            )}
            
            {selectMode && selectedWords.size > 0 && (
              <button
                onClick={handleDictateSelected}
                className="ml-auto flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-coral-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Play size={18} />
                <span>听写已选 ({selectedWords.size})</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Stats */}
      {errorWords.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between text-center">
            <div>
              <p className="font-handwritten text-3xl text-coral-500">{errorWords.length}</p>
              <p className="text-xs text-gray-500">易错单词</p>
            </div>
            <div>
              <p className="font-handwritten text-3xl text-red-500">
                {errorWords.reduce((acc, w) => acc + w.errorCount, 0)}
              </p>
              <p className="text-xs text-gray-500">总错误次数</p>
            </div>
            <div>
              <p className="font-handwritten text-3xl text-pink-500">
                {errorWords[0]?.errorCount || 0}
              </p>
              <p className="text-xs text-gray-500">最高错误</p>
            </div>
            {selectMode && (
              <div>
                <p className="font-handwritten text-3xl text-green-500">{selectedWords.size}</p>
                <p className="text-xs text-gray-500">已选择</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 需求3: 每组错误单词数量标注 */}
      {Object.keys(groupErrorStats).length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">各组错误分布</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(groupErrorStats).map(([groupId, stat]) => (
              <Link
                key={groupId}
                to={`/group-error-words/${groupId}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <span className="text-sm text-gray-700">{stat.name}</span>
                <span className="text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                  {stat.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Word List */}
      {errorWords.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {errorWords.map(word => (
              <div
                key={word.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedWords.has(word.id) 
                    ? 'bg-coral-50 ring-2 ring-coral-400' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {selectMode && (
                  <button
                    onClick={() => toggleWordSelection(word.id)}
                    className="flex-shrink-0"
                  >
                    {selectedWords.has(word.id) ? (
                      <CheckSquare className="text-coral-500" size={20} />
                    ) : (
                      <Square className="text-gray-400" size={20} />
                    )}
                  </button>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{word.word}</span>
                    {word.phonetic && (
                      <span className="text-xs text-gray-400 phonetic">[{word.phonetic}]</span>
                    )}
                    {/* 需求6: 发音按钮 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); playWordAudio(word.word); }}
                      className="p-1 text-coral-500 hover:text-coral-700 hover:bg-coral-50 rounded-full transition-colors"
                      title="播放发音"
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">{word.meaning}</p>
                  <Link
                    to={`/group/${word.groupId}`}
                    className="text-xs text-coral-500 hover:underline"
                  >
                    {word.groupName}
                  </Link>
                </div>
                
                {/* 需求1: 可修改错误次数 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setErrorCount(word.id, word.errorCount - 1); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 transition-colors text-gray-500"
                    title="减少错误次数"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="text-center w-10">
                    <span className="font-handwritten text-2xl text-red-500">
                      {word.errorCount}
                    </span>
                    <p className="text-xs text-gray-400">次</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setErrorCount(word.id, word.errorCount + 1); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-coral-100 hover:text-coral-500 transition-colors text-gray-500"
                    title="增加错误次数"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-gray-500">太棒了！没有需要复习的错题</p>
          <p className="text-sm text-gray-400 mt-2">
            做听写练习后，出错的单词会显示在这里
          </p>
        </div>
      )}
    </div>
  );
}
