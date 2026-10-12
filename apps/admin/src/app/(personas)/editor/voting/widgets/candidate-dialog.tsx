'use client';

import Image from 'next/image';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@shesa/ui';
import { Loader2, Quote, Upload, UserRound, X } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { deleteCandidatePhoto, uploadCandidatePhoto } from '../actions/candidate-photo-actions';
import { createCandidate, updateCandidate, type CandidateInput } from '../actions/voting-actions';

export const BLANK_CANDIDATE: CandidateInput = {
  awardId: '',
  nomineeId: null,
  fullName: '',
  batchYear: null,
  branchLabel: null,
  profession: null,
  accomplishments: null,
  photoUrl: null,
  sortOrder: 0,
  status: 'active',
};

/**
 * The candidate form.
 *
 * This is where a nomination becomes a candidacy, and the two are not the
 * same kind of object. A nomination is what a member typed on their phone;
 * a candidacy is what SHESA publishes on a ballot, so the briefing asks the
 * Executive Committee for accurate data — name, batch, branch, profession,
 * works accomplished in the award's field, and a photograph.
 *
 * When opened from a nominee, the citations members wrote are shown beside
 * the form rather than pasted into it. They are the raw material for the
 * accomplishments paragraph, not the paragraph itself: five people's hurried
 * sentences concatenated is not something a voter should have to read.
 */
export function CandidateDialog({
  open,
  onOpenChange,
  candidateId,
  input,
  onInput,
  citations = [],
  contacts = [],
  awardName,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly candidateId: string | null;
  readonly input: CandidateInput;
  readonly onInput: (next: CandidateInput) => void;
  readonly citations?: readonly string[];
  readonly contacts?: readonly string[];
  readonly awardName?: string;
}) {
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) =>
    onInput({ ...input, [key]: value });

  const save = () => {
    if (input.fullName.trim().length < 2) {
      toast.error('A candidate needs a name.');
      return;
    }
    startTransition(async () => {
      const res = candidateId
        ? await updateCandidate(candidateId, input)
        : await createCandidate(input);
      if (res.ok) {
        toast.success(candidateId ? 'Candidate updated.' : 'Candidate added to the ballot.');
        onOpenChange(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {candidateId ? 'Edit candidate' : 'Put this person on the ballot'}
            {awardName && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">{awardName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input
                  value={input.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  maxLength={200}
                  autoFocus
                />
              </Field>
              <Field label="Profession">
                <Input
                  value={input.profession ?? ''}
                  onChange={(e) => set('profession', e.target.value)}
                  placeholder="Consultant Cardiologist"
                  maxLength={200}
                />
              </Field>
              <Field label="Batch year">
                <Input
                  value={input.batchYear ?? ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    set('batchYear', digits ? Number.parseInt(digits, 10) : null);
                  }}
                  inputMode="numeric"
                  placeholder="1998"
                />
              </Field>
              <Field label="Branch or chapter">
                <Input
                  value={input.branchLabel ?? ''}
                  onChange={(e) => set('branchLabel', e.target.value)}
                  maxLength={160}
                />
              </Field>
            </div>

            <Field label="Works accomplished — relevant to this award">
              <Textarea
                value={input.accomplishments ?? ''}
                onChange={(e) => set('accomplishments', e.target.value)}
                rows={7}
                maxLength={2000}
                placeholder="What has this person actually done in this field? This is the only thing most voters will read about them."
              />
              <p className="text-xs text-muted-foreground">
                {(input.accomplishments ?? '').trim().length}/2000 · shown on the ballot
              </p>
            </Field>

            {candidateId && (
              <Field label="Status">
                <Select
                  value={input.status}
                  onValueChange={(v) => set('status', v as CandidateInput['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">On the ballot</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <PhotoPicker
              value={input.photoUrl ?? ''}
              onChange={(url) => set('photoUrl', url || null)}
              alt={input.fullName || 'Candidate'}
            />

            {contacts.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-foreground">Contacts given</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {contacts.map((c) => (
                    <li key={c} className="break-all text-xs text-muted-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {citations.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Quote className="h-3 w-3" aria-hidden />
                  What members wrote ({citations.length})
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Source material for the paragraph on the left — not text to paste.
                </p>
                <ul className="mt-2 flex max-h-[320px] flex-col gap-2 overflow-y-auto">
                  {citations.map((c, i) => (
                    <li
                      key={`${i}-${c.slice(0, 24)}`}
                      className="whitespace-pre-line border-l-2 border-primary/40 pl-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : candidateId ? 'Save changes' : 'Add to ballot'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Square portrait picker, following the Leadership dialogs' pattern. */
function PhotoPicker({
  value,
  onChange,
  alt,
}: {
  readonly value: string;
  readonly onChange: (url: string) => void;
  readonly alt: string;
}) {
  const [pending, startTransition] = useTransition();
  const [clearing, setClearing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      const res = await uploadCandidatePhoto(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      // Replacing a photo drops the previous blob rather than orphaning it.
      if (value) void deleteCandidatePhoto(value);
      onChange(res.url);
      toast.success('Photo uploaded.');
    });
  };

  const clear = () => {
    if (!value) return;
    setClearing(true);
    const previous = value;
    onChange('');
    void deleteCandidatePhoto(previous).finally(() => setClearing(false));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">Photograph</Label>

      <div className="relative h-[180px] w-full overflow-hidden rounded-md border bg-muted/40">
        {value ? (
          <Image src={value} alt={alt} fill sizes="280px" className="object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <UserRound className="h-10 w-10" aria-hidden />
          </div>
        )}
        {(pending || clearing) && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" /> {value ? 'Replace' : 'Upload'}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={clearing}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
