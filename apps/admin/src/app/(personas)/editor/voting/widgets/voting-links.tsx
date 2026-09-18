'use client';

import { Button, ConfirmDialog, toast } from '@shesa/ui';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';

import { regenerateExcoToken } from '../actions/voting-actions';

/**
 * The two doors onto the ballot.
 *
 * They sit side by side on purpose. The difference between them is the whole
 * security model of this election, and someone about to paste one into a
 * WhatsApp group should be looking at both when they decide which.
 */
export function VotingLinks({
  slug,
  excoToken,
  editionId,
  webBaseUrl,
  publicOnly = false,
}: {
  readonly slug: string;
  readonly excoToken: string;
  readonly editionId: string;
  readonly webBaseUrl: string;
  /** Public-only ceremonies have no Exco college, so no second door. */
  readonly publicOnly?: boolean;
}) {
  const base = webBaseUrl.replace(/\/+$/, '');
  const publicUrl = `${base}/awards/vote`;
  const excoUrl = `${base}/awards/exco/${excoToken}`;

  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const regenerate = () => {
    setConfirming(false);
    startTransition(async () => {
      const res = await regenerateExcoToken(editionId);
      if (res.ok) {
        toast.success('New Exco link issued. Every copy of the old one is now dead.');
        setRevealed(true);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <>
      <div className={`grid gap-4 ${publicOnly ? '' : 'lg:grid-cols-2'}`}>
        <LinkCard
          title={publicOnly ? 'Voting link' : 'Public ballot'}
          note={`Share this anywhere — WhatsApp, the website, the newsletter. It is in the sitemap and every ex-student ballot cast through it counts at the ex-student weight. Edition: ${slug}.`}
          url={publicUrl}
          visible
        />

        {/* Not rendered at all in public_only. Showing a dead link beside a
            live one is how somebody ends up sending the dead one. */}
        {!publicOnly && (
          <LinkCard
            title="Exco ballot"
            note="Private. Not linked from any page, absent from the sitemap, and disallowed in robots.txt — the only way in is this URL. A voter must pick their post and type their name, which is what lets you spot a ballot that should not be there."
            url={excoUrl}
            visible={revealed}
            tone="danger"
            extra={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRevealed((v) => !v)}
                >
                  {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {revealed ? 'Hide' : 'Reveal'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirming(true)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Issue a new link
                </Button>
              </div>
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Issue a new Exco link?"
        description="Every copy of the current link stops working immediately, including the ones already sent. Ballots already cast keep their Exco weighting — this only closes the door, it does not undo votes. You will need to send the new link to the Executive Committee."
        confirmLabel="Issue a new link"
        onConfirm={regenerate}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function LinkCard({
  title,
  note,
  url,
  visible,
  tone,
  extra,
}: {
  readonly title: string;
  readonly note: string;
  readonly url: string;
  readonly visible: boolean;
  readonly tone?: 'danger';
  readonly extra?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  // Copying works whether or not the link is revealed: hiding it is to keep
  // it off a shared screen, not to keep it from the person at the keyboard.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not reach the clipboard. Reveal the link and copy it by hand.');
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 ${
        tone === 'danger' ? 'border-amber-500/40 bg-amber-500/5' : 'bg-card'
      }`}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>

      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
          {visible ? url : '••••••••••••••••••••••••••••••••••••'}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {extra}
    </div>
  );
}
