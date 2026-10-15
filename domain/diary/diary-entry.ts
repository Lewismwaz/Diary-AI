export type DiaryEntry = {
  id: string;
  userId: string;
  title: string;
  originalTranscript: string | null;
  cleanedContent: string;
  source: "TEXT" | "VOICE";
  entryDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDiaryEntryInput = {
  userId: string;
  title: string;
  originalTranscript?: string | null;
  cleanedContent: string;
  source?: "TEXT" | "VOICE";
  entryDate?: Date;
};
