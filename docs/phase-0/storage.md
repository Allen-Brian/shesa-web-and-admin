# Storage buckets

Supabase Storage buckets + policies. Phase 0 ships six buckets (three public, three private) provisioned in `supabase/migrations/20260630191226_init_storage_buckets.sql`.

## Existing buckets

| Bucket                  | Public? | Purpose                                                  |
| ----------------------- | ------- | -------------------------------------------------------- |
| `public-gallery`        | Yes     | Public member gallery — anonymous read allowed           |
| `cms-media`             | Yes     | Images / video / audio embedded in CMS-published content |
| `echoes-audio`          | Yes     | Podcast / echo recordings                                |
| `member-documents`      | No      | Government IDs, transcripts, etc. — service-role only    |
| `receipts`              | No      | Finance receipts (Phase 3) — permission-gated            |
| `private-stream-assets` | No      | Assets for members-only streams (Phase 4)                |

Public buckets: anonymous `SELECT` allowed on `storage.objects` where the bucket is one of the three public. Private buckets: no anonymous access; access via signed URLs or the service-role client.

## Add a bucket

1. **New migration:**

   ```bash
   pnpm db:migrate:new add_<bucket_name>_bucket
   ```

2. **Insert into `storage.buckets`:**

   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'course-materials',
     'course-materials',
     false,                             -- private
     52428800,                          -- 50 MiB
     ARRAY['application/pdf', 'video/mp4']
   );
   ```

3. **Policies** — either extend the existing policy definitions to include the new bucket, or write dedicated ones. Existing policies live inline in the storage migration since `storage` schema is owned by `supabase_storage_admin` and can't hold user-defined helpers cleanly.

## Signed URL access (private buckets)

Server-side (Server Action or Edge Function):

```ts
const supabase = createServerClient(cookies);
const { data, error } = await supabase.storage
  .from('member-documents')
  .createSignedUrl(`${userId}/id-front.jpg`, 60); // valid 60 seconds
```

Include the permission check BEFORE handing out the URL — signed URLs are unlisted but not authenticated, and the URL leaks the file's existence.

## Test it

pgTAP test lives at `supabase/tests/storage_buckets.test.sql`. When adding a bucket, extend this suite with:

- anon `SELECT` returns 0 rows for private, N rows for public
- authenticated user with no permission cannot `SELECT` a private object
- service-role can always `INSERT` / `SELECT` / `DELETE`
