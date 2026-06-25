"use client";

import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";

// ============================================================
// 常量
// ============================================================

type ModelVersion = "wanx-virtualmodel" | "virtualmodel-v2";

const V1_SIZES = ["512", "1024"] as const;
const V2_SIZES = ["1024", "2048"] as const;

const ASPECT_RATIOS = [
  { value: "", label: "保持原比例" },
  { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "1:2", label: "1:2" },
  { value: "2:1", label: "2:1" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ 排队中...",
  RUNNING: "🔄 AI 生成中...",
  SUCCEEDED: "✅ 完成",
  FAILED: "❌ 失败",
};

// ============================================================
// 主页面
// ============================================================

export default function HomePage() {
  // 输入图
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // 背景参考图
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);

  // 参数
  const [model, setModel] = useState<ModelVersion>("virtualmodel-v2");
  const [shortSideSize, setShortSideSize] = useState("1024");
  const [n, setN] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("");
  const [realPerson, setRealPerson] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [facePrompt, setFacePrompt] = useState("good face, beautiful face, best quality.");

  // 生成
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================
  // 上传输入图
  // ============================================================

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("请选择图片文件"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("图片大小不能超过 10MB"); return; }

    setError(null);
    setResults(null);
    setUploading(true);

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
    });
    reader.readAsDataURL(file);
    const base64 = await base64Promise;
    setPreviewUrl(base64);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setBaseUrl(data.baseUrl);
      setMaskUrl(data.maskUrl);
    } catch (err: any) {
      setError(err.message || "上传失败");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, []);

  // ============================================================
  // 上传背景图
  // ============================================================

  const uploadBg = useCallback(async (file: File) => {
    setBgUploading(true);
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
    });
    reader.readAsDataURL(file);
    const base64 = await base64Promise;
    setBgPreviewUrl(base64);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setBgUrl(data.baseUrl);
    } catch (err: any) {
      setError(err.message || "背景图上传失败");
      setBgPreviewUrl(null);
    } finally {
      setBgUploading(false);
    }
  }, []);

  // ============================================================
  // 拖拽
  // ============================================================

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  // ============================================================
  // 切换模型
  // ============================================================

  const handleModelChange = (m: ModelVersion) => {
    setModel(m);
    setShortSideSize(m === "wanx-virtualmodel" ? "512" : "1024");
    setAspectRatio("");
  };

  // ============================================================
  // 生成
  // ============================================================

  const handleGenerate = async () => {
    if (!baseUrl) { setError("请先上传输入图"); return; }
    if (!prompt.trim()) { setError("请输入全身形象描述"); return; }
    if (!facePrompt.trim()) { setError("请输入面部描述"); return; }

    setError(null);
    setResults(null);
    setTaskId(null);
    setTaskStatus(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          maskUrl,
          prompt: prompt.trim(),
          facePrompt: facePrompt.trim(),
          backgroundUrl: bgUrl || undefined,
          model,
          shortSideSize,
          n,
          ...(model === "virtualmodel-v2" && aspectRatio ? { aspectRatio } : {}),
          ...(model === "virtualmodel-v2" ? { realPerson } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTaskId(data.taskId);
      setTaskStatus("PENDING");
    } catch (err: any) {
      setError(err.message || "创建任务失败");
      setGenerating(false);
    }
  };

  // ============================================================
  // 轮询
  // ============================================================

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/task/${taskId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setTaskStatus(data.status);
        if (data.status === "SUCCEEDED") { setResults(data.results); setGenerating(false); }
        if (data.status === "FAILED") { setError(data.message || "生成失败"); setGenerating(false); }
      } catch (err: any) {
        setError(err.message || "查询失败");
        setGenerating(false);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [taskId]);

  // ============================================================
  // 下载
  // ============================================================

  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(url, "_blank"); }
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* 标题 */}
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          📸 AI 虚拟模特生成
        </h1>
        <p className="mt-3 text-gray-500 text-lg">
          上传模特实拍图，AI 替换模特和背景，快速生成更多展示图
        </p>
      </header>

      {/* 主体：左右两栏 */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ====== 左：输入图 ====== */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
            输入图
          </h2>

          {!previewUrl ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragging ? "border-blue-500 bg-blue-50 scale-[1.01]"
                  : uploading ? "border-gray-300 opacity-60 pointer-events-none"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
                  <p className="text-gray-500">上传中...</p>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-4">📤</div>
                  <p className="text-lg font-medium text-gray-700">
                    {dragging ? "松开鼠标上传" : "点击或拖拽上传模特图"}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">支持 PNG / JPG / WebP，最大 10MB</p>
                </>
              )}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[3/4] group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="输入图预览" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => inputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-100">更换</button>
                <button onClick={() => { setPreviewUrl(null); setBaseUrl(null); setMaskUrl(null); setResults(null); }} className="px-3 py-1.5 rounded-lg bg-white/80 text-sm font-medium text-red-500 hover:bg-white">移除</button>
              </div>
              <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">✅ 已上传</div>
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} className="hidden" />
        </section>

        {/* ====== 右：参数配置 ====== */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-sm">2</span>
            参数配置
          </h2>

          <div className="space-y-4">
            {/* 模型 */}
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <label className="text-sm font-semibold text-gray-700 block mb-2">模型版本</label>
              <div className="flex gap-2">
                {([
                  { v: "wanx-virtualmodel" as const, l: "V1 基础版" },
                  { v: "virtualmodel-v2" as const, l: "V2 推荐" },
                ]).map((o) => (
                  <button key={o.v} onClick={() => handleModelChange(o.v)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                      model === o.v ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>{o.l}</button>
                ))}
              </div>
            </div>

            {/* 尺寸 + 数量 + 比例 */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
              {/* 尺寸 */}
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">图片尺寸</label>
                <div className="flex gap-1.5">
                  {(model === "wanx-virtualmodel" ? V1_SIZES : V2_SIZES).map((s) => (
                    <button key={s} onClick={() => setShortSideSize(s)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                        shortSideSize === s ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
                      }`}>{s}px</button>
                  ))}
                </div>
              </div>

              {/* 数量 */}
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">生成数量</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((v) => (
                    <button key={v} onClick={() => setN(v)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                        n === v ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
                      }`}>{v} 张</button>
                  ))}
                </div>
              </div>

              {/* V2 宽高比 */}
              {model === "virtualmodel-v2" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">宽高比</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-purple-500 outline-none">
                    {ASPECT_RATIOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              )}

              {/* V2 是否人台 */}
              {model === "virtualmodel-v2" && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">输入类型</span>
                  <div className="flex gap-2">
                    <button onClick={() => setRealPerson(true)}
                      className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                        realPerson ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
                      }`}>👤 真人</button>
                    <button onClick={() => setRealPerson(false)}
                      className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                        !realPerson ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
                      }`}>👔 人台</button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">📝 全身形象描述</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
                placeholder="例如：A woman stands in front of a quaint French flower shop, the charming streetscape..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none" />
            </div>

            {/* Face Prompt */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">😊 面部描述</label>
              <textarea value={facePrompt} onChange={(e) => setFacePrompt(e.target.value)} rows={2}
                placeholder="good face, beautiful face, best quality."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none" />
            </div>

            {/* 背景参考图（可选） */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">🏞️ 背景参考图（可选）</label>
              {bgPreviewUrl ? (
                <div className="flex items-center gap-3 p-2 border border-green-200 rounded-xl bg-green-50/30">
                  <div className="w-12 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bgPreviewUrl} alt="背景" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-green-600 flex-1">已上传 ✅</span>
                  <button onClick={() => { setBgPreviewUrl(null); setBgUrl(null); }} className="text-xs text-red-500 hover:text-red-700">移除</button>
                </div>
              ) : (
                <button onClick={() => bgInputRef.current?.click()}
                  disabled={bgUploading}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  {bgUploading ? "上传中..." : "📎 点击上传背景参考图"}
                </button>
              )}
              <input ref={bgInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ""; }} className="hidden" />
            </div>

            {/* 生成按钮 */}
            <button onClick={handleGenerate} disabled={generating}
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-base transition-all ${
                generating ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-[0.99]"
              }`}>
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {taskStatus ? STATUS_LABEL[taskStatus] : "创建任务..."}
                </span>
              ) : "✨ 开始生成"}
            </button>
          </div>
        </section>
      </div>

      {/* ====== 错误 ====== */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">❌</span>
          <span>{error}</span>
          <button onClick={() => { setError(null); if (taskStatus === "FAILED") setGenerating(false); }}
            className="ml-auto shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ====== 输出图 ====== */}
      {results && results.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-sm">3</span>
            输出图
            <span className="text-sm font-normal text-gray-400 ml-2">（图片有效期 24 小时，请及时下载）</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((url, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">结果 {i + 1}</span>
                </div>
                <div className="p-3">
                  <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`生成结果 ${i + 1}`} className="w-full object-contain max-h-64" />
                  </div>
                  <button onClick={() => downloadImage(url, `虚拟模特_${Date.now()}_${i + 1}.jpg`)}
                    className="mt-2.5 w-full py-2 rounded-lg bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition">📥 下载图片</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 底部 */}
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
        <p>基于阿里云 DashScope 万相-虚拟模特（wanx-virtualmodel / virtualmodel-v2）</p>
        <p className="mt-1">当前免费体验，新用户额度 500 张/月</p>
      </footer>
    </div>
  );
}
