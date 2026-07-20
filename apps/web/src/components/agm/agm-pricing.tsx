'use client';

import { motion, type Variants } from 'framer-motion';

import { AGM_PRICING } from './data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.08, ease },
  }),
};

function CheckIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
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

interface Props {
  readonly onPickTier: (amountXaf: number) => void;
}

export function AgmPricing({ onPickTier }: Props) {
  return (
    <section className="relative bg-white py-20 text-black md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-14">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              The Tickets
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              Choose your <span className="italic text-primary">seat.</span>
            </motion.h2>
          </div>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-4"
          >
            The three-day pass, the reserved table, the scholarship-underwriting patronage. Click
            one to prefill the registration form.
          </motion.p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {AGM_PRICING.map((tier, i) => {
            const featured = tier.key === 'patron';
            return (
              <motion.article
                key={tier.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.75, delay: i * 0.08, ease }}
                className={`relative flex h-full flex-col overflow-hidden rounded-xs border p-6 md:p-8 ${
                  featured
                    ? 'border-primary bg-black text-white shadow-[0_18px_50px_-16px_rgba(139,21,51,0.35)]'
                    : 'border-black/10 bg-white text-black'
                }`}
              >
                {featured && (
                  <span className="absolute right-6 top-6 rounded-xs bg-primary px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-white">
                    Popular
                  </span>
                )}
                <p
                  className={`font-heading text-[11px] font-medium uppercase tracking-[0.28em] ${featured ? 'text-primary' : 'text-primary'}`}
                >
                  {tier.label}
                </p>
                <h3
                  className={`mt-4 font-heading font-thin leading-tight ${featured ? 'text-white' : 'text-black'}`}
                  style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.15rem)', letterSpacing: '-0.02em' }}
                >
                  {tier.caption}
                </h3>
                <p
                  className={`mt-4 font-heading font-thin tabular-nums ${featured ? 'text-white' : 'text-black'}`}
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
                >
                  {tier.amountXaf.toLocaleString()}{' '}
                  <span className={`text-sm ${featured ? 'text-white/60' : 'text-black/50'}`}>
                    XAF
                  </span>
                </p>
                <ul
                  className={`mt-6 flex flex-col gap-2.5 text-[13.5px] leading-[1.6] ${featured ? 'text-white/75' : 'text-black/70'}`}
                >
                  {tier.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <CheckIcon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-primary' : 'text-primary'}`}
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => onPickTier(tier.amountXaf)}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xs px-5 py-3 text-sm font-medium tracking-wide transition-all duration-300 ${
                    featured
                      ? 'bg-primary text-white hover:bg-white hover:text-primary'
                      : 'bg-black text-white hover:bg-primary'
                  }`}
                >
                  Register at this tier
                  <span aria-hidden>→</span>
                </button>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
