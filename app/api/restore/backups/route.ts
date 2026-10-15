
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { google } from "googleapis";

import {
  getPortableRestoreSession,
  PORTABLE_RESTORE_COOKIE,
} from "@/lib/auth/portable-restore-session";

import {
  createGoogleRestoreOAuthClient,
} from "@/lib/google/google-restore-oauth";

import {
  decryptGoogleRestoreToken,
} from "@/lib/google/google-restore-token-crypto";

export const runtime = "nodejs";

export async function GET() {
  const headers = {
    "Cache-Control": "no-store",
  };

  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(
      PORTABLE_RESTORE_COOKIE
    )?.value;

    const session = token
      ? await getPortableRestoreSession(token)
      : null;

    if (
      !session ||
      !session.googleVerifiedAt ||
      !session.googleAccountId ||
      !session.encryptedGoogleAccessToken
    ) {
      return NextResponse.json(
        { error: "Google verification is required." },
        { status: 401, headers }
      );
    }

    const accessToken =
      decryptGoogleRestoreToken(
        session.encryptedGoogleAccessToken
      );

    const oauthClient =
      createGoogleRestoreOAuthClient();

    oauthClient.setCredentials({
      access_token: accessToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: oauthClient,
    });

    const backups: Array<{
      id: string;
      name: string;
      createdAt: string | null;
      modifiedAt: string | null;
      size: string | null;
    }> = [];

    let pageToken: string | undefined;

    // Bound the discovery request.
    for (let page = 0; page < 5; page++) {
      const response = await drive.files.list({
        q: [
          "trashed = false",
          "appProperties has { key='diaryAi' and value='true' }",
          "appProperties has { key='backupVersion' and value='2' }",
        ].join(" and "),

        fields:
          "nextPageToken,files(id,name,createdTime,modifiedTime,size)",

        pageSize: 100,
        pageToken,
      });

      for (const file of response.data.files ?? []) {
        if (!file.id) continue;

        backups.push({
          id: file.id,
          name: file.name ?? "Diary AI Backup",
          createdAt: file.createdTime ?? null,
          modifiedAt: file.modifiedTime ?? null,
          size: file.size ?? null,
        });
      }

      pageToken =
        response.data.nextPageToken ?? undefined;

      if (!pageToken) break;
    }

    backups.sort((a, b) =>
      (b.createdAt ?? "").localeCompare(
        a.createdAt ?? ""
      )
    );

    return NextResponse.json(
      {
        backups,
        hasMore: Boolean(pageToken),
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "Restore backup discovery failed:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return NextResponse.json(
      {
        error:
          "Unable to locate Google Drive backups. Your Google authorization may have expired.",
      },
      { status: 502, headers }
    );
  }
}
