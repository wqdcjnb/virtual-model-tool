'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Plus,
  Upload,
  Loader2,
  X,
  Sparkles,
  ImagePlus,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listModels, generateModel, AI_MODELS, addModel, updateModelName, deleteModel } from '@/lib/ai-service';
import { DEFAULT_MODEL, getModelConfig, ASPECT_RATIOS } from '@/lib/constants';
import {
  type Model,
  SKIN_TONES,
  BODY_TYPES,
  HAIR_STYLES,
  AGE_RANGES,
} from '@/lib/mock-data';

type GenMode = 'text-to-image' | 'image-to-image';

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ---- Generator state ----
  const [genMode, setGenMode] = useState<GenMode>('text-to-image');
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL);
  const [modelName, setModelName] = useState('');
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [refPrompt, setRefPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({
    gender: 'female',
    ageRange: AGE_RANGES[1],
    skinTone: SKIN_TONES[0],
    bodyType: BODY_TYPES[1],
    hairStyle: HAIR_STYLES[4],
    additionalPrompt: '',
  });

  // ---- Upload state ----
  const [uploadForm, setUploadForm] = useState({
    name: '',
    gender: 'female' as Model['gender'],
    imagePreview: null as string | null,
    imageFile: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const config = getModelConfig(selectedModelId);
  const isImg2ImgSupported = config?.supportsImageToImage ?? true;
  const maxQuantity = config?.maxImages || 4;

  // ---- Edit state ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refreshModels = () => {
    listModels().then((data) => {
      setModels(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshModels();
  }, []);

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await updateModelName(id, editName.trim());
    setEditingId(null);
    refreshModels();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除模特「${name}」吗？相关试衣作品也会被清理。`)) return;
    await deleteModel(id);
    refreshModels();
  };

  // Switch mode — auto-fallback if model doesn't support img2img
  const handleModeChange = (mode: GenMode) => {
    if (mode === 'image-to-image' && !isImg2ImgSupported) return;
    setGenMode(mode);
  };

  const handleModelChange = (id: string) => {
    setSelectedModelId(id);
    const cfg = getModelConfig(id);
    if (!cfg?.supportsImageToImage && genMode === 'image-to-image') {
      setGenMode('text-to-image');
    }
  };

  // ---- Upload reference image ----
  const uploadRefImage = useCallback(async (file: File) => {
    setRefUploading(true);
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
    });
    reader.readAsDataURL(file);
    const base64 = await base64Promise;
    setRefPreviewUrl(base64);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setRefUploading(false);
    }
  }, []);

  // ---- Generate ----
  const handleGenerate = async () => {
    if (genMode === 'image-to-image' && !refPreviewUrl) return;
    setGenerating(true);
    try {
      await generateModel({
        ...form,
        modelId: selectedModelId,
        mode: genMode,
        referenceImageUrl: refPreviewUrl,
        refPrompt: refPrompt.trim() || undefined,
        aspectRatio,
        quantity,
        customName: modelName.trim() || undefined,
      });
      refreshModels();
      setShowGenerator(false);
      resetGenerator();
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const resetGenerator = () => {
    setRefPreviewUrl(null);
    setRefPrompt('');
    setGenMode('text-to-image');
    setSelectedModelId(DEFAULT_MODEL);
    setAspectRatio('3:4');
    setQuantity(1);
    setModelName('');
  };

  // ---- Manual upload ----
  const handleUploadModel = async () => {
    if (!uploadForm.imageFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(uploadForm.imageFile);
      const base64 = await base64Promise;
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      await addModel({
        name: uploadForm.name.trim() || undefined,
        gender: uploadForm.gender,
        imageUrl: data.url,
      });

      refreshModels();
      setShowUpload(false);
      setUploadForm({ name: '', gender: 'female', imagePreview: null, imageFile: null });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent/50 transition-colors"
          >
            <Upload className="w-4 h-4" /> 上传模特
          </button>
          <button
            onClick={() => setShowGenerator(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> 生成新模特
          </button>
        </div>
      </div>

      {/* Model Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              <div className="aspect-[3/4] shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-20 shimmer rounded" />
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
                {editingId === model.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-border bg-accent/30 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(model.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button onClick={() => handleRename(model.id)} className="p-1 rounded hover:bg-green-500/10 text-green-500"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-accent/50 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate flex-1">{model.name}</p>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(model.id); setEditName(model.name); }}
                        className="p-1 rounded hover:bg-accent/50 text-muted-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(model.id, model.name)}
                        className="p-1 rounded hover:bg-red-500/10 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== Generator Modal ======== */}
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
              {/* AI Model + Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">AI 模型</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full rounded-lg bg-accent/30 border border-border px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {getModelConfig(selectedModelId)?.supportsImageToImage
                      ? '文生图 · 图生图'
                      : '仅文生图'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">生成模式</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleModeChange('text-to-image')}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs border transition-colors',
                        genMode === 'text-to-image'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      文生图
                    </button>
                    <button
                      onClick={() => handleModeChange('image-to-image')}
                      disabled={!isImg2ImgSupported}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs border transition-colors',
                        genMode === 'image-to-image'
                          ? 'border-primary bg-primary/10 text-primary'
                          : !isImg2ImgSupported
                            ? 'border-border text-muted-foreground/30 cursor-not-allowed'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      图生图
                    </button>
                  </div>
                </div>
              </div>

              {/* Reference Image Upload (img2img only) */}
              {genMode === 'image-to-image' && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">参考图</label>
                  {refPreviewUrl ? (
                    <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border">
                      <img src={refPreviewUrl} alt="参考图" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setRefPreviewUrl(null)}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 text-white flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
                      {refUploading ? (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1">上传参考图</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadRefImage(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <textarea
                    value={refPrompt}
                    onChange={(e) => setRefPrompt(e.target.value)}
                    placeholder="补充描述（可选）..."
                    className="w-full mt-2 h-14 px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              )}

              {/* Model Name */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">模特名称（可选）</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="不填则自动生成名称"
                  className="w-full px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
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

              {/* Age / Skin / Body / Hair */}
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

              {/* Aspect Ratio + Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">出图比例</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full rounded-lg bg-accent/30 border border-border px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {ASPECT_RATIOS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">数量</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((v) => (
                      <button
                        key={v}
                        onClick={() => v <= maxQuantity && setQuantity(v)}
                        disabled={v > maxQuantity}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs border transition-colors',
                          quantity === v
                            ? 'border-primary bg-primary/10 text-primary'
                            : v > maxQuantity
                              ? 'border-border text-muted-foreground/30 cursor-not-allowed'
                              : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
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
                disabled={generating || (genMode === 'image-to-image' && !refPreviewUrl)}
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

      {/* ======== Upload Modal ======== */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !uploading && setShowUpload(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">上传模特</h2>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded-lg hover:bg-accent transition-colors" disabled={uploading}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">模特名称</label>
                <input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="输入名称..."
                  className="w-full px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">性别</label>
                <div className="flex gap-2">
                  {['female', 'male'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setUploadForm({ ...uploadForm, gender: g as Model['gender'] })}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
                        uploadForm.gender === g
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {g === 'female' ? '女' : '男'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">照片</label>
                {uploadForm.imagePreview ? (
                  <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border">
                    <img src={uploadForm.imagePreview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setUploadForm({ ...uploadForm, imagePreview: null, imageFile: null })}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">点击上传照片</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = () => setUploadForm({ ...uploadForm, imagePreview: reader.result as string, imageFile: f });
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-lg text-xs text-muted-foreground border border-border hover:bg-accent/50 transition-colors" disabled={uploading}>
                取消
              </button>
              <button
                onClick={handleUploadModel}
                disabled={!uploadForm.imageFile || uploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 上传中...</> : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
