'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { siteConfig } from '@/lib/site-config';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease },
  }),
};

const exploreLinks = [
  { label: 'About', href: '/about' },
  { label: 'Strategic Plan', href: '/strategic-plan' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Organs', href: '/organs' },
  { label: 'Gallery', href: '/gallery' },
] as const;

const engageLinks = [
  { label: 'News & Announcements', href: '/news' },
  { label: 'Events', href: '/events' },
  { label: 'Projects', href: '/projects' },
  { label: 'SHESA Sounds', href: '/sounds' },
] as const;

const involveLinks = [
  { label: 'AGM 2026', href: '/agm-2026' },
  { label: 'Support The Movement', href: '/agm-2026' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Contact Us', href: '/contact' },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden"
      >
        <p
          className="select-none whitespace-nowrap text-center font-display leading-[0.85] text-white/5"
          style={{
            fontSize: 'clamp(6rem, 22vw, 20rem)',
            letterSpacing: '-0.04em',
          }}
        >
          SHESA ALUMNI
        </p>
      </div>

      <div className="relative mx-auto max-w-350 px-5 pt-20 md:px-8 md:pt-24 lg:px-12">
        <div className="grid gap-14 md:grid-cols-12 md:gap-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="md:col-span-5"
          >
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center">
                <Image
                  src="/shesa.png"
                  alt="SHESA crest"
                  width={88}
                  height={88}
                  className="h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(139,21,51,0.55)] transition-transform duration-500 group-hover:rotate-6"
                />
              </span>
              <span className="font-display text-2xl leading-none tracking-wide text-white">
                {siteConfig.name}
              </span>
            </Link>

            <p
              className="mt-6 font-script text-primary"
              style={{ fontSize: '1.75rem', lineHeight: 1 }}
            >
              Viriliter age.
            </p>

            <p className="mt-6 max-w-md text-[14.5px] leading-[1.7] text-white/60">
              A living network of graduates, reconnecting, celebrating, and shaping what comes next.
              One family. Every era.
            </p>

            <ul className="mt-8 flex items-center gap-3">
              <SocialLink href="https://facebook.com" label="Facebook">
                <FacebookIcon />
              </SocialLink>
              <SocialLink href="https://twitter.com" label="X (Twitter)">
                <XIcon />
              </SocialLink>
              <SocialLink href="https://instagram.com" label="Instagram">
                <InstagramIcon />
              </SocialLink>
              <SocialLink href="https://linkedin.com" label="LinkedIn">
                <LinkedInIcon />
              </SocialLink>
              <SocialLink href="https://youtube.com" label="YouTube">
                <YouTubeIcon />
              </SocialLink>
            </ul>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
            className="md:col-span-2"
          >
            <ColumnHeading>Explore</ColumnHeading>
            <FooterLinks links={exploreLinks} />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
            className="md:col-span-2"
          >
            <ColumnHeading>Engage</ColumnHeading>
            <FooterLinks links={engageLinks} />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={3}
            className="md:col-span-3"
          >
            <ColumnHeading>Involve</ColumnHeading>
            <FooterLinks links={involveLinks} />

            <div className="mt-8">
              <ColumnHeading>Reach us</ColumnHeading>
              <address className="mt-4 not-italic text-sm leading-[1.7] text-white/60">
                <a
                  href="mailto:hello@shesaconnect.com"
                  className="transition-colors hover:text-white"
                >
                  hello@shesaconnect.com
                </a>
                <br />
                Yaoundé · Cameroon
              </address>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={5}
          className="mt-16 flex flex-col gap-6 border-t border-white/10 py-8 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between md:py-10"
        >
          <p>© {year} SHESA Alumni. All rights reserved.</p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li>
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition-colors hover:text-white">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="transition-colors hover:text-white">
                Cookies
              </Link>
            </li>
            <li>
              <Link href="/code-of-conduct" className="transition-colors hover:text-white">
                Code of Conduct
              </Link>
            </li>
          </ul>
        </motion.div>
      </div>
    </footer>
  );
}

function ColumnHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-xs font-medium uppercase tracking-[0.28em] text-primary">
      {children}
    </h3>
  );
}

function FooterLinks({ links }: { readonly links: readonly { label: string; href: string }[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="group inline-flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"
          >
            <span
              aria-hidden
              className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-4"
            />
            <span>{link.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  readonly href: string;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="grid h-9 w-9 place-items-center rounded-xs border border-white/15 bg-white/3 text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white"
      >
        {children}
      </a>
    </li>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V11h-2.7v3.2h2.7V22h3.1z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.36 0h4.37v1.9h.06c.61-1.15 2.09-2.36 4.3-2.36 4.6 0 5.45 3.03 5.45 6.98V22h-4.56v-6.61c0-1.58-.03-3.62-2.2-3.62-2.21 0-2.55 1.72-2.55 3.5V22H7.58V8z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M23.5 6.5s-.23-1.63-.94-2.35c-.9-.94-1.9-.94-2.36-1C17.06 3 12 3 12 3s-5.06 0-8.2.15c-.46.06-1.46.06-2.36 1C.73 4.87.5 6.5.5 6.5S.25 8.42.25 10.35v1.8c0 1.92.25 3.85.25 3.85s.23 1.62.94 2.34c.9.94 2.08.91 2.6 1.01 1.9.18 8 .18 8 .18s5.06-.01 8.2-.15c.46-.06 1.46-.06 2.36-1 .71-.72.94-2.35.94-2.35s.25-1.92.25-3.85v-1.8C23.75 8.42 23.5 6.5 23.5 6.5zM9.5 15V7.5l6.5 3.75L9.5 15z" />
    </svg>
  );
}
