'use client';

import { useState } from 'react';

import { AgmPricing } from './agm-pricing';
import { RegistrationForm } from './registration-form';

interface Props {
  readonly initialError?: string;
}

/**
 * The tier picker + registration form live together so clicking a
 * tier card can prefill the form's amount without a page reload.
 */
export function RegistrationSection({ initialError }: Props) {
  const [amountXaf, setAmountXaf] = useState<number>(25_000);

  return (
    <div className="relative">
      <AgmPricing onPickTier={setAmountXaf} />
      <section className="relative bg-white pb-24 pt-4 md:pb-32">
        <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
          <RegistrationForm
            amountXaf={amountXaf}
            onAmountChange={setAmountXaf}
            initialError={initialError}
          />
        </div>
      </section>
    </div>
  );
}
