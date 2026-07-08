'use client';

import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

type Leader = {
  readonly name: string;
  readonly position: string;
  readonly location?: string;
  readonly photo: string;
  readonly slug: string;
};

type Tier = {
  readonly heading: string;
  readonly caption: string;
  readonly leaders: readonly Leader[];
};

// 17 posts across 5 tiers, in hierarchical order.
const tiers: readonly Tier[] = [
  {
    heading: 'The Executive',
    caption: 'The office of the President',
    leaders: [
      {
        name: 'Dr. Etonge Ambe',
        position: 'National President',
        location: 'Yaoundé · Cameroon',
        photo: '/president_one.jpg',
        slug: 'etonge-ambe',
      },
      {
        name: 'Barr. Achu Nkeng',
        position: 'Vice President',
        location: 'Buea · Cameroon',
        photo: '/president_two.jpg',
        slug: 'achu-nkeng',
      },
      {
        name: 'Eng. Ndifon Nkweta',
        position: 'Secretary General',
        location: 'Douala · Cameroon',
        photo: '/president_one.jpg',
        slug: 'ndifon-nkweta',
      },
    ],
  },
  {
    heading: 'Council Portfolios',
    caption: 'The working core of the association',
    leaders: [
      {
        name: 'Mrs. Tanyi Bih',
        position: 'Treasurer',
        photo: '/president_two.jpg',
        slug: 'tanyi-bih',
      },
      {
        name: 'Mr. Ngwa Divine',
        position: 'Financial Secretary',
        photo: '/president_one.jpg',
        slug: 'ngwa-divine',
      },
      {
        name: 'Mrs. Awasum Grace',
        position: 'Asst. Secretary General',
        photo: '/president_two.jpg',
        slug: 'awasum-grace',
      },
      {
        name: 'Mr. Fru Wilson',
        position: 'Communications Secretary',
        photo: '/president_one.jpg',
        slug: 'fru-wilson',
      },
    ],
  },
  {
    heading: 'Coordinators',
    caption: 'Portfolios and programme leads',
    leaders: [
      {
        name: 'Dr. Chi Emmanuel',
        position: 'Programs Secretary',
        photo: '/president_two.jpg',
        slug: 'chi-emmanuel',
      },
      {
        name: 'Mrs. Nkeng Josephine',
        position: 'Welfare Secretary',
        photo: '/president_one.jpg',
        slug: 'nkeng-josephine',
      },
      {
        name: 'Mr. Achu Jean',
        position: 'Publicity Secretary',
        photo: '/president_two.jpg',
        slug: 'achu-jean',
      },
      {
        name: 'Mrs. Fon Beatrice',
        position: "Women's Coordinator",
        photo: '/president_one.jpg',
        slug: 'fon-beatrice',
      },
      {
        name: 'Mr. Tanyi Peter',
        position: 'Youth Coordinator',
        photo: '/president_two.jpg',
        slug: 'tanyi-peter',
      },
    ],
  },
  {
    heading: 'Advisory Council',
    caption: 'Counsel, oversight, and stewardship',
    leaders: [
      {
        name: 'Barr. Ndifon George',
        position: 'Legal Adviser',
        photo: '/president_one.jpg',
        slug: 'ndifon-george',
      },
      {
        name: 'Rev. Fr. Kwenti Anthony',
        position: 'Chaplain',
        photo: '/president_two.jpg',
        slug: 'kwenti-anthony',
      },
      {
        name: 'Mr. Bih Roland',
        position: 'Provost',
        photo: '/president_one.jpg',
        slug: 'bih-roland',
      },
      {
        name: 'Mr. Ngwa Charles',
        position: 'Auditor',
        photo: '/president_two.jpg',
        slug: 'ngwa-charles',
      },
      {
        name: 'Dr. Achu Samuel',
        position: 'Immediate Past President',
        photo: '/president_one.jpg',
        slug: 'achu-samuel',
      },
    ],
  },
];

// All tiers left-aligned within the section container. No `mx-auto`
// on any variant.
const gridForSize: Record<number, string> = {
  1: 'max-w-xs',
  2: 'grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2',
  3: 'grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3 md:gap-6',
  4: 'grid max-w-5xl grid-cols-2 gap-5 md:grid-cols-4 md:gap-6',
  5: 'grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-5',
};

export function MainOrgan() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-28">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex flex-col items-center text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
          >
            The Main Organ
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
            className="mt-5 font-heading font-thin leading-[1.05] text-black"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 3.5rem)',
              letterSpacing: '-0.02em',
            }}
          >
            The National <span className="text-primary">Executive Committee.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-[15px] leading-[1.7] text-black/60 md:text-base"
          >
            Seventeen posts, one charter. Elected by the general assembly and accountable to it.
          </motion.p>
        </div>

        <div className="mt-16 flex flex-col gap-14 md:mt-24 md:gap-16">
          {tiers.map((tier) => {
            const size = tier.leaders.length as 1 | 2 | 3 | 4 | 5;
            return (
              <div key={tier.heading} className="relative">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  variants={fadeUp}
                  className="mb-2 flex flex-col items-start text-left md:mb-4"
                >
                  <p className="font-heading text-[14px] font-medium uppercase tracking-[0.32em] text-primary">
                    {tier.heading}
                  </p>
                  <p className="text-[12px] tracking-wide text-black/50">{tier.caption}</p>
                </motion.div>

                <div className={gridForSize[size]}>
                  {tier.leaders.map((leader, li) => (
                    <motion.div
                      key={leader.slug}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.35 }}
                      transition={{ duration: 0.7, delay: 0.1 + li * 0.06, ease }}
                    >
                      <LeaderCard leader={leader} />
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LeaderCard({ leader }: { readonly leader: Leader }) {
  return (
    <article className="relative block">
      <div className="relative aspect-4/5 overflow-hidden rounded-xs">
        <Image
          src={leader.photo}
          alt={leader.name}
          fill
          sizes="(min-width: 1024px) 20vw, 40vw"
          quality={75}
          className="object-cover object-top"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)',
          }}
        />

        <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
          <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-white/80">
            {leader.position}
          </p>
          <h3
            className="mt-1.5 font-heading text-[15px] font-light leading-tight text-white md:text-base"
            style={{ letterSpacing: '-0.01em' }}
          >
            {leader.name}
          </h3>
          {leader.location && (
            <p className="mt-1 text-[11px] tracking-wide text-white/65">{leader.location}</p>
          )}
        </div>
      </div>
    </article>
  );
}
