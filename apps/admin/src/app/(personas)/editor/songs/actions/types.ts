export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export interface GroupInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly sortOrder: number;
}

export interface SongInput {
  readonly groupId: string;
  readonly slug: string;
  readonly title: string;
  readonly subtitle?: string | null;
  readonly composer?: string | null;
  readonly performer?: string | null;
  readonly description?: string | null;
  readonly audioUrl: string;
  readonly coverUrl?: string | null;
  readonly durationSeconds?: number | null;
  readonly releasedYear?: number | null;
  readonly lyrics?: string | null;
  readonly sortOrder: number;
}
