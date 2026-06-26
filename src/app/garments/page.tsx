'use client';

import { useEffect, useState } from 'react';
import {
  Shirt,
  Plus,
  Upload,
  X,
  Loader2,
  Filter,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listGarments, uploadGarment, deleteGarment } from '@/lib/ai-service';
import { type Garment, CATEGORY_LABELS } from '@/lib/mock-data';

export default function GarmentsPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showUploader, setShowUploader] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'top' as Garment['category'],
    color: '',
    style: '',
    imagePreview: null as string | null,
    imageFile: null as File | null,
  });

  const refreshGarments = () => {
    listGarments().then((data) => {
      setGarments(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshGarments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除「${name}」吗？相关试衣作品也会清理。`)) return;
    await deleteGarment(id);
    refreshGarments();
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.color || !uploadForm.imageFile) return;
    setUploading(true);
    try {
      // Upload image to server
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

      await uploadGarment({
        name: uploadForm.name,
        category: uploadForm.category,
        color: uploadForm.color,
        style: uploadForm.style || '休闲',
        imageUrl: data.url,
      });
      refreshGarments();
      setShowUploader(false);
      setUploadForm({ name: '', category: 'top', color: '', style: '', imagePreview: null, imageFile: null });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const filteredGarments =
    activeCategory === 'all'
      ? garments
      : garments.filter((g) => g.category === activeCategory);

  const categories = ['all', ...new Set(garments.map((g) => g.category))];

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">服装库</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            管理和上传服装素材
          </p>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> 上传服装
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors border',
              activeCategory === cat
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            {cat === 'all' ? '全部' : CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Garment Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              <div className="aspect-square shimmer" />
              <div className="p-2 space-y-1.5">
                <div className="h-3 w-16 shimmer rounded" />
                <div className="h-2 w-10 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGarments.map((garment) => (
            <div
              key={garment.id}
              className="group rounded-xl overflow-hidden border border-border bg-card card-hover animate-fade-in"
            >
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={garment.imageUrl}
                  alt={garment.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[10px] text-white">
                    {CATEGORY_LABELS[garment.category]}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(garment.id, garment.name)}
                  className="absolute top-2 right-2 p-1 rounded bg-black/50 backdrop-blur-sm text-white/60 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-foreground truncate">{garment.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-muted-foreground">{garment.color}</span>
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <span className="text-[10px] text-muted-foreground">{garment.style}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !uploading && setShowUploader(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Upload className="w-4.5 h-4.5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">上传服装</h2>
              </div>
              <button
                onClick={() => setShowUploader(false)}
                className="p-1 rounded-lg hover:bg-accent transition-colors"
                disabled={uploading}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {/* Upload Area */}
              {uploadForm.imagePreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
                  <img src={uploadForm.imagePreview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadForm({ ...uploadForm, imagePreview: null, imageFile: null })}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-foreground font-medium">点击上传服装图片</p>
                  <p className="text-[10px] text-muted-foreground mt-1">支持 JPG、PNG，建议白色背景</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = () => setUploadForm({ ...uploadForm, imagePreview: r.result as string, imageFile: f });
                        r.readAsDataURL(f);
                      }
                    }}
                  />
                </label>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">服装名称</label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="例如：经典白色T恤"
                  className="w-full px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">分类</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setUploadForm({ ...uploadForm, category: key as Garment['category'] })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        uploadForm.category === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">颜色</label>
                <input
                  type="text"
                  value={uploadForm.color}
                  onChange={(e) => setUploadForm({ ...uploadForm, color: e.target.value })}
                  placeholder="例如：白色、黑色、蓝色"
                  className="w-full px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Style */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">风格</label>
                <input
                  type="text"
                  value={uploadForm.style}
                  onChange={(e) => setUploadForm({ ...uploadForm, style: e.target.value })}
                  placeholder="例如：休闲、正式、运动"
                  className="w-full px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowUploader(false)}
                className="px-4 py-2 rounded-lg text-xs text-muted-foreground border border-border hover:bg-accent/50 transition-colors"
                disabled={uploading}
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.name || !uploadForm.color || !uploadForm.imageFile}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> 上传
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
