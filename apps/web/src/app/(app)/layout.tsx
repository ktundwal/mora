'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, PlusCircle, BookOpen, Settings, Users } from 'lucide-react';
import { AuthGuard } from '@/lib/auth-guard';
import { CryptoGuard } from '@/lib/crypto/crypto-guard';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof MessageCircle;
}

const navItems: NavItem[] = [
  { href: '/conversations', label: 'Chats', icon: MessageCircle },
  { href: '/people', label: 'People', icon: Users },
  { href: '/new', label: 'New', icon: PlusCircle },
  { href: '/playbook', label: 'Playbook', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <CryptoGuard>
        <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
          {/* Main content area */}
          <main className="flex-1 pb-16">{children}</main>

          {/* Bottom navigation */}
          <BottomNav />
        </div>
      </CryptoGuard>
    </AuthGuard>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  isActive && 'stroke-[2.5px]'
                )}
              />
              <span className={cn(isActive && 'font-medium')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
