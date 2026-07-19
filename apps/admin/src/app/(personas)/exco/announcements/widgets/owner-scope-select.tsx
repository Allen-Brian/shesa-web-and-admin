'use client';

import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

export interface OwnerScopeOption {
  readonly id: string;
  readonly name: string;
  readonly scopeType: string;
}

interface OwnerScopeSelectProps {
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly options: readonly OwnerScopeOption[];
  readonly error?: string | undefined;
}

export function OwnerScopeSelect({ value, onChange, options, error }: OwnerScopeSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="ownerScopeId" className="text-sm">
        Publish under
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="ownerScopeId" className="w-full">
          <SelectValue placeholder="Select a scope" />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 && (
            <SelectItem value="__none__" disabled>
              No admin scopes
            </SelectItem>
          )}
          {options.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.scopeType})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name="ownerScopeId" value={value} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
