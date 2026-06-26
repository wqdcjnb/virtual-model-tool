'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Shirt,
  Images,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '工作台', icon: LayoutDashboard },
  { href: '/studio', label: '试衣工作室', icon: Sparkles },
  { href: '/models', label: '模特库', icon: Users },
  { href: '/garments', label: '服装库', icon: Shirt },
  { href: '/gallery', label: '作品画廊', icon: Images },
];

export function Sidebar() {
  const pathname = usePathname();

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

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-border">
        <div className="px-3 py-2.5 rounded-lg bg-accent/30">
          <p className="text-xs text-muted-foreground">AI Models</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-foreground">FLUX.1 Pro</span>
            <span className="text-[10px] text-muted-foreground ml-auto">IDM-VTON</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
