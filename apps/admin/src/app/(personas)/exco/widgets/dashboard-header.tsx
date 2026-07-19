import { Clock } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

interface DashboardHeaderProps {
  readonly userName: string;
  readonly scopeLabel: string;
  readonly isGlobalAdmin: boolean;
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({ userName, scopeLabel, isGlobalAdmin }: DashboardHeaderProps) {
  const now = new Date();
  const greeting = greetingFor(now.getHours());

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {userName.split(' ')[0] ?? userName}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGlobalAdmin ? (
            <>Federation-wide view · {scopeLabel}</>
          ) : (
            <>Your workspace · {scopeLabel}</>
          )}
        </p>
      </div>
      <GradientPanel muted className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Current time
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {now.toLocaleString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <Clock className="h-6 w-6 text-primary" />
      </GradientPanel>
    </div>
  );
}
