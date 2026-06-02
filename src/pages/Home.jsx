import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordsContext';
import { ChevronDown, ChevronRight, BookOpen, FileText, Clock, CheckCircle } from 'lucide-react';

export default function Home() {
  const { chapters, initialized, dictationHistory, lastDictationPosition } = useWords();
  const [expandedChapters, setExpandedChapters] = useState({});
  
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-200 border-t-coral-500"></div>
      </div>
    );
  }
  
  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };
  
  const totalWords = chapters.reduce((acc, ch) => 
    acc + ch.groups.reduce((gacc, g) => gacc + g.words.length, 0), 0
  );
  
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-handwritten text-4xl text-coral-500">{chapters.length}</p>
            <p className="text-sm text-gray-500">章节</p>
          </div>
          <div className="text-center">
            <p className="font-handwritten text-4xl text-pink-500">
              {chapters.reduce((acc, ch) => acc + ch.groups.length, 0)}
            </p>
            <p className="text-sm text-gray-500">词组</p>
          </div>
          <div className="text-center">
            <p className="font-handwritten text-4xl text-coral-600">{totalWords}</p>
            <p className="text-sm text-gray-500">单词</p>
          </div>
        </div>
      </div>
      
      {/* 上次听写位置 */}
      {(() => {
        // 找到最近一次听写的组
        let latestGroup = null;
        let latestDate = null;
        Object.entries(lastDictationPosition).forEach(([groupId, pos]) => {
          if (!latestDate || new Date(pos.date) > new Date(latestDate)) {
            latestDate = pos.date;
            latestGroup = groupId;
          }
        });
        if (!latestGroup) return null;
        // 找到组名
        let groupName = latestGroup;
        let groupHistory = dictationHistory[latestGroup];
        chapters.forEach(ch => {
          ch.groups.forEach(g => {
            if (g.id === latestGroup) groupName = g.name;
          });
        });
        return (
          <Link
            to={`/group/${latestGroup}`}
            className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4 hover:bg-coral-50 transition-colors ring-2 ring-coral-300"
          >
            <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="text-coral-500" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-coral-500 font-medium">上次听写</p>
              <p className="font-medium text-gray-800 truncate">{groupName}</p>
              <p className="text-xs text-gray-400">
                {new Date(latestDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {groupHistory && (
                  <span className="ml-2 text-green-600">正确率 {groupHistory.lastAccuracy}%</span>
                )}
              </p>
            </div>
            <ChevronRight className="text-coral-400 flex-shrink-0" size={20} />
          </Link>
        );
      })()}
      
      {/* Chapter List */}
      <div className="space-y-3">
        {chapters.map(chapter => {
          // 需求3: 计算每个章节的错误单词数量
          const chapterErrorCount = chapter.groups.reduce((acc, g) => 
            acc + g.words.filter(w => w.errorCount > 0).length, 0
          );
          
          return (
            <div key={chapter.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-coral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="text-coral-500" size={24} />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-800">{chapter.title}</h3>
                    <p className="text-sm text-gray-500">{chapter.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {chapterErrorCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {chapterErrorCount} 错
                    </span>
                  )}
                  <span className="text-sm text-gray-400">
                    {chapter.groups.length} 个词组
                  </span>
                  {expandedChapters[chapter.id] 
                    ? <ChevronDown className="text-gray-400" />
                    : <ChevronRight className="text-gray-400" />
                  }
                </div>
              </button>
              
              {expandedChapters[chapter.id] && (
                <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chapter.groups.map(group => {
                      // 需求3: 每组错误单词数量
                      const groupErrorCount = group.words.filter(w => w.errorCount > 0).length;
                      // 需求5: 听写过单元的正确率
                      const history = dictationHistory[group.id];
                      // 需求4: 上次听写位置
                      const lastPos = lastDictationPosition[group.id];
                      
                      return (
                        <Link
                          key={group.id}
                          to={`/group/${group.id}`}
                          className={`relative flex items-center justify-between p-3 bg-white rounded-xl hover:bg-coral-50 transition-colors card-hover ${
                            lastPos ? 'ring-2 ring-coral-300' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="text-pink-400 flex-shrink-0" size={18} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">{group.name}</span>
                                <span className="text-xs text-gray-400">
                                  Section {group.section}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {/* 需求5: 正确率显示 */}
                                {history && (
                                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                                    <CheckCircle size={10} />
                                    {history.lastAccuracy}%
                                  </span>
                                )}
                                {/* 需求3: 错误数量标注 */}
                                {groupErrorCount > 0 && (
                                  <span className="text-xs text-red-500">
                                    {groupErrorCount}错
                                  </span>
                                )}
                                {/* 需求4: 上次听写标注 */}
                                {lastPos && (
                                  <span className="text-xs text-coral-500 flex items-center gap-0.5">
                                    <Clock size={10} />
                                    上次听写
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-handwritten text-lg text-coral-500 flex-shrink-0">
                            {group.words.length}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
