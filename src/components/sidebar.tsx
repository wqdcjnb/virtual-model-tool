'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Shirt,
  Images,
  Scissors,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODEL_CONFIGS, DEFAULT_MODEL } from '@/lib/constants';

// Simple shared store for selected model
let _selectedModel = DEFAULT_MODEL;
const listeners = new Set<() => void>();
export function getSelectedModel() { return _selectedModel; }
export function setSelectedModel(id: string) { _selectedModel = id; listeners.forEach(fn => fn()); }
export function onModelChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

const navItems = [
  { href: '/', label: '工作台', icon: LayoutDashboard },
  { href: '/studio', label: '试衣工作室', icon: Sparkles },
  { href: '/models', label: '模特库', icon: Users },
  { href: '/garments', label: '服装库', icon: Shirt },
  { href: '/gallery', label: '作品画廊', icon: Images },
  { href: '/recycle', label: '回收站', icon: Trash2 },
];

function ModelPicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = MODEL_CONFIGS.find(m => m.id === selected);
  return (
    <div className="px-3 py-4 border-t border-border">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-2 py-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-foreground font-medium">{current?.name || '选择模型'}</span>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-1 px-1 py-1 space-y-0.5">
          {MODEL_CONFIGS.map((m) => {
            const active = selected === m.id;
            return (
              <button key={m.id} onClick={() => { onSelect(m.id); setOpen(false); }} className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-primary' : 'bg-muted-foreground/40')} />
                <span className="text-[11px] font-medium">{m.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [selected, setSelected] = useState(_selectedModel);
  useEffect(() => onModelChange(() => setSelected(_selectedModel)), []);

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Scissors className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight">AI Try-On</h1>
          <p className="text-[10px] text-muted-foreground">Virtual Fashion Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5', isActive && 'text-primary')} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — collapsible model selector */}
      <ModelPicker selected={selected} onSelect={(id) => { setSelectedModel(id); setSelected(id); }} />
    </aside>
  );
}
