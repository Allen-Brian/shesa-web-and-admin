-- Migration: allow CSV uploads to the member-imports bucket
--
-- The bucket was created (20260701211645_add_member_imports_bucket) to
-- accept only the two XLSX MIME types. The Edge Function's SheetJS
-- parser already handles both CSV and XLSX inputs through the same
-- codepath, so the client dialog now also accepts CSV — but Storage
-- rejected the upload with "mime type text/csv is not supported"
-- before the payload ever reached the parser.
--
-- Widen the allowlist to include CSV. Also include a couple of common
-- browser-emitted MIME variants for CSV so operators uploading from
-- Excel-produced files, Google Sheets exports, or plain editors don't
-- hit rejection because of an off-by-one Content-Type.

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- .xlsx
     'application/vnd.ms-excel',                                          -- .xls (legacy) and some .csv from Excel
     'text/csv',                                                          -- standard CSV
     'text/plain',                                                        -- some browsers / systems send CSV as text/plain
     'application/csv',                                                   -- rare but seen
     'application/octet-stream'                                           -- some clients strip MIME entirely; SheetJS still parses correctly
   ]
 WHERE id = 'member-imports';
