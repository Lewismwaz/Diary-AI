import { PrismaDiaryEntryRepository } from "@/repositories/prisma-diary-entry.repository";
import { DiaryService } from "@/services/diary.service";

const repository = new PrismaDiaryEntryRepository();
export const diaryService = new DiaryService(repository);
