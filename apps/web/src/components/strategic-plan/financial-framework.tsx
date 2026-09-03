'use client';

import { motion } from 'framer-motion';

import { FINANCIAL_FRAMEWORK } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function BulletList({ items }: { readonly items: readonly string[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[16px_1fr] items-baseline gap-2">
          <span
            aria-hidden
            className="mt-1 h-1.5 w-1.5 rotate-45 bg-primary/70"
            style={{ marginLeft: 4 }}
          />
          <span className="text-[13.5px] leading-[1.7] text-black/70">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function SubBlock({
  number,
  title,
  children,
  delay = 0,
}: {
  readonly number: string;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.85, delay, ease }}
      className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6 md:p-7"
    >
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
        {number}
      </p>
      <h3
        className="mt-3 font-heading text-lg font-medium text-black md:text-[1.2rem]"
        style={{ letterSpacing: '-0.01em' }}
      >
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </motion.article>
  );
}

export function FinancialFramework() {
  return (
    <SectionShell
      id="financial"
      number="6.0"
      eyebrow="Financial Framework"
      title="From dues-based to diversified, digital, and endowment-backed."
      lede="The Association’s financial future rests on three components, a centralised finance application, a diversified revenue mix, and a long-term Trust Fund."
      tone="tint"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <SubBlock number="6.1 · Overview" title="A transparent, technology-enabled model">
          {FINANCIAL_FRAMEWORK.overview.map((p, i) => (
            <p key={i} className="mt-3 text-[13.5px] leading-[1.75] text-black/70">
              {p}
            </p>
          ))}
        </SubBlock>

        <SubBlock
          number="6.2 · Finance application"
          title="Centralised, digital, auditable"
          delay={0.08}
        >
          <p className="text-[13.5px] leading-[1.75] text-black/70">
            {FINANCIAL_FRAMEWORK.financeApplication.intro}
          </p>
          <BulletList items={FINANCIAL_FRAMEWORK.financeApplication.capabilities} />
          <p className="mt-5 rounded-xs bg-primary/6 p-4 text-[12.5px] leading-[1.65] text-black/70">
            <strong className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
              Outcome ·
            </strong>{' '}
            {FINANCIAL_FRAMEWORK.financeApplication.outcome}
          </p>
        </SubBlock>

        <SubBlock number="6.3 · Revenue" title="A diversified mix, not just dues" delay={0.16}>
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-black/50">
            Core sources
          </p>
          <BulletList items={FINANCIAL_FRAMEWORK.revenue.core} />
          <p className="mt-5 font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-black/50">
            Expanded streams
          </p>
          <BulletList items={FINANCIAL_FRAMEWORK.revenue.expanded} />
          <p className="mt-5 font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-black/50">
            Long-term mechanism
          </p>
          <BulletList items={FINANCIAL_FRAMEWORK.revenue.longTerm} />
        </SubBlock>

        <SubBlock
          number="6.4 · Expenditure"
          title="Strategic allocation to high-impact areas"
          delay={0.24}
        >
          <BulletList items={FINANCIAL_FRAMEWORK.expenditure} />
        </SubBlock>

        <SubBlock
          number="6.5 · SHESA Trust Fund"
          title="The long-term sustainability mechanism"
          delay={0.32}
        >
          <p className="text-[13.5px] leading-[1.75] text-black/70">
            {FINANCIAL_FRAMEWORK.trustFund.intro}
          </p>
          <p className="mt-5 font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-black/50">
            Objectives
          </p>
          <BulletList items={FINANCIAL_FRAMEWORK.trustFund.objectives} />
          <p className="mt-5 font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-black/50">
            Funding sources
          </p>
          <BulletList items={FINANCIAL_FRAMEWORK.trustFund.sources} />
          <p className="mt-5 rounded-xs bg-primary/6 p-4 text-[12.5px] leading-[1.65] text-black/70">
            <strong className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
              Outcome ·
            </strong>{' '}
            {FINANCIAL_FRAMEWORK.trustFund.outcome}
          </p>
        </SubBlock>

        <SubBlock
          number="6.6 · By 2030, SHESA aims to achieve"
          title="Concrete financial targets"
          delay={0.4}
        >
          <BulletList items={FINANCIAL_FRAMEWORK.targets2030} />
        </SubBlock>
      </div>
    </SectionShell>
  );
}
