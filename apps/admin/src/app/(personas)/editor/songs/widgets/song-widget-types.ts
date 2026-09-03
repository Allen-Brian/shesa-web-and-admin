export interface GroupRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sortOrder: number;
}

export interface SongRow {
  readonly id: string;
  readonly groupId: string;
  readonly slug: string;
  readonly title: string;
  readonly performer: string | null;
  readonly description: string | null;
  readonly audioUrl: string;
  readonly coverUrl: string | null;
  readonly durationSeconds: number | null;
  readonly lyrics: string | null;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
