// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

/**
 * Button — component-level smoke.
 *
 * Not exhaustive; covers the two properties most likely to silently
 * break during a refactor:
 *
 *   1. `asChild` swaps out the underlying element (Slot) — critical
 *      for `<Button asChild><Link>...</Link></Button>` patterns.
 *   2. `variant` + `size` composition through cva actually produces
 *      distinct class strings — a broken cva import would still
 *      render the base class and pass a naive render test.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from './button';

describe('<Button>', () => {
  it('renders as a <button> by default', () => {
    render(<Button>Sign in</Button>);
    const el = screen.getByRole('button', { name: 'Sign in' });
    expect(el.tagName).toBe('BUTTON');
  });

  it('renders as its child when asChild', () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    const el = screen.getByRole('link', { name: 'Go' });
    expect(el.tagName).toBe('A');
    expect(el).toHaveAttribute('href', '/somewhere');
  });

  it('applies variant classes distinctly (default vs outline)', () => {
    const { rerender } = render(<Button>Sign in</Button>);
    const defaultClass = screen.getByRole('button').className;

    rerender(<Button variant="outline">Sign in</Button>);
    const outlineClass = screen.getByRole('button').className;

    expect(defaultClass).not.toBe(outlineClass);
    expect(outlineClass).toContain('border');
  });

  it('fires the onClick handler when clicked', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>Sign in</Button>);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(clicks).toBe(1);
  });

  it('honors disabled', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <Button disabled onClick={() => clicks++}>
        Sign in
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(clicks).toBe(0);
  });
});
