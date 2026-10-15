import { prisma } from "@/lib/prisma";
import type { CreateDiaryEntryInput, DiaryEntry } from "@/domain/diary/diary-entry";
import type {
  DiaryEntryRepository,
  UpdateDiaryEntryInput,
} from "@/repositories/diary-entry.repository";

export class PrismaDiaryEntryRepository implements DiaryEntryRepository {
  async create(input: CreateDiaryEntryInput): Promise<DiaryEntry> {
    return prisma.diaryEntry.create({
      data: {
        userId: input.userId,
        title: input.title,
        originalTranscript: input.originalTranscript ?? null,
        cleanedContent: input.cleanedContent,
        source: input.source ?? "TEXT",
        entryDate: input.entryDate ?? new Date(),
      },
    });
  }

  async listByUser(userId: string): Promise<DiaryEntry[]> {
    return prisma.diaryEntry.findMany({
      where: { userId },
      orderBy: { entryDate: "desc" },
      take: 50,
    });
  }

  async findById(
  id: string,
  userId: string
) {
  return prisma.diaryEntry.findFirst({
    where: {
      id,
      userId,
    },
  });
}

async update(
  id: string,
  userId: string,
  input: UpdateDiaryEntryInput
) {
  const existingEntry =
    await prisma.diaryEntry.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    });

  if (!existingEntry) {
    return null;
  }

  return prisma.diaryEntry.update({
    where: {
      id: existingEntry.id,
    },
    data: input,
  });
}

async delete(
  id: string,
  userId: string
) {
  const result =
    await prisma.diaryEntry.deleteMany({
      where: {
        id,
        userId,
      },
    });

  return result.count > 0;
}
}
