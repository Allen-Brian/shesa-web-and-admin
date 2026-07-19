export type BatchImportStep = 'pick' | 'uploading' | 'review' | 'confirming' | 'done';

export type BatchImportEditableField =
  'fullName' | 'displayName' | 'email' | 'phone' | 'batchEntryYear' | 'house' | 'network';

export type BatchImportRowEdits = Partial<Record<BatchImportEditableField, string>>;

export interface BatchImportScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}
