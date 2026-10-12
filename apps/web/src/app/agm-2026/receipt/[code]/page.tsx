import { permanentRedirect } from 'next/navigation';

/**
 * Receipts used to live under `/agm-2026/`, from when the AGM was the only
 * thing anyone could pay for. They are now issued for project and event
 * contributions too, so the canonical address is `/receipt/{code}`.
 *
 * This redirect stays because a receipt is a document people keep: the URL
 * is printed into the QR code on every receipt issued under the old path,
 * and those are meant to still resolve years later.
 */
export default async function LegacyAgmReceiptPage({
  params,
}: {
  readonly params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  permanentRedirect(`/receipt/${code}`);
}
