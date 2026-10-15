import type {
  CreateDiaryEntryInput,
  DiaryEntry,
} from "@/domain/diary/diary-entry";

export type UpdateDiaryEntryInput = {
  title?: string;
  cleanedContent?: string;
  originalTranscript?: string | null;
  entryDate?: Date;
};

export interface DiaryEntryRepository {
  create(input: CreateDiaryEntryInput): Promise<DiaryEntry>;

  listByUser(userId: string): Promise<DiaryEntry[]>;

  findById(
    id: string,
    userId: string
  ): Promise<DiaryEntry | null>;

  update(
    id: string,
    userId: string,
    input: UpdateDiaryEntryInput
  ): Promise<DiaryEntry | null>;

  delete(
    id: string,
    userId: string
  ): Promise<boolean>;
}