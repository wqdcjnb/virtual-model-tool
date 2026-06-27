'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Download,
  Loader2,
  Check,
  X,
  ChevronRight,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadImage } from '@/lib/download';
import { listModels, listGarments, generateTryOn } from '@/lib/ai-service';
import { CATEGORY_LABELS, type Model, type Garment } from '@/lib/mock-data';
import { ASPECT_RATIOS } from '@/lib/constants';
import { getSelectedModel, onModelChange } from '@/components/sidebar';

export default function StudioPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>([]);
  const [selectedGenModel, setSelectedGenModel] = useState(getSelectedModel());
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [quantity, setQuantity] = useState(1);
  const [tryOnPrompt, setTryOnPrompt] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);

  useEffect(() => {
    listModels().then(setModels);
    listGarments().then(setGarments);
    return onModelChange(() => setSelectedGenModel(getSelectedModel()));
  }, []);

  // Auto-fill default prompt when garments selected
  useEffect(() => {
    if (!tryOnPrompt.trim() && selectedGarments.length > 0 && selectedModel) {
      const gNames = selectedGarments.map((g) => g.name).join("、");
      setTryOnPrompt(`让图中的模特穿上${gNames}，保持人物面貌和背景环境不变，只更换服装，照片级真实感`);
    }
  }, [selectedGarments, selectedModel]);

  const toggleGarment = useCallback((garment: Garment) => {
    setSelectedGarments((prev) => {
      const exists = prev.find((g) => g.id === garment.id);
      if (exists) return prev.filter((g) => g.id !== garment.id);
      // Don't allow multiple items in the same category (except shoes/accessories)
      const sameCategory = prev.filter(
        (g) => g.category === garment.category && !['shoes', 'accessories'].includes(g.category)
      );
      if (sameCategory.length > 0) {
        return [...prev.filter((g) => g.category !== garment.category), garment];
      }
      return [...prev, garment];
    });
  }, []);

  const handleGenerate = async () => {
    if (!selectedModel || !tryOnPrompt.trim()) return;
    setIsGenerating(true);
    setResultImage(null);
    setResultImages([]);
    try {
      const result = await generateTryOn({
        modelId: selectedModel.id,
        garmentIds: selectedGarments.map((g) => g.id),
        genModel: selectedGenModel,
        aspectRatio,
        quantity,
        prompt: tryOnPrompt.trim(),
      });
      setResultImage(result.imageUrl);
      if (result.imageUrls) setResultImages(result.imageUrls);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setResultImage(null);
    setResultImages([]);
    setShowPreview(false);
  };

  const filteredGarments =
    activeCategory === 'all'
      ? garments
      : garments.filter((g) => g.category === activeCategory);

  const categories = ['all', ...new Set(garments.map((g) => g.category))];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">试衣工作室</h1>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Model Selection */}
        <div className="w-56 border-r border-border flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              选择模特
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model);
                  handleReset();
                }}
                className={cn(
                  'w-full text-left rounded-lg overflow-hidden border transition-all duration-200',
                  selectedModel?.id === model.id
                    ? 'border-primary selection-ring'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div className="aspect-[3/4] overflow-hidden bg-accent/20">
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground">{model.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col items-center justify-center bg-accent/10 relative overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-primary/30" />
                <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">AI正在生成试衣效果...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  使用 {selectedGenModel} 模型
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-48 h-1 rounded-full bg-accent overflow-hidden">
                <div className="h-full bg-primary rounded-full shimmer" style={{ width: '100%' }} />
              </div>
            </div>
          ) : resultImage ? (
            <div className="relative h-full w-full flex items-center justify-center p-6">
              <div className="relative max-h-full max-w-full">
                <img
                  src={resultImage}
                  alt="Try-on result"
                  className="max-h-[calc(100vh-120px)] object-contain rounded-xl shadow-2xl"
                />
                {/* Overlay actions */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => downloadImage(resultImage, `tryon-${Date.now()}.png`)}
                    className="p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                {/* Result info */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
                    <p className="text-xs text-white font-medium">{selectedModel?.name}</p>
                    <p className="text-[10px] text-white/60">
                      {selectedGarments.map((g) => g.name).join(' + ')}
                    </p>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                    <span className="text-[10px] text-white/80">2048 x 2048 HD</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">选择模特和服装开始试衣</p>
                <p className="text-xs text-muted-foreground mt-1">
                  从左侧选择模特，从右侧选择服装，然后点击生成
                </p>
              </div>
              {/* Before preview */}
              {selectedModel && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-24 rounded-lg overflow-hidden border border-border">
                    <img src={selectedModel.imageUrl} alt="" className="w-full aspect-[3/4] object-cover" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <div className="w-24 h-32 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground text-center px-2">试衣效果</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Garment Selection */}
        <div className="w-64 border-l border-border flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              选择服装
            </h2>
            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors',
                    activeCategory === cat
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {cat === 'all' ? '全部' : CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1.5">
              {filteredGarments.map((garment) => {
                const isSelected = selectedGarments.some((g) => g.id === garment.id);
                return (
                  <button
                    key={garment.id}
                    onClick={() => toggleGarment(garment)}
                    className={cn(
                      'relative rounded-lg overflow-hidden border transition-all duration-200 group',
                      isSelected
                        ? 'border-primary selection-ring'
                        : 'border-border hover:border-muted-foreground/30'
                    )}
                  >
                    <div className="aspect-square overflow-hidden bg-accent/20">
                      <img
                        src={garment.imageUrl}
                        alt={garment.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-1.5">
                      <p className="text-[10px] font-medium text-foreground truncate">
                        {garment.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {CATEGORY_LABELS[garment.category]}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected items summary */}
          {selectedGarments.length > 0 && (
            <div className="px-3 py-2 border-t border-border">
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedGarments.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] text-primary"
                  >
                    {g.name}
                    <button onClick={() => toggleGarment(g)}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col px-6 py-2 border-t border-border bg-card shrink-0 gap-2">
        {/* Prompt + Settings row */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={tryOnPrompt}
            onChange={(e) => setTryOnPrompt(e.target.value)}
            placeholder="选择模特和服装后自动生成描述，可自行修改..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="text-xs bg-accent/30 border border-border rounded-lg px-2 py-1 text-foreground outline-none shrink-0"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <div className="flex gap-1 items-center shrink-0">
            <span className="text-[10px] text-muted-foreground">数量</span>
            {[1, 2, 3, 4].map((v) => (
              <button
                key={v}
                onClick={() => setQuantity(v)}
                className={cn(
                  'w-7 h-7 rounded text-xs font-medium transition-colors',
                  quantity === v
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-accent/30 text-muted-foreground border border-border hover:border-muted-foreground/30'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {/* Action row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedModel && (
              <span className="text-xs text-muted-foreground">
                模特: <span className="text-foreground font-medium">{selectedModel.name}</span>
              </span>
            )}
            {selectedGarments.length > 0 && (
              <span className="text-xs text-muted-foreground">
                服装: <span className="text-foreground font-medium">{selectedGarments.length}件</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {resultImage && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-accent/50 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> 重新生成
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!selectedModel || selectedGarments.length === 0 || !tryOnPrompt.trim() || isGenerating}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                selectedModel && selectedGarments.length > 0 && !isGenerating
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                  : 'bg-accent text-muted-foreground cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> 生成试衣效果</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {showPreview && resultImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setShowPreview(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setShowPreview(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={resultImage}
            alt="Full preview"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
