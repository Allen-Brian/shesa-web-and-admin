import { themeQuartz, type Theme } from 'ag-grid-community';

/**
 * Academia AG Grid theme — built on Quartz, wired to the design-system CSS
 * tokens so dark mode and tenant brand changes propagate automatically
 * (no theme re-instantiation required).
 *
 * Layout numbers come from the project memory: 44px primary control / 65px
 * table row / 16px cell padding. Borders are off by default; the `border`
 * variant adds an outer ring + rounded corners via wrapper CSS.
 */
export const shesaTableTheme: Theme = themeQuartz.withParams({
  backgroundColor: 'transparent',
  foregroundColor: 'var(--color-foreground)',
  chromeBackgroundColor: 'transparent',
  borderColor: 'var(--color-border)',
  borderRadius: 0,
  wrapperBorder: false,
  wrapperBorderRadius: 0,

  accentColor: 'var(--color-primary)',

  // Typography
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  headerFontWeight: 500,
  headerFontSize: 12,

  // Rows
  rowHeight: 65,
  rowHoverColor: 'color-mix(in srgb, var(--color-muted) 50%, transparent)',
  oddRowBackgroundColor: 'transparent',
  selectedRowBackgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
  rowBorder: { color: 'var(--color-border)', width: 1 },

  // Header
  headerHeight: 48,
  headerBackgroundColor: 'transparent',
  headerColumnBorder: false,
  headerRowBorder: { color: 'var(--color-border)', width: 1 },

  // Cells / columns
  cellHorizontalPadding: 16,
  columnBorder: false,

  // Inputs (checkbox + filters)
  inputBackgroundColor: 'var(--color-card)',
  inputBorder: { color: 'var(--color-border)' },
  inputFocusBorder: { color: 'var(--color-primary)' },

  // Selection checkbox — matches the standalone <Checkbox> primitive:
  // rounded square, 2px border, transparent until checked, then filled primary.
  checkboxBorderRadius: 5,
  checkboxBorderWidth: 2,
  checkboxUncheckedBackgroundColor: 'var(--color-card)',
  checkboxUncheckedBorderColor: 'var(--color-border)',
  checkboxCheckedBackgroundColor: 'var(--color-primary)',
  checkboxCheckedBorderColor: 'var(--color-primary)',
  checkboxCheckedShapeColor: '#ffffff',
  checkboxIndeterminateBackgroundColor: 'var(--color-primary)',
  checkboxIndeterminateBorderColor: 'var(--color-primary)',
  checkboxIndeterminateShapeColor: '#ffffff',

  // Range/cell focus styles disabled — admin lists are read-only.
  rangeSelectionBorderStyle: 'none',
  rangeSelectionBackgroundColor: 'transparent',
});
