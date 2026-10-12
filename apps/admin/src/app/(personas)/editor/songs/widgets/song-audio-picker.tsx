'use client';

import { useRef, useState, useTransition } from 'react';
import { AudioLines, Loader2, Play, Upload, X } from 'lucide-react';

import { Button, Input, Label, toast } from '@shesa/ui';

import { uploadDirect } from '@/lib/media/direct-upload';

import { deleteSongAudio } from '../actions/photo-actions';
import { formatDuration } from './song-duration';

interface Props {
  readonly value: string;
  readonly duration: number | null;
  readonly onChange: (nextUrl: string, nextDuration: number | null) => void;
}

/**
 * Audio picker for a song. Handles either a file upload (into
 * `cms-audio/songs/…`) or a manual URL paste for external audio.
 * On successful upload, the duration is detected client-side and
 * passed back to the parent so the form can persist it.
 */
export function SongAudioPicker({ value, duration, onChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [clearing, setClearing] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const openPicker = () => fileRef.current?.click();

  /** Load the audio in a hidden <audio> tag just long enough to read its duration. */
  const detectDuration = (url: string): Promise<number | null> =>
    new Promise((resolve) => {
      const el = new Audio();
      el.preload = 'metadata';
      el.onloadedmetadata = () =>
        resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
      el.onerror = () => resolve(null);
      el.src = url;
    });

  /**
   * Straight to Storage, not through a server action.
   *
   * A song is a few megabytes and the serverless request body limit sits
   * below that, so posting the file to the server failed at the platform
   * before any of our code ran. The browser now uploads to a signed URL
   * the server issues after checking permissions.
   */
  const onFile = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      const res = await uploadDirect({ file, bucket: 'cms-audio', kind: 'audio' });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (value && value.includes('/cms-audio/')) void deleteSongAudio(value);
      const detected = await detectDuration(res.url);
      onChange(res.url, detected);
      toast.success(res.deduped ? 'Audio already stored — linked.' : 'Audio uploaded.');
    });
  };

  const setManual = () => {
    const url = manualUrl.trim();
    if (!url) return;
    startTransition(async () => {
      if (value && value.includes('/cms-audio/') && value !== url) {
        void deleteSongAudio(value);
      }
      const detected = await detectDuration(url);
      onChange(url, detected);
      setManualUrl('');
      toast.success('Audio linked.');
    });
  };

  const clear = () => {
    if (!value) return;
    setClearing(true);
    const previous = value;
    onChange('', null);
    if (previous.includes('/cms-audio/')) {
      void deleteSongAudio(previous).finally(() => setClearing(false));
    } else {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">Audio file</span>

      {value ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <AudioLines className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {value.split('/').pop()}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDuration(duration)} ·{' '}
                {value.includes('/cms-audio/') ? 'uploaded' : 'external'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => audioRef.current?.play()}
              loading={pending}
              disabled={pending}
            >
              <Play className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending || clearing}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove audio"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <audio ref={audioRef} src={value} preload="metadata" controls className="w-full" />
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No audio yet — upload a file or paste an external URL.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={openPicker} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload audio
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          MP3 / WAV / OGG / M4A · ≤ 50 MB
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sg-manual-url">…or link an external URL</Label>
        <div className="flex items-center gap-2">
          <Input
            id="sg-manual-url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://…"
            maxLength={500}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!manualUrl.trim() || pending}
            onClick={setManual}
          >
            Link
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav,audio/ogg,audio/webm,audio/aac,audio/mp4,audio/x-m4a,audio/flac,audio/x-flac"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
    </div>
  );
}
