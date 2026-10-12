'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { ctaItem, navItems, siteConfig } from '@/lib/site-config';

/**
 * Site-wide top nav.
 *
 * Auto-inverts on top of dark sections: any section with
 * `[data-nav-dark]` in the DOM turns the nav white-on-transparent
 * while its top edge is intersecting the top strip of the viewport.
 * Once scrolled past (or on any page with no dark section), the nav
 * settles into black-on-white blur.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // On route change the browser scrolls to top, but that scroll
    // event may fire after our effects run, so seed `scrolled` from
    // the actual scrollY and reset onDark until the observer fires.
    setScrolled(window.scrollY > 8);
    setOnDark(false);

    let io: IntersectionObserver | null = null;

    // Defer the observer setup to the next frame so the new page's
    // [data-nav-dark] sections are guaranteed to be in the DOM.
    const raf = requestAnimationFrame(() => {
      const targets = document.querySelectorAll<HTMLElement>('[data-nav-dark]');
      if (targets.length === 0) return;
      const visible = new Set<Element>();
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
          }
          setOnDark(visible.size > 0);
        },
        // Effective observation zone = a thin strip at the top of the
        // viewport (~top 15% high). Any [data-nav-dark] section overlapping
        // that strip → nav flips to white-on-transparent.
        { rootMargin: '0px 0px -85% 0px', threshold: 0 },
      );
      targets.forEach((t) => io!.observe(t));
    });

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const dark = onDark && !scrolled;

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,color] duration-300 ${
          scrolled
            ? 'border-b border-black/5 bg-white/80 text-black backdrop-blur-xl'
            : dark
              ? 'border-b border-transparent bg-transparent text-white'
              : 'border-b border-transparent bg-transparent text-black'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-350 items-center justify-between gap-6 px-5 md:h-20 md:px-8 lg:px-12">
          <Link
            href="/"
            className="group flex items-center gap-3 text-lg font-black tracking-tight md:text-xl"
          >
            <span className="relative grid h-10 w-10 place-items-center transition-transform duration-500 ease-out group-hover:rotate-6 md:h-11 md:w-11">
              <Image
                src="/shesa.png"
                alt="SHESA crest"
                width={88}
                height={88}
                className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                priority
              />
            </span>
            <span className="font-display text-xl leading-none tracking-wide md:text-2xl">
              {siteConfig.name}
            </span>
          </Link>

          <nav className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group relative rounded-xs px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'text-primary'
                          : dark
                            ? 'text-white/75 hover:text-white'
                            : 'text-black/70 hover:text-black'
                      }`}
                    >
                      {item.label}
                      <span
                        className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100 ${
                          active ? 'scale-x-100' : ''
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={ctaItem.href}
              className={`hidden rounded-xs px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 md:inline-flex ${
                dark
                  ? 'border border-white/40 bg-white/10 text-white hover:border-primary hover:bg-primary hover:text-white'
                  : 'border border-black bg-black text-white hover:border-primary hover:bg-primary'
              }`}
            >
              {ctaItem.label}
            </Link>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`relative grid h-11 w-11 place-items-center rounded-xs border transition-colors xl:hidden ${
                dark
                  ? 'border-white/30 bg-white/5 text-white hover:border-white'
                  : 'border-black/10 bg-white text-black hover:border-black'
              }`}
            >
              <span className="sr-only">Toggle menu</span>
              <span className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform duration-300 ${
                    open ? 'translate-y-1.5 rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 h-0.5 w-5 bg-current transition-opacity duration-200 ${
                    open ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`absolute left-0 top-3 h-0.5 w-5 bg-current transition-transform duration-300 ${
                    open ? '-translate-y-1.5 -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 xl:hidden"
          >
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-0 max-h-screen overflow-y-auto bg-white pb-10 pt-24 shadow-2xl"
            >
              <nav className="mx-auto max-w-350 px-6">
                <ul className="flex flex-col divide-y divide-black/5">
                  {navItems.map((item, i) => {
                    const active =
                      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                      <motion.li
                        key={item.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.03, duration: 0.35 }}
                      >
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between py-4 text-lg font-medium transition-colors ${
                            active ? 'text-primary' : 'text-black hover:text-primary'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span
                            aria-hidden
                            className="text-black/30 transition-transform group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + navItems.length * 0.03, duration: 0.4 }}
                  className="mt-8"
                >
                  <Link
                    href={ctaItem.href}
                    className="flex w-full items-center justify-center rounded-xs bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-black"
                  >
                    {ctaItem.label}
                  </Link>
                </motion.div>
              </nav>
            </motion.div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-x-0 bottom-0 top-[calc(100dvh-4rem)] bg-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
