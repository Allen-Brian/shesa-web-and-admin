import type { AttachRow } from './branch-import-types';

/**
 * Minimal CSV parser: handles the "one field per header" case with
 * quoted fields containing commas or embedded newlines. Enough for the
 * roster shape here — Excel-produced CSVs from the sample file
 * round-trip cleanly.
 */
export function parseBranchImportCsv(text: string): AttachRow[] {
  const lines: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        // ignore — handled with \n
      } else if (c === '\n') {
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  const nonEmpty = lines.filter((l) => l.some((c) => c.trim().length > 0));
  if (nonEmpty.length < 2) return [];

  const header = nonEmpty[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = (col: string) => header.indexOf(col);

  const iMemberCode = idx('member_code');
  const iEmail = idx('email');
  const iPhone = idx('phone');
  const iFullName = idx('full_name');
  const iDisplayName = idx('display_name');
  const iBatchYear = idx('batch_entry_year');
  const iHouse = idx('house');
  const iNetwork = idx('network');
  const iField = idx('field');
  const iEntryYear = idx('entry_year');
  const iExitYear = idx('exit_year');
  const iCountry = idx('current_country');
  const iRegion = idx('current_region_state');
  const iCity = idx('current_city');

  const parseYear = (raw: string | undefined): number | null => {
    if (!raw) return null;
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isNaN(n) ? null : n;
  };

  const rows: AttachRow[] = [];
  for (const cells of nonEmpty.slice(1)) {
    const at = (i: number) => (i >= 0 ? cells[i]?.trim() || null : null);
    rows.push({
      memberCode: at(iMemberCode),
      email: at(iEmail),
      phone: at(iPhone),
      fullName: at(iFullName),
      displayName: at(iDisplayName),
      batchEntryYear: parseYear(cells[iBatchYear]),
      house: at(iHouse),
      network: at(iNetwork),
      field: at(iField),
      entryYear: parseYear(cells[iEntryYear]),
      exitYear: parseYear(cells[iExitYear]),
      currentCountry: at(iCountry),
      currentRegionState: at(iRegion),
      currentCity: at(iCity),
    });
  }
  return rows;
}
