'use client';

import * as React from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Tag, type TagColorTheme } from './tag';

export interface TagDragDropOption {
  id: string;
  label: string;
  /** Optional muted subtitle shown after the label in the chip (kept short). */
  hint?: string;
  /** Default `colorTheme` for the chip when neither side has a manual override. */
  colorTheme?: TagColorTheme;
  /** Disable individual options (greyed out, not draggable). */
  disabled?: boolean;
}

interface Props {
  options: TagDragDropOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Heading rendered above the selected (left) panel. */
  selectedLabel?: string;
  /** Heading rendered above the available (right) panel. */
  availableLabel?: string;
  /** Tiny help text shown next to the selected heading. */
  selectedHelpText?: React.ReactNode;
  /** Tiny help text shown next to the available heading. */
  availableHelpText?: React.ReactNode;
  /** Placeholder text inside the drop zone when nothing is selected. */
  emptyDropMessage?: string;
  /** Placeholder text inside the pool when nothing is left to add. */
  emptyPoolMessage?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Two-panel drag-and-drop tag picker. Left = currently selected (the drop
 * zone), right = the pool of available options. Tags are draggable in either
 * direction, AND clickable for the same toggle behaviour — drag-and-drop
 * isn't discoverable for everyone, so we always keep a click affordance.
 *
 * Generic over arbitrary `{ id, label }` options; consumers map their own
 * domain objects (awards, departments, levels…) onto `TagDragDropOption`.
 */
export function TagDragDropPicker({
  options,
  selectedIds,
  onChange,
  selectedLabel = 'Selected',
  availableLabel = 'Available',
  selectedHelpText,
  availableHelpText,
  emptyDropMessage = 'Drag & drop tags here',
  emptyPoolMessage = 'Nothing left to add',
  searchable = true,
  disabled,
  className,
}: Props) {
  const [search, setSearch] = React.useState('');
  const [hoverTarget, setHoverTarget] = React.useState<'selected' | 'available' | null>(null);

  const byId = React.useMemo(() => {
    const m = new Map<string, TagDragDropOption>();
    options.forEach((o) => m.set(o.id, o));
    return m;
  }, [options]);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = selectedIds
    .map((id) => byId.get(id))
    .filter(Boolean) as TagDragDropOption[];
  const availableOptions = options.filter((o) => !selectedSet.has(o.id));

  const q = search.trim().toLowerCase();
  const filteredAvailable = q
    ? availableOptions.filter((o) =>
        [o.label, o.hint].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
      )
    : availableOptions;

  const toggle = React.useCallback(
    (id: string) => {
      if (disabled) return;
      const opt = byId.get(id);
      if (opt?.disabled) return;
      if (selectedSet.has(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    },
    [byId, disabled, onChange, selectedIds, selectedSet],
  );

  const moveTo = React.useCallback(
    (id: string, target: 'selected' | 'available') => {
      if (disabled) return;
      const opt = byId.get(id);
      if (opt?.disabled) return;
      const isSelected = selectedSet.has(id);
      if (target === 'selected' && !isSelected) {
        onChange([...selectedIds, id]);
      } else if (target === 'available' && isSelected) {
        onChange(selectedIds.filter((x) => x !== id));
      }
    },
    [byId, disabled, onChange, selectedIds, selectedSet],
  );

  function onDragStart(e: React.DragEvent, id: string) {
    if (disabled) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/tag-id', id);
  }

  function onDragOver(e: React.DragEvent, target: 'selected' | 'available') {
    if (disabled) return;
    if (!e.dataTransfer.types.includes('text/tag-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoverTarget(target);
  }

  function onDragLeave() {
    setHoverTarget(null);
  }

  function onDrop(e: React.DragEvent, target: 'selected' | 'available') {
    if (disabled) return;
    const id = e.dataTransfer.getData('text/tag-id');
    if (id) moveTo(id, target);
    setHoverTarget(null);
  }

  return (
    <div
      className={cn('grid gap-4 lg:grid-cols-2', className)}
      aria-disabled={disabled || undefined}
    >
      {/* Selected (drop zone) */}
      <Panel
        title={selectedLabel}
        count={selectedOptions.length}
        helpText={selectedHelpText}
        hovered={hoverTarget === 'selected'}
        onDragOver={(e) => onDragOver(e, 'selected')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'selected')}
      >
        {selectedOptions.length === 0 ? (
          <DropPlaceholder message={emptyDropMessage} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map((o) => (
              <DraggableTag
                key={o.id}
                option={o}
                onDragStart={(e) => onDragStart(e, o.id)}
                onClick={() => toggle(o.id)}
                disabled={disabled || o.disabled}
                action="remove"
              />
            ))}
          </div>
        )}
      </Panel>

      {/* Available pool */}
      <Panel
        title={availableLabel}
        count={availableOptions.length}
        helpText={availableHelpText}
        hovered={hoverTarget === 'available'}
        onDragOver={(e) => onDragOver(e, 'available')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'available')}
        toolbar={
          searchable && availableOptions.length > 0 ? (
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-24 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : null
        }
      >
        {availableOptions.length === 0 ? (
          <DropPlaceholder message={emptyPoolMessage} />
        ) : filteredAvailable.length === 0 ? (
          <DropPlaceholder message={`No matches for "${search}".`} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredAvailable.map((o) => (
              <DraggableTag
                key={o.id}
                option={o}
                onDragStart={(e) => onDragStart(e, o.id)}
                onClick={() => toggle(o.id)}
                disabled={disabled || o.disabled}
                action="add"
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

interface PanelProps {
  title: string;
  count: number;
  helpText?: React.ReactNode;
  hovered?: boolean;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  onDragOver?: React.DragEventHandler;
  onDragLeave?: React.DragEventHandler;
  onDrop?: React.DragEventHandler;
}

function Panel({
  title,
  count,
  helpText,
  hovered,
  toolbar,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}: PanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">{count}</span>
          {helpText && <span className="text-xs text-muted-foreground">· {helpText}</span>}
        </div>
        {toolbar}
      </div>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'min-h-[180px] rounded-xl border border-dashed border-border bg-muted/30 p-4 transition-colors',
          hovered && 'border-primary bg-primary/5',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DropPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-[140px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <CornerDownLeft className="h-5 w-5 opacity-60" />
      {message}
    </div>
  );
}

interface DraggableTagProps {
  option: TagDragDropOption;
  onDragStart: React.DragEventHandler;
  onClick: () => void;
  disabled?: boolean;
  action: 'add' | 'remove';
}

function DraggableTag({ option, onDragStart, onClick, disabled, action }: DraggableTagProps) {
  const baseTheme: TagColorTheme = option.colorTheme ?? 1;
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={onDragStart}
      onClick={onClick}
      disabled={disabled}
      title={action === 'add' ? 'Click or drag to add' : 'Click or drag to remove'}
      className={cn(
        'inline-flex rounded-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-grab active:cursor-grabbing hover:opacity-80',
      )}
    >
      <Tag
        text={option.hint ? `${option.label} · ${option.hint}` : option.label}
        colorTheme={baseTheme}
        size={2}
      />
    </button>
  );
}
