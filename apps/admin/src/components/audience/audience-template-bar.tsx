'use client';

import { Save, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shesa/ui';

import type { FilterTemplate } from './filter-template-storage';

interface AudienceTemplateBarProps {
  readonly templates: readonly FilterTemplate[];
  readonly canSave: boolean;
  readonly onApply: (id: string) => void;
  readonly onOpenSaveDialog: () => void;
  readonly onDelete: (id: string) => void;
}

/**
 * Template bar sitting under the reach preview. Left: load-a-template
 * Select. Right: Save current filter (opens the SaveFilterTemplateDialog).
 * Below (if any templates exist): removable chip row for each saved
 * template, with a trash icon per chip.
 */
export function AudienceTemplateBar({
  templates,
  canSave,
  onApply,
  onOpenSaveDialog,
  onDelete,
}: AudienceTemplateBarProps) {
  return (
    <>
      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <Select value="" onValueChange={onApply}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Load filter template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  No saved templates
                </SelectItem>
              )}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1 text-xs"
          onClick={onOpenSaveDialog}
          disabled={!canSave}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>

      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {templates.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs">{t.name}</span>
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-background"
                onClick={() => onDelete(t.id)}
                aria-label={`Delete template ${t.name}`}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
