import bcrypt from "bcryptjs";

import {
  prisma,
} from "@/lib/prisma";

const PASSWORD_HASH_ROUNDS = 12;

export type AccountProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
};

type ChangePasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

type UpdateAccountProfileInput = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export class AccountNotFoundError
  extends Error {
  constructor() {
    super(
      "Account not found."
    );

    this.name =
      "AccountNotFoundError";
  }
}

export class EmailAlreadyInUseError
  extends Error {
  constructor() {
    super(
      "An account with this email already exists."
    );

    this.name =
      "EmailAlreadyInUseError";
  }
}

export class IncorrectPasswordError
  extends Error {
  constructor() {
    super(
      "Your current password is incorrect."
    );

    this.name =
      "IncorrectPasswordError";
  }
}

export class PasswordReuseError
  extends Error {
  constructor() {
    super(
      "Your new password must be different from your current password."
    );

    this.name =
      "PasswordReuseError";
  }
}


export class PasswordChangeConflictError extends Error {
  constructor() {
    super(
      "Your password was changed by another request. Please sign in again."
    );

    this.name = "PasswordChangeConflictError";
  }
}


export async function getAccountProfile(
  userId: string
): Promise<AccountProfile> {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

  if (!user) {
    throw new AccountNotFoundError();
  }

  return user;
}

export async function updateAccountProfile({
  userId,
  firstName,
  lastName,
  email,
}: UpdateAccountProfileInput): Promise<AccountProfile> {
  const currentUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
      },
    });

  if (!currentUser) {
    throw new AccountNotFoundError();
  }

  if (
    email !==
    currentUser.email
  ) {
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (
      existingUser &&
      existingUser.id !==
        userId
    ) {
      throw new EmailAlreadyInUseError();
    }
  }

  return prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      firstName,
      lastName,
      email,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
    },
  });
}

export async function changeAccountPassword({
  userId,
  currentPassword,
  newPassword,
}: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  if (!user) {
    throw new AccountNotFoundError();
  }

  const currentPasswordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!currentPasswordMatches) {
    throw new IncorrectPasswordError();
  }

  const newPasswordMatchesCurrent = await bcrypt.compare(
    newPassword,
    user.passwordHash
  );

  if (newPasswordMatchesCurrent) {
    throw new PasswordReuseError();
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    PASSWORD_HASH_ROUNDS
  );

  /*
   * Optimistic concurrency control:
   *
   * Only update the password if both the stored
   * hash and session version are still unchanged
   * since the initial verification.
   *
   * Incrementing sessionVersion invalidates
   * previously issued JWT sessions.
   */
  const result = await prisma.user.updateMany({
    where: {
      id: user.id,
      passwordHash: user.passwordHash,
      sessionVersion: user.sessionVersion,
    },
    data: {
      passwordHash,
      sessionVersion: {
        increment: 1,
      },
    },
  });

  if (result.count !== 1) {
    throw new PasswordChangeConflictError();
  }
}
