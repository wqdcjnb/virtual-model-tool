'use client';

import { useEffect, useState } from 'react';
import {
  Images,
  Download,
  Maximize2,
  X,
  Calendar,
  Cpu,
  Monitor,
  Trash2,
  Clock,
} from 'lucide-react';
import { listResults, deleteResult, cleanupOldResults } from '@/lib/ai-service';
import { downloadImage } from '@/lib/download';
import type { TryOnResult } from '@/lib/mock-data';

export default function GalleryPage() {
  const [results, setResults] = useState<TryOnResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<TryOnResult | null>(null);
  const [cleanedCount, setCleanedCount] = useState(0);

  const refreshResults = () => {
    listResults().then(setResults);
  };

  useEffect(() => {
    Promise.all([listResults(), cleanupOldResults(7)]).then(([data, count]) => {
      setResults(data);
      setCleanedCount(count);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除「${name}」的试衣作品吗？`)) return;
    await deleteResult(id);
    refreshResults();
  };

  const handleDownload = (result: TryOnResult) => {
    downloadImage(result.imageUrl, `tryon-${result.modelName}-${Date.now()}.png`);
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">作品画廊</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            浏览和管理你的试衣作品
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {cleanedCount > 0 && (
            <span className="text-amber-400">已清理 {cleanedCount} 件过期作品</span>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 7天自动清理</span>
          <span>共 {results.length} 件</span>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              <div className="aspect-[3/4] shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-20 shimmer rounded" />
                <div className="h-2 w-32 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((result) => (
            <div
              key={result.id}
              className="group rounded-xl overflow-hidden border border-border bg-card card-hover animate-fade-in cursor-pointer"
              onClick={() => setSelectedResult(result)}
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={result.imageUrl}
                  alt={`${result.modelName} try-on`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Hover actions */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedResult(result);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
                  >
                    <Maximize2 className="w-3 h-3 inline mr-1" /> 查看
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(result);
                    }}
                    className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(result.id, result.modelName);
                    }}
                    className="p-1.5 rounded-lg bg-red-500/30 backdrop-blur-sm text-white hover:bg-red-500/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* AI Model badge */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                  <span className="text-[10px] text-white/80">{result.aiModel}</span>
                </div>
                {/* Resolution badge */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                  <span className="text-[10px] text-white/80">HD</span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-foreground">{result.modelName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {result.garmentNames.join(' + ')}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(result.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedResult(null)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedResult.modelName}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {selectedResult.garmentNames.join(' + ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedResult)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> 下载高清
                </button>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex items-center justify-center p-4 bg-accent/10">
              <img
                src={selectedResult.imageUrl}
                alt="Try-on result"
                className="max-h-[60vh] object-contain rounded-xl"
              />
            </div>

            {/* Prompt */}
            {selectedResult.prompt && (
              <div className="px-6 py-2.5 border-t border-border bg-accent/20">
                <p className="text-[10px] text-muted-foreground mb-1">生成描述</p>
                <p className="text-xs text-foreground leading-relaxed">{selectedResult.prompt}</p>
              </div>
            )}

            {/* Details */}
            <div className="px-6 py-3 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    AI模型: <span className="text-foreground">{selectedResult.aiModel}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    分辨率: <span className="text-foreground">{selectedResult.resolution}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedResult.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
