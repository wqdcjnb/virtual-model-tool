'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listModels, generateModel, AI_MODELS } from '@/lib/ai-service';
import { DEFAULT_MODEL } from '@/lib/constants';
import {
  type Model,
  SKIN_TONES,
  BODY_TYPES,
  HAIR_STYLES,
  AGE_RANGES,
} from '@/lib/mock-data';

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL);
  const [form, setForm] = useState({
    gender: 'female',
    ageRange: AGE_RANGES[1],
    skinTone: SKIN_TONES[0],
    bodyType: BODY_TYPES[1],
    hairStyle: HAIR_STYLES[4],
    additionalPrompt: '',
  });

  const refreshModels = () => {
    listModels().then((data) => {
      setModels(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshModels();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateModel({ ...form, modelId: selectedModelId });
      refreshModels();
      setShowGenerator(false);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">模特库</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            管理和生成AI虚拟模特
          </p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> 生成新模特
        </button>
      </div>

      {/* Model Grid */}
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
          {models.map((model) => (
            <div
              key={model.id}
              className="group rounded-xl overflow-hidden border border-border bg-card card-hover animate-fade-in"
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={model.imageUrl}
                  alt={model.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-full py-1.5 rounded-lg bg-primary/90 text-white text-xs font-medium hover:bg-primary transition-colors">
                    用于试衣
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground">{model.name}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-accent/50 text-[10px] text-muted-foreground">
                    {model.gender === 'female' ? '女' : '男'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-accent/50 text-[10px] text-muted-foreground">
                    {model.skinTone}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-accent/50 text-[10px] text-muted-foreground">
                    {model.bodyType}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-accent/50 text-[10px] text-muted-foreground">
                    {model.hairStyle}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !generating && setShowGenerator(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">生成AI模特</h2>
              </div>
              <button
                onClick={() => setShowGenerator(false)}
                className="p-1 rounded-lg hover:bg-accent transition-colors"
                disabled={generating}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* AI Model Selector */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">AI 模型</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full rounded-lg bg-accent/30 border border-border px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                >
                  <optgroup label="推荐 — 支持文生图+图生图">
                    {AI_MODELS.filter((m) => m.supportsImageToImage).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.recommended ? '⭐' : ''} — {m.description}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="轻量 — 纯文生图">
                    {AI_MODELS.filter((m) => !m.supportsImageToImage).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.description}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">性别</label>
                <div className="flex gap-2">
                  {[
                    { value: 'female', label: '女性' },
                    { value: 'male', label: '男性' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, gender: opt.value })}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
                        form.gender === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">年龄段</label>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_RANGES.map((age) => (
                    <button
                      key={age}
                      onClick={() => setForm({ ...form, ageRange: age })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        form.ageRange === age
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Tone */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">肤色</label>
                <div className="flex flex-wrap gap-1.5">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setForm({ ...form, skinTone: tone })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        form.skinTone === tone
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Type */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">体型</label>
                <div className="flex flex-wrap gap-1.5">
                  {BODY_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, bodyType: type })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        form.bodyType === type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Style */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">发型</label>
                <div className="flex flex-wrap gap-1.5">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => setForm({ ...form, hairStyle: style })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        form.hairStyle === style
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Prompt */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  补充描述（可选）
                </label>
                <textarea
                  value={form.additionalPrompt}
                  onChange={(e) => setForm({ ...form, additionalPrompt: e.target.value })}
                  placeholder="例如：戴眼镜、微笑、双手叉腰..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowGenerator(false)}
                className="px-4 py-2 rounded-lg text-xs text-muted-foreground border border-border hover:bg-accent/50 transition-colors"
                disabled={generating}
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> 生成模特
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
