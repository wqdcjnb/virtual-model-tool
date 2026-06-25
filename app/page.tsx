"use client";

import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";

// ============================================================
// 类型定义
// ============================================================

type ModelVersion = "wanx-virtualmodel" | "virtualmodel-v2";

interface ImageSlot {
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploading: boolean;
}

// ============================================================
// 常量
// ============================================================

const V1_SIZES = [
  { value: "512", label: "512px" },
  { value: "1024", label: "1024px" },
];

const V2_SIZES = [
  { value: "1024", label: "1024px" },
  { value: "2048", label: "2048px" },
];

const ASPECT_RATIOS = [
  { value: "", label: "保持原比例" },
  { value: "1:1", label: "1:1 正方形" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "9:16", label: "9:16 竖版" },
  { value: "16:9", label: "16:9 横版" },
  { value: "1:2", label: "1:2" },
  { value: "2:1", label: "2:1" },
];

const SAMPLE_PROMPTS: Record<string, string> = {
  "wanx-virtualmodel":
    "一位年轻女性，身穿白色短裙，极简风格调色板，长镜头，双色效果（暗银色和浅粉色）",
  "virtualmodel-v2":
    "a beautiful chinese girl, she stands in front of a pure pink background, she is smiling",
};

const SAMPLE_FACE_PROMPTS: Record<string, string> = {
  "wanx-virtualmodel": "年轻女子，面容姣好，最高品质",
  "virtualmodel-v2": "good face, beautiful face, best quality.",
};

// ============================================================
// 主页面
// ============================================================

export default function HomePage() {
  // 图片槽位
  const [base, setBase] = useState<ImageSlot>(emptySlot());
  const [mask, setMask] = useState<ImageSlot>(emptySlot());
  const [bg, setBg] = useState<ImageSlot>(emptySlot());

  // 文本输入
  const [prompt, setPrompt] = useState("");
  const [facePrompt, setFacePrompt] = useState("");

  // 模型和参数
  const [model, setModel] = useState<ModelVersion>("virtualmodel-v2");
  const [shortSideSize, setShortSideSize] = useState("1024");
  const [n, setN] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("");
  const [backgroundWeight, setBackgroundWeight] = useState(0.5);

  // 生成状态
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);

  // 错误
  const [error, setError] = useState<string | null>(null);

  // 拖拽状态
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  // 定时器引用
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 文件输入引用
  const baseInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // 上传图片
  // ============================================================

  const uploadImage = useCallback(
    async (file: File, setSlot: (s: ImageSlot) => void) => {
      if (!file.type.startsWith("image/")) {
        setError("请选择图片文件");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("图片大小不能超过 5MB");
        return;
      }

      setError(null);

      // 本地预览
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      setSlot({ previewUrl: base64, uploadedUrl: null, uploading: true });

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setSlot({ previewUrl: base64, uploadedUrl: data.url, uploading: false });
      } catch (err: any) {
        setError(err.message || "上传失败");
        setSlot(emptySlot());
      }
    },
    []
  );

  // ============================================================
  // 拖拽事件工厂
  // ============================================================

  const makeDragHandlers = (target: string) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragTarget(target);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setDragTarget(null);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragTarget(null);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      switch (target) {
        case "base":
          uploadImage(file, setBase);
          break;
        case "mask":
          uploadImage(file, setMask);
          break;
        case "bg":
          uploadImage(file, setBg);
          break;
      }
    },
  });

  // ============================================================
  // 文件选择事件
  // ============================================================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setSlot: (s: ImageSlot) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, setSlot);
    e.target.value = "";
  };

  // ============================================================
  // 切换模型时同步更新参数和示例文本
  // ============================================================

  const handleModelChange = (m: ModelVersion) => {
    setModel(m);
    setShortSideSize(m === "wanx-virtualmodel" ? "512" : "1024");
    setAspectRatio("");
    setPrompt(SAMPLE_PROMPTS[m] || "");
    setFacePrompt(SAMPLE_FACE_PROMPTS[m] || "");
  };

  // ============================================================
  // 生成
  // ============================================================

  const handleGenerate = async () => {
    if (!base.uploadedUrl) {
      setError("请先上传模特图");
      return;
    }
    if (!mask.uploadedUrl) {
      setError("请先上传蒙版图");
      return;
    }
    if (!prompt.trim()) {
      setError("请输入全身形象描述");
      return;
    }
    if (!facePrompt.trim()) {
      setError("请输入面部描述");
      return;
    }

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
          baseImageUrl: base.uploadedUrl,
          maskImageUrl: mask.uploadedUrl,
          prompt: prompt.trim(),
          facePrompt: facePrompt.trim(),
          backgroundImageUrl: bg.uploadedUrl || undefined,
          model,
          shortSideSize,
          n,
          ...(model === "virtualmodel-v2" && aspectRatio
            ? { aspectRatio }
            : {}),
          ...(model === "virtualmodel-v2"
            ? { backgroundWeight }
            : {}),
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
  // 轮询任务结果
  // ============================================================

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/task/${taskId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setTaskStatus(data.status);

        if (data.status === "SUCCEEDED") {
          setResults(data.results || []);
          setGenerating(false);
        } else if (data.status === "FAILED") {
          setError(data.message || "生成失败");
          setGenerating(false);
        }
      } catch (err: any) {
        setError(err.message || "查询任务失败");
        setGenerating(false);
      }
    };

    // 立即查一次
    poll();

    // 每2秒轮询
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [taskId]);

  // ============================================================
  // 下载
  // ============================================================

  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  // ============================================================
  // 状态文本
  // ============================================================

  const statusLabel: Record<string, string> = {
    PENDING: "⏳ 排队中...",
    RUNNING: "🔄 AI 正在生成中...",
    SUCCEEDED: "✅ 生成完成",
    FAILED: "❌ 生成失败",
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* 标题 */}
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          AI 虚拟模特生成
        </h1>
        <p className="mt-3 text-gray-500 text-lg">
          上传模特实拍图与蒙版，AI 替换模特和背景，快速生成更多展示图
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ============================================================ */}
        {/* 左列：图片上传 */}
        {/* ============================================================ */}
        <section className="space-y-4">
          <UploadBox
            label="📸 模特图（base）"
            subtitle="上传真人或人台实拍商品展示图"
            slot={base}
            inputRef={baseInputRef}
            dragActive={dragTarget === "base"}
            dragHandlers={makeDragHandlers("base")}
            onChange={(e) => handleFileChange(e, setBase)}
            onRemove={() => setBase(emptySlot())}
            onClick={() => baseInputRef.current?.click()}
          />

          <UploadBox
            label="🎭 蒙版图（mask）"
            subtitle="上传单色蒙版图标记保留区域"
            slot={mask}
            inputRef={maskInputRef}
            dragActive={dragTarget === "mask"}
            dragHandlers={makeDragHandlers("mask")}
            onChange={(e) => handleFileChange(e, setMask)}
            onRemove={() => setMask(emptySlot())}
            onClick={() => maskInputRef.current?.click()}
          />

          <UploadBox
            label="🏞️ 背景参考图（可选）"
            subtitle="可选：上传想要的背景风格参考图"
            slot={bg}
            inputRef={bgInputRef}
            dragActive={dragTarget === "bg"}
            dragHandlers={makeDragHandlers("bg")}
            onChange={(e) => handleFileChange(e, setBg)}
            onRemove={() => setBg(emptySlot())}
            onClick={() => bgInputRef.current?.click()}
          />
        </section>

        {/* ============================================================ */}
        {/* 右列：提示词 + 参数 + 生成 */}
        {/* ============================================================ */}
        <section className="space-y-5">
          {/* 模型选择 */}
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              模型版本
            </h3>
            <div className="flex gap-2">
              {(
                [
                  { value: "wanx-virtualmodel", label: "V1 (基础版)" },
                  { value: "virtualmodel-v2", label: "V2 (推荐)" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleModelChange(opt.value as ModelVersion)
                  }
                  className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    model === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              📝 全身形象描述（prompt）
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              placeholder={
                model === "wanx-virtualmodel"
                  ? "例如：一位年轻女性，身穿白色短裙，极简风格..."
                  : "例如：A woman stands on a rural road"
              }
            />
          </div>

          {/* Face Prompt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              😊 面部描述（face_prompt）
            </label>
            <textarea
              value={facePrompt}
              onChange={(e) => setFacePrompt(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              placeholder="good face, beautiful face, best quality."
            />
          </div>

          {/* 参数 */}
          <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              ⚙️ 生成参数
            </h3>

            {/* 尺寸 */}
            <ParamRow label="图片尺寸">
              {(model === "wanx-virtualmodel" ? V1_SIZES : V2_SIZES).map(
                (s) => (
                  <OptionBtn
                    key={s.value}
                    active={shortSideSize === s.value}
                    onClick={() => setShortSideSize(s.value)}
                    label={s.label}
                  />
                )
              )}
            </ParamRow>

            {/* 数量 */}
            <ParamRow label="生成数量">
              {[1, 2, 3, 4].map((v) => (
                <OptionBtn
                  key={v}
                  active={n === v}
                  onClick={() => setN(v)}
                  label={`${v} 张`}
                />
              ))}
            </ParamRow>

            {/* V2 比例 */}
            {model === "virtualmodel-v2" && (
              <ParamRow label="宽高比">
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none"
                >
                  {ASPECT_RATIOS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </ParamRow>
            )}

            {/* V2 背景权重 */}
            {model === "virtualmodel-v2" && bg.uploadedUrl && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  背景权重: {backgroundWeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={backgroundWeight}
                  onChange={(e) =>
                    setBackgroundWeight(parseFloat(e.target.value))
                  }
                  className="w-full accent-blue-600"
                />
              </div>
            )}
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full py-3.5 rounded-xl text-white font-semibold text-base transition-all ${
              generating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-[0.99]"
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {taskStatus ? statusLabel[taskStatus] : "正在创建任务..."}
              </span>
            ) : (
              "✨ 开始生成"
            )}
          </button>
        </section>
      </div>

      {/* ============================================================ */}
      {/* 错误 */}
      {/* ============================================================ */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">❌</span>
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              if (taskStatus === "FAILED") setGenerating(false);
            }}
            className="ml-auto shrink-0 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 结果 */}
      {/* ============================================================ */}
      {results && results.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            🎉 生成结果
            <span className="text-sm font-normal text-gray-400 ml-2">
              （图片 URL 有效期 24 小时，请及时下载）
            </span>
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((url, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">
                    结果 {i + 1}
                  </span>
                </div>
                <div className="p-4">
                  <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`生成结果 ${i + 1}`}
                      className="w-full object-contain max-h-64"
                    />
                  </div>
                  <button
                    onClick={() =>
                      downloadImage(url, `虚拟模特_${Date.now()}_${i + 1}.jpg`)
                    }
                    className="mt-3 w-full py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition"
                  >
                    📥 下载图片
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 底部 */}
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
        <p>基于阿里云 DashScope 万相-虚拟模特（wanx-virtualmodel / virtualmodel-v2）</p>
        <p className="mt-1">
          当前仅提供免费体验，免费额度 500 张/月
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// 子组件
// ============================================================

function emptySlot(): ImageSlot {
  return { previewUrl: null, uploadedUrl: null, uploading: false };
}

/** 图片上传区域 */
function UploadBox({
  label,
  subtitle,
  slot,
  inputRef,
  dragActive,
  dragHandlers,
  onChange,
  onRemove,
  onClick,
}: {
  label: string;
  subtitle: string;
  slot: ImageSlot;
  inputRef: React.RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  dragHandlers: {
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onClick: () => void;
}) {
  const { previewUrl, uploadedUrl, uploading } = slot;

  return (
    <div
      onClick={uploading ? undefined : (!previewUrl ? onClick : undefined)}
      {...(!previewUrl ? dragHandlers : {})}
      className={`border-2 border-dashed rounded-xl p-4 transition-all duration-200 ${
        dragActive
          ? "border-blue-500 bg-blue-50 scale-[1.02]"
          : previewUrl
          ? "border-green-300 bg-green-50/30"
          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="h-8 w-8 rounded-full border-3 border-blue-200 border-t-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">上传中...</p>
        </div>
      ) : previewUrl ? (
        <div>
          <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
            ✅ {label.split(" ").slice(1).join(" ")}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 w-16 h-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="预览"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">
                {uploadedUrl ? "已上传 ✅" : "处理中..."}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="mt-1 text-xs text-red-500 hover:text-red-700"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <span className="text-2xl shrink-0">
            {label.includes("模特") ? "📸" : label.includes("蒙版") ? "🎭" : "🏞️"}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

/** 参数行 */
function ParamRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-1">{children}</div>
    </div>
  );
}

/** 选项按钮 */
function OptionBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}
