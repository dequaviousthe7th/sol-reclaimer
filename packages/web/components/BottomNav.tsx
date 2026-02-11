'use client';

import Link from 'next/link';
import { TOOLS, ToolIcon } from './Sidebar';

interface BottomNavProps {
  activePath: string;
}

export const BottomNav = ({ activePath }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0b]/95 backdrop-blur-md border-t border-[#222228] z-50 flex justify-around items-center pb-[env(safe-area-inset-bottom)]">
      {TOOLS.map(tool => {
        const isActive = activePath === tool.href;
        return (
          <Link
            key={tool.id}
            href={tool.href}
            className={`
              flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors relative
              ${isActive ? 'text-solana-purple' : 'text-gray-500'}
            `}
          >
            {isActive && (
              <div className="absolute top-0 w-8 h-0.5 bg-solana-purple rounded-b" />
            )}
            <ToolIcon id={tool.id} />
            <span className="text-[10px] font-medium">{tool.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
