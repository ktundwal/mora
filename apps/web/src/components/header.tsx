'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Anchor, LogOut, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useUserStore } from '@/lib/stores/user-store';
import { cn } from '@/lib/utils';

export function Header() {
  const { signOut } = useAuth();
  const { profile } = useUserStore();
  const pathname = usePathname();

  const navItems = [
    { href: '/people', label: 'People', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="hidden md:sticky md:top-0 md:block z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/people" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Anchor className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Mora</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-100",
                    isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {profile?.email && (
            <span className="hidden text-sm text-zinc-500 md:inline-block dark:text-zinc-400">
              {profile.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
