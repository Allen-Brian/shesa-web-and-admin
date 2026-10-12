'use server';

import { IMAGE, uploadPublicObject } from '@/lib/media/public-media';

/**
 * Advert image for a governance event — the first upload becomes the
 * detail page's hero, the rest form its gallery.
 *
 * Gated on `event.create` rather than `cms.edit`: this is an Exco
 * surface, and it is the same permission the events/create edge function
 * requires. Being merely signed in is not enough — the action opens a
 * service-role client, so it is the only boundary in front of a public
 * bucket.
 */
export async function uploadEventAdvertImage(formData: FormData) {
  return uploadPublicObject({
    formData,
    bucket: 'event-advert-images',
    // This bucket is uploader-scoped with no surface prefix, so the
    // path guard keys on the uploader's own id.
    prefix: '',
    accepts: [IMAGE],
    permissionKey: 'event.create',
  });
}
