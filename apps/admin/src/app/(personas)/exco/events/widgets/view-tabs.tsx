'use client';

import { Calendar as CalendarIcon, LayoutList } from 'lucide-react';

import { ViewTabButton } from './view-tab-button';

type View = 'list' | 'calendar';

interface ViewTabsProps {
  readonly view: View;
  readonly onChange: (v: View) => void;
}

export function ViewTabs({ view, onChange }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      <ViewTabButton active={view === 'list'} onClick={() => onChange('list')} icon={LayoutList}>
        List
      </ViewTabButton>
      <ViewTabButton
        active={view === 'calendar'}
        onClick={() => onChange('calendar')}
        icon={CalendarIcon}
      >
        Calendar
      </ViewTabButton>
    </div>
  );
}
