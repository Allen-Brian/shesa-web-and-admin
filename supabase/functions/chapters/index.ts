/**
 * Entity Edge Function: chapters/
 *
 * Serves every chapter action at /functions/v1/chapters/{action}. See
 * `_shared/entity-router.ts` for the dispatch pattern.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { createChapter } from './create-chapter.ts';
import { setChapterAutonomy } from './set-chapter-autonomy.ts';
import { updateChapter } from './update-chapter.ts';

Deno.serve(
  entityRouter({
    'create-chapter': createChapter,
    'update-chapter': updateChapter,
    'set-chapter-autonomy': setChapterAutonomy,
  }),
);
