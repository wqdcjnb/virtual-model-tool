'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Users,
  Shirt,
  Images,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { getStats } from '@/lib/ai-service';
import type { TryOnResult } from '@/lib/mock-data';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalModels: 0,
    totalGarments: 0,
    totalResults: 0,
    recentResults: [] as TryOnResult[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">AI Virtual Try-On Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI驱动的虚拟试衣平台 - 生成模特、上传服装、创建试衣效果
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="AI模特"
          value={loading ? '-' : stats.totalModels}
          color="rose"
        />
        <StatCard
          icon={Shirt}
          label="服装单品"
          value={loading ? '-' : stats.totalGarments}
          color="violet"
        />
        <StatCard
          icon={Images}
          label="试衣作品"
          value={loading ? '-' : stats.totalResults}
          color="emerald"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">快速开始</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            href="/studio"
            icon={Sparkles}
            title="开始试衣"
            description="选择模特和服装，一键生成试衣效果"
            gradient="from-rose-500/20 to-pink-500/20"
            iconColor="text-rose-400"
          />
          <QuickAction
            href="/models"
            icon={Camera}
            title="生成模特"
            description="AI生成各种风格的虚拟模特"
            gradient="from-violet-500/20 to-purple-500/20"
            iconColor="text-violet-400"
          />
          <QuickAction
            href="/garments"
            icon={Shirt}
            title="管理服装"
            description="上传和管理你的服装素材库"
            gradient="from-emerald-500/20 to-teal-500/20"
            iconColor="text-emerald-400"
          />
        </div>
      </div>


      {/* Recent Results */}
      {stats.recentResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">最近作品</h2>
            <Link
              href="/gallery"
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.recentResults.map((result) => (
              <div
                key={result.id}
                className="group relative rounded-xl overflow-hidden border border-border bg-card card-hover"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={result.imageUrl}
                    alt={result.modelName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white font-medium">{result.modelName}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">
                    {result.garmentNames.join(' + ')}
                  </p>
                </div>
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                  <span className="text-[10px] text-white/80">{result.aiModel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-500/10 text-rose-400',
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  gradient,
  iconColor,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative p-5 rounded-xl border border-border bg-gradient-to-br ${gradient} card-hover overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 ${iconColor} shrink-0 mt-0.5`} />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

