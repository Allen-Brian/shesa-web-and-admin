import QRCode from 'qrcode';

import { CIRCLES, MENTORSHIP_URL, MENTORSHIP_URL_LABEL } from './mentorship-content';

/**
 * The printable end of the page.
 *
 * ─── One code, not four ───────────────────────────────────────────────
 * The obvious build is a QR per WhatsApp group, four to a poster. This
 * is one code pointing at this page instead, for two reasons that only
 * show up later.
 *
 * A printed QR is permanent in a way a web page is not. Four codes on a
 * wall means that adding a fifth circle, or an admin revoking an invite
 * link — which WhatsApp lets them do at any time — makes every printed
 * copy wrong, and nobody reprints a poster. One code to a page keeps
 * the paper right forever: the page is edited, the wall is not.
 *
 * And a QR cannot say what it is for. Scanning straight into a WhatsApp
 * group means joining before you know whether it is the right room,
 * which is how groups fill with people who then go quiet. Landing here
 * first costs one tap and lets somebody choose.
 *
 * ─── Rendered on the server ───────────────────────────────────────────
 * `qrcode` is already a dependency, used by the receipt page. This is a
 * server component, so the SVG is generated once at build time and
 * shipped as markup: no client JavaScript, no layout shift, and it
 * prints at whatever resolution the printer has because it is vector.
 */
export async function ShareBlock() {
  const qrSvg = await QRCode.toString(MENTORSHIP_URL, {
    type: 'svg',
    margin: 0,
    color: { dark: '#111111', light: '#00000000' },
    // M survives a scuffed photocopy and a phone held at an angle,
    // which is what a poster on a wall actually gets.
    errorCorrectionLevel: 'M',
  });

  return (
    <section className="bg-white py-20 text-black md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid items-center gap-10 rounded-lg border border-black/10 p-7 md:grid-cols-12 md:gap-14 md:p-12">
          <div className="md:col-span-7">
            <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
              Share it
            </p>
            <h2
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.8rem)', letterSpacing: '-0.02em' }}
            >
              One code for all {CIRCLES.length} <span className="italic text-primary">rooms.</span>
            </h2>

            <p className="mt-6 max-w-lg text-[15px] leading-[1.75] text-black/60">
              Put this on a flyer, a banner, or the screen at the AGM. It opens this page, where
              people pick the circle that fits them. Add a room later and the same code still works,
              so nothing has to be reprinted.
            </p>

            <p className="mt-6 font-heading text-[13px] font-semibold uppercase tracking-[0.18em] text-black/70">
              Or type it
            </p>
            <p className="mt-1.5 select-all font-heading text-[clamp(0.95rem,2.6vw,1.2rem)] text-primary">
              {MENTORSHIP_URL_LABEL}
            </p>
          </div>

          <div className="md:col-span-5">
            <figure className="mx-auto flex max-w-[260px] flex-col items-center">
              <div
                aria-hidden
                className="w-full rounded-lg border border-black/10 bg-white p-5 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <figcaption className="mt-4 text-center font-heading text-[11px] font-semibold uppercase tracking-[0.24em] text-black/45">
                Scan to choose a circle
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
