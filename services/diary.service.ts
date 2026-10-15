import type {
  DiaryEntryRepository,
} from "@/repositories/diary-entry.repository";

import type {
  CreateDiaryEntryRequest,
  UpdateDiaryEntryRequest,
} from "@/domain/diary/diary-entry.schema";

export class DiaryService {
  constructor(
    private readonly repository:
      DiaryEntryRepository
  ) {}

  createEntry(
    userId: string,
    input: CreateDiaryEntryRequest
  ) {
    return this.repository.create({
      userId,
      ...input,
    });
  }

  listEntries(
    userId: string
  ) {
    return this.repository.listByUser(
      userId
    );
  }

  getEntry(
    userId: string,
    entryId: string
  ) {
    return this.repository.findById(
      entryId,
      userId
    );
  }

  updateEntry(
    userId: string,
    entryId: string,
    input: UpdateDiaryEntryRequest
  ) {
    return this.repository.update(
      entryId,
      userId,
      input
    );
  }

  deleteEntry(
    userId: string,
    entryId: string
  ) {
    return this.repository.delete(
      entryId,
      userId
    );
  }
}