'use client';

import { useEffect, useState } from 'react';
import {
  Trash2,
  RotateCcw,
  XCircle,
  Clock,
  Users,
  Shirt,
  Images,
} from 'lucide-react';
import { listTrash, restoreTrashItem, permDeleteTrashItem, emptyTrash } from '@/lib/ai-service';
import type { Model, Garment, TryOnResult } from '@/lib/mock-data';

export default function RecyclePage() {
  const [trash, setTrash] = useState<{ model: Model[]; garment: Garment[]; result: TryOnResult[] }>({ model: [], garment: [], result: [] });
  const [loading, setLoading] = useState(true);

  const refresh = () => listTrash().then(setTrash);

  useEffect(() => { refresh().then(() => setLoading(false)); }, []);

  const handleRestore = async (type: string, id: string) => {
    await restoreTrashItem(type, id);
    refresh();
  };

  const handlePermDelete = async (type: string, id: string) => {
    await permDeleteTrashItem(type, id);
    refresh();
  };

  const handleEmpty = async () => {
    if (!confirm('确定永久清空回收站？此操作不可撤销。')) return;
    await emptyTrash();
    refresh();
  };

  const total = trash.model.length + trash.garment.length + trash.result.length;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">回收站</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 7天后自动永久删除
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">共 {total} 件</span>
          {total > 0 && (
            <button onClick={handleEmpty} className="px-3 py-1.5 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
              清空回收站
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">加载中...</div>
      ) : total === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">回收站为空</div>
      ) : (
        <div className="space-y-6">
          {/* Models */}
          {trash.model.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> 模特</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {trash.model.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                    <img src={m.imageUrl} alt="" className="w-12 h-16 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.gender === 'female' ? '女' : '男'}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleRestore('model', m.id)} className="p-1 rounded hover:bg-green-500/10 text-green-400"><RotateCcw className="w-3 h-3" /></button>
                      <button onClick={() => handlePermDelete('model', m.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400"><XCircle className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Garments */}
          {trash.garment.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Shirt className="w-4 h-4 text-muted-foreground" /> 服装</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {trash.garment.map((g) => (
                  <div key={g.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                    <img src={g.imageUrl} alt="" className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.category}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleRestore('garment', g.id)} className="p-1 rounded hover:bg-green-500/10 text-green-400"><RotateCcw className="w-3 h-3" /></button>
                      <button onClick={() => handlePermDelete('garment', g.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400"><XCircle className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {trash.result.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Images className="w-4 h-4 text-muted-foreground" /> 试衣作品</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {trash.result.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                    <img src={r.imageUrl} alt="" className="w-12 h-16 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{r.modelName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.garmentNames.join(' + ')}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleRestore('result', r.id)} className="p-1 rounded hover:bg-green-500/10 text-green-400"><RotateCcw className="w-3 h-3" /></button>
                      <button onClick={() => handlePermDelete('result', r.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400"><XCircle className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
