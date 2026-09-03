/**
 * Public-site article shape. Sourced from `cms.articles` +
 * `cms.article_categories` at read time by the server page. The web
 * components (hero, reader) accept these as props, no static data
 * lives in this app anymore.
 */
export type Article = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly contentHtml: string;
  readonly bannerUrl: string | null;
  readonly author: {
    readonly name: string;
    readonly title: string | null;
    readonly photoUrl: string | null;
  };
  readonly categories: readonly string[];
  readonly publishAt: string; // ISO
  readonly relativeDate: string; // "2 days ago", computed by the page
  readonly displayDate: string; // "March 12, 2026", computed by the page
  readonly isFeatured: boolean;
};
