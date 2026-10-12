'use client';

import type { Workbook, Worksheet } from 'exceljs';

/**
 * Formatted-workbook builder behind every "Export" button in the
 * Finance Portal.
 *
 * The output is meant to be forwarded to a treasurer or an auditor
 * without being touched first, so it carries a letterhead (crest, org
 * name, report title, the window it covers, when it was generated),
 * headers in the brand burgundy with white text, banded and bordered
 * data, a totals row on the money columns, and print setup that fits
 * the sheet to one page wide with the header repeating on every sheet.
 *
 * Columns are sized from their own content rather than left at Excel's
 * default 8.43 — the requirement is that nothing arrives hidden behind
 * a `####` or a clipped name. Anything that would need to be wider than
 * `MAX_WIDTH` wraps instead of stretching the page.
 *
 * ExcelJS is imported dynamically. It is ~900 KB and is only ever
 * needed after a click, so it must not sit in the page's first load.
 */

/** Brand burgundy — `--color-primary`, hsl(345 80% 40%). */
const PRIMARY = 'FFB8143D';
/** A darker burgundy for the totals row so it reads as a summary band. */
const PRIMARY_DEEP = 'FF8E0F2F';
/** 6% burgundy on white — the banding tint for even data rows. */
const BAND = 'FFFBF1F3';
const INK = 'FF1A1A1A';
const MUTED = 'FF6B6B6B';
const HAIRLINE = 'FFE7E1E3';
const WHITE = 'FFFFFFFF';

/**
 * Everything on the sheet is set 1.75× the size a spreadsheet would
 * default to. These are read on a projector in a meeting and printed
 * for people who are not looking for an excuse to squint.
 *
 * Column widths scale with it. Excel measures a column in characters
 * of the *workbook's* default font, so leaving widths alone while
 * enlarging the text is precisely how figures end up hidden behind
 * `####` — the two have to move together.
 */
const SCALE = 1.75;
const pt = (base: number) => Math.round(base * SCALE * 2) / 2;

/** Widest a column may grow before its content wraps instead. */
const MAX_WIDTH = Math.round(44 * SCALE);
const MIN_WIDTH = Math.round(7 * SCALE);

/** ~40px, the row height asked for. Excel counts points, not pixels. */
const DATA_ROW_HEIGHT = 30;

export type CellValue = string | number | Date | null | undefined;

export interface ExportColumn<T> {
  readonly header: string;
  readonly value: (row: T) => CellValue;
  /** Explicit width in characters. Omit to size from the content. */
  readonly width?: number;
  readonly align?: 'left' | 'center' | 'right';
  /** Excel number format, e.g. `'#,##0'` for money, `'0.0"%"'`. */
  readonly numFmt?: string;
  /** Sum this column into the totals row. Numeric columns only. */
  readonly total?: boolean;
}

export interface ExportMeta {
  readonly label: string;
  readonly value: string;
}

export interface ExportSpec<T> {
  /** Base filename, no extension and no date — both are appended. */
  readonly filename: string;
  /** Big line on the letterhead, e.g. "Transactions". */
  readonly title: string;
  /** Scope / window line under the title. */
  readonly subtitle?: string;
  /** Filters in force, rendered as one "Label: value · …" line. */
  readonly meta?: readonly ExportMeta[];
  readonly sheetName?: string;
  readonly columns: readonly ExportColumn<T>[];
  readonly rows: readonly T[];
  /** Landscape suits wide tables; portrait is the default. */
  readonly orientation?: 'portrait' | 'landscape';
}

/** Rows 1-6 are the letterhead; the table header lands on row 7. */
const HEADER_ROW = 7;

/**
 * Builds the workbook and hands it to the browser as a download.
 * Returns the number of data rows written so the caller can toast it.
 */
export async function exportToExcel<T>(spec: ExportSpec<T>): Promise<number> {
  const ExcelJS = await import('exceljs');
  const wb: Workbook = new ExcelJS.Workbook();

  wb.creator = 'Shesa Connect';
  wb.created = new Date();

  const ws = wb.addWorksheet(sanitiseSheetName(spec.sheetName ?? spec.title), {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
    pageSetup: {
      orientation: spec.orientation ?? 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
    },
  });

  const columns = spec.columns;
  const lastCol = columns.length;

  writeLetterhead(ws, spec, lastCol);
  writeHeaderRow(ws, columns);
  // Widths are settled before the body is written: whether a row needs
  // to wrap — and so whether it can take a fixed height — depends on
  // how wide its columns ended up.
  const widths = sizeColumns(ws, spec.rows, columns);
  const firstDataRow = HEADER_ROW + 1;
  const written = writeDataRows(ws, spec.rows, columns, firstDataRow, widths);
  writeTotalsRow(ws, spec.rows, columns, firstDataRow + written);

  // AutoFilter over the header + data so the recipient can slice the
  // sheet without rebuilding it. Skipped on an empty export, where
  // Excel treats a zero-row filter range as corrupt.
  if (written > 0) {
    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW + written, column: lastCol },
    };
  }

  await attachLogo(wb, ws);
  await download(wb, `${spec.filename}-${stamp()}.xlsx`);
  return written;
}

/**
 * The letterhead block: crest, org name, report title, the window it
 * covers, the filters in force, and a burgundy rule closing it off.
 *
 * Every line is merged across the full table width so the block stays
 * centred on the page regardless of how many columns the report has.
 */
function writeLetterhead<T>(ws: Worksheet, spec: ExportSpec<T>, lastCol: number): void {
  const span = (row: number) => {
    ws.mergeCells(row, 1, row, Math.max(lastCol, 1));
    return ws.getCell(row, 1);
  };

  // The crest and the organisation's name share one merged cell,
  // spanning the table exactly like the title beneath it. The crest
  // floats inside that cell and the text is indented clear of it, so
  // the masthead reads as one band rather than as a small picture
  // sitting in the first column with a caption below it.
  const org = span(1);
  org.value = 'SHESA CONNECT';
  org.font = { name: 'Calibri', size: pt(11), bold: true, color: { argb: PRIMARY } };
  org.alignment = { vertical: 'middle', horizontal: 'left', indent: 7 };
  ws.getRow(1).height = 52;

  const title = span(2);
  title.value = spec.title;
  title.font = { name: 'Calibri', size: pt(17), bold: true, color: { argb: INK } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(2).height = 40;

  const subtitle = span(3);
  subtitle.value = spec.subtitle ?? '';
  subtitle.font = { name: 'Calibri', size: pt(10.5), color: { argb: MUTED } };
  subtitle.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(3).height = 26;

  // Who made this and when. "By Finance Portal" is not decoration —
  // these sheets get forwarded, and the next person to open one needs
  // to know what produced it and whether it is still current.
  const metaLine = [
    `Generated ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} by Finance Portal`,
    `${spec.rows.length} ${spec.rows.length === 1 ? 'row' : 'rows'}`,
    ...(spec.meta ?? []).map((m) => `${m.label}: ${m.value}`),
  ].join('  ·  ');
  const meta = span(4);
  meta.value = metaLine;
  meta.font = { name: 'Calibri', size: pt(9), italic: true, color: { argb: MUTED } };
  meta.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(4).height = 24;

  // Row 5 is the rule itself — a short row filled burgundy reads as a
  // drawn line and survives both printing and PDF export, which a cell
  // border on a merged range does not always do.
  const rule = span(5);
  rule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY } };
  ws.getRow(5).height = 5;

  ws.getRow(6).height = 10;
}

function writeHeaderRow<T>(ws: Worksheet, columns: readonly ExportColumn<T>[]): void {
  const row = ws.getRow(HEADER_ROW);
  row.height = 38;
  columns.forEach((col, i) => {
    const cell = row.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: pt(10.5), bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY } };
    cell.alignment = { vertical: 'middle', horizontal: col.align ?? 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: PRIMARY } },
      bottom: { style: 'thin', color: { argb: PRIMARY_DEEP } },
      left: { style: 'thin', color: { argb: PRIMARY } },
      right: { style: 'thin', color: { argb: PRIMARY } },
    };
  });
}

/** Writes the body and returns how many rows landed. */
function writeDataRows<T>(
  ws: Worksheet,
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
  firstDataRow: number,
  widths: readonly number[],
): number {
  rows.forEach((source, r) => {
    const row = ws.getRow(firstDataRow + r);
    const banded = r % 2 === 1;
    let wraps = false;

    columns.forEach((col, c) => {
      const cell = row.getCell(c + 1);
      const value = col.value(source);
      cell.value = value ?? '';
      cell.font = { name: 'Calibri', size: pt(10), color: { argb: INK } };
      if (col.numFmt) cell.numFmt = col.numFmt;
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align ?? (typeof value === 'number' ? 'right' : 'left'),
        wrapText: true,
      };
      if (displayLength(value, col.numFmt) > (widths[c] ?? MAX_WIDTH)) wraps = true;
      if (banded) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
      }
      cell.border = {
        bottom: { style: 'hair', color: { argb: HAIRLINE } },
        left: { style: 'hair', color: { argb: HAIRLINE } },
        right: { style: 'hair', color: { argb: HAIRLINE } },
      };
    });

    // A fixed height on a row whose text wraps would cut the second
    // line off, which is the one failure this whole file exists to
    // avoid. Those rows are left unset so Excel fits them itself;
    // every other row takes the taller, more legible height.
    if (!wraps) row.height = DATA_ROW_HEIGHT;
  });
  return rows.length;
}

/**
 * Totals band. Only drawn when at least one column opted in and there
 * is something to total — a lone "Total" label under an empty table is
 * noise, and a zero there would read as a figure rather than as an
 * absence.
 */
function writeTotalsRow<T>(
  ws: Worksheet,
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
  rowNumber: number,
): void {
  const totalled = columns.filter((c) => c.total);
  if (totalled.length === 0 || rows.length === 0) return;

  const row = ws.getRow(rowNumber);
  row.height = DATA_ROW_HEIGHT;
  columns.forEach((col, c) => {
    const cell = row.getCell(c + 1);
    if (c === 0) {
      cell.value = 'TOTAL';
    } else if (col.total) {
      let sum = 0;
      for (const source of rows) {
        const v = col.value(source);
        if (typeof v === 'number' && Number.isFinite(v)) sum += v;
      }
      cell.value = sum;
      if (col.numFmt) cell.numFmt = col.numFmt;
    }
    cell.font = { name: 'Calibri', size: pt(10.5), bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_DEEP } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: col.align ?? (col.total ? 'right' : 'left'),
    };
  });
}

/**
 * Sizes each column to the widest thing in it — header or any cell —
 * so nothing arrives clipped. Anything past `MAX_WIDTH` stops growing
 * and wraps instead, which keeps a long memo from pushing the rest of
 * the report off the page.
 */
function sizeColumns<T>(
  ws: Worksheet,
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
): number[] {
  return columns.map((col, i) => {
    // A caller's explicit width is stated in ordinary characters, so
    // it scales with the type like everything else. Taking it
    // literally would clip exactly the narrow columns — dates, codes,
    // currencies — that were sized by hand to fit.
    const measured = col.width
      ? col.width
      : Math.max(
          col.header.length,
          ...rows.map((source) => displayLength(col.value(source), col.numFmt)),
          0,
        ) + 3; // padding + the autofilter arrow inside the header cell

    const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.ceil(measured * SCALE)));
    ws.getColumn(i + 1).width = width;
    // Returned in characters at the sheet's own type size, which is
    // what the wrap test needs to compare against.
    return Math.floor(width / SCALE);
  });
}

/** Rough printed width of a value, in characters. */
function displayLength(value: CellValue, numFmt?: string): number {
  if (value == null) return 0;
  if (value instanceof Date) {
    // The format string is a good proxy for the rendered width —
    // `dd mmm yyyy` really does print about eleven characters. A flat
    // guess here overestimated every dated column, which made every
    // row containing a date look as though it needed to wrap and cost
    // them all the taller row height.
    return Math.max(10, numFmt?.length ?? 12);
  }
  if (typeof value === 'number') {
    // Grouped thousands and any currency suffix in the format string
    // both widen the printed figure beyond `String(value)`.
    const digits = Math.round(value).toString().replace('-', '').length;
    const separators = Math.max(0, Math.floor((digits - 1) / 3));
    const decimals = numFmt?.includes('.') ? 3 : 0;
    return digits + separators + decimals + (numFmt?.includes('"') ? 4 : 0) + 1;
  }
  // Longest single line — a wrapped cell is sized by its widest line,
  // not by its total length.
  return Math.max(
    ...String(value)
      .split('\n')
      .map((line) => line.length),
  );
}

/**
 * Floats the crest over the letterhead. Fetched from `/report-logo.png`
 * rather than bundled, so the export weighs nothing until it is used.
 * A failure here is deliberately swallowed: a report without its crest
 * is still a usable report, and an export that throws is not.
 */
async function attachLogo(wb: Workbook, ws: Worksheet): Promise<void> {
  try {
    const res = await fetch('/report-logo.png');
    if (!res.ok) return;
    const buffer = await res.arrayBuffer();
    const imageId = wb.addImage({ buffer, extension: 'png' });
    // Sits inside the merged masthead cell, left of the indented
    // "SHESA CONNECT". Absolute so it keeps its size when the
    // recipient resizes a column.
    ws.addImage(imageId, {
      tl: { col: 0.12, row: 0.08 },
      ext: { width: 58, height: 58 },
      editAs: 'absolute',
    });
  } catch {
    // No crest, no problem.
  }
}

/** Excel rejects `[]:*?/\` in a sheet name and caps it at 31 chars. */
function sanitiseSheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Report';
}

/** `2026-09-23` — sorts correctly in a downloads folder. */
function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function download(wb: Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** `'Transactions'` → `'transactions'`; used to build filenames. */
export function slugifyForFile(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'export'
  );
}
