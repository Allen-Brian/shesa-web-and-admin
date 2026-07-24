'use client';

import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useState, type FormEvent } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.1, ease },
  }),
};

const REASONS = [
  'General enquiry',
  'Membership · Alumni relations',
  'Partnerships · Sponsorship',
  'Media · Press',
  'AGM 2026',
  'Donations · Support',
] as const;

type Reason = (typeof REASONS)[number];

export function ContactBody() {
  return (
    <section className="relative bg-white py-20 md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-14 md:grid-cols-12 md:gap-16 lg:gap-20">
          <div className="md:col-span-7">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              Send a message
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.65rem, 3.2vw, 2.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              We answer within <span className="italic text-primary">two business days.</span>
            </motion.h2>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              custom={2}
              className="mt-4 max-w-xl text-[14.5px] leading-[1.7] text-black/60"
            >
              Every message reaches a real person on the secretariat. Pick the right topic and we
              route you to the right desk immediately.
            </motion.p>

            <ContactForm />
          </div>

          <aside className="md:col-span-5">
            <div className="sticky top-28 flex flex-col gap-6">
              <ContactCard
                title="The Secretariat"
                lines={[
                  {
                    label: 'Email',
                    value: 'hello@shesaconnect.com',
                    href: 'mailto:hello@shesaconnect.com',
                  },
                  {
                    label: 'Phone',
                    value: '+237 6 55 12 34 56',
                    href: 'tel:+237655123456',
                  },
                  {
                    label: 'Address',
                    value: 'BP 4243, Yaoundé, Cameroon',
                  },
                ]}
              />
              <ContactCard
                title="Departments"
                lines={[
                  {
                    label: 'Membership',
                    value: 'membership@shesaconnect.com',
                    href: 'mailto:membership@shesaconnect.com',
                  },
                  {
                    label: 'Partnerships',
                    value: 'partnerships@shesaconnect.com',
                    href: 'mailto:partnerships@shesaconnect.com',
                  },
                  {
                    label: 'Press',
                    value: 'press@shesaconnect.com',
                    href: 'mailto:press@shesaconnect.com',
                  },
                  {
                    label: 'AGM 2026',
                    value: 'agm@shesaconnect.com',
                    href: 'mailto:agm@shesaconnect.com',
                  },
                ]}
              />
              <SocialCard />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reason, setReason] = useState<Reason>('General enquiry');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    // Placeholder, real backend integration comes later.
    await new Promise((r) => setTimeout(r, 900));
    setStatus('sent');
    e.currentTarget.reset();
    setReason('General enquiry');
  };

  const inputCls =
    'w-full rounded-xs border border-black/12 bg-white px-4 py-3 text-[14.5px] text-black placeholder:text-black/35 transition-colors focus:border-primary focus:outline-none';
  const labelCls =
    'block font-heading text-[10.5px] font-medium uppercase tracking-[0.24em] text-black/55';

  return (
    <motion.form
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={fadeUp}
      custom={3}
      onSubmit={handleSubmit}
      className="mt-10 flex flex-col gap-5"
    >
      <fieldset className="min-w-0">
        <legend className={labelCls}>Reason</legend>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {REASONS.map((r) => {
            const active = reason === r;
            return (
              <button
                type="button"
                key={r}
                onClick={() => setReason(r)}
                aria-pressed={active}
                className={`inline-flex items-center rounded-xs border px-4 py-2.5 text-[12.5px] font-medium leading-none tracking-wide transition-all ${
                  active
                    ? 'border-primary bg-primary text-white shadow-[0_6px_18px_-8px_rgba(139,21,51,0.35)]'
                    : 'border-black/12 bg-white text-black/70 hover:border-primary/40 hover:text-primary'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="reason" value={reason} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className={`mt-3 ${inputCls}`}
            placeholder="e.g. Dr. Etonge Ambe"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={`mt-3 ${inputCls}`}
            placeholder="you@shesaconnect.com"
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="subject">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          className={`mt-3 ${inputCls}`}
          placeholder="Give it a short handle"
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className={`mt-3 ${inputCls} resize-y`}
          placeholder="Tell us what's on your mind."
        />
      </div>

      <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="group inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {status === 'sending' ? 'Sending…' : 'Send message'}
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
          >
            →
          </span>
        </button>

        <AnimatePresence>
          {status === 'sent' && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-2 rounded-xs border border-success/40 bg-success/10 px-3 py-2 text-[12.5px] font-medium tracking-wide text-success"
            >
              <CheckIcon />
              Message received, we'll be in touch shortly.
            </motion.p>
          )}
          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-2 rounded-xs border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] font-medium tracking-wide text-destructive"
            >
              Something went wrong. Try again in a moment.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.form>
  );
}

function ContactCard({
  title,
  lines,
}: {
  readonly title: string;
  readonly lines: readonly {
    label: string;
    value: string;
    href?: string;
  }[];
}) {
  return (
    <div className="rounded-xs border border-black/10 bg-white p-6">
      <p className="font-heading text-[10.5px] font-semibold uppercase tracking-[0.28em] text-primary">
        {title}
      </p>
      <ul className="mt-5 space-y-4">
        {lines.map((l) => (
          <li key={l.label}>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-black/45">
              {l.label}
            </p>
            <p className="mt-1 font-heading text-[14.5px] text-black">
              {l.href ? (
                <a href={l.href} className="transition-colors hover:text-primary">
                  {l.value}
                </a>
              ) : (
                l.value
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialCard() {
  const socials = [
    {
      label: 'Facebook',
      href: 'https://facebook.com',
      handle: '@shesa.alumni',
    },
    { label: 'X (Twitter)', href: 'https://twitter.com', handle: '@shesa_alumni' },
    { label: 'Instagram', href: 'https://instagram.com', handle: '@shesa.alumni' },
    { label: 'LinkedIn', href: 'https://linkedin.com', handle: 'SHESA Alumni' },
    { label: 'YouTube', href: 'https://youtube.com', handle: 'SHESA Alumni' },
  ] as const;

  return (
    <div className="rounded-xs border border-black/10 bg-white p-6">
      <p className="font-heading text-[10.5px] font-semibold uppercase tracking-[0.28em] text-primary">
        Social
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {socials.map((s) => (
          <li key={s.label}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-2 rounded-xs border border-black/8 bg-white px-3 py-2 text-[13px] transition-colors hover:border-primary hover:text-primary"
            >
              <span className="font-heading font-medium text-black transition-colors group-hover:text-primary">
                {s.label}
              </span>
              <span className="text-[12px] text-black/50 group-hover:text-primary">{s.handle}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
