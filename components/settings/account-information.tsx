"use client";

import {
  useState,
} from "react";

import EditProfileForm from "@/components/settings/edit-profile-form";

import Button from "@/components/ui/button";

type AccountInformationProps = {
  firstName: string;
  lastName: string;
  email: string;
  memberSince: string;
};

export default function AccountInformation({
  firstName,
  lastName,
  email,
  memberSince,
}: AccountInformationProps) {
  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  if (isEditing) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h3 className="font-semibold text-slate-950 dark:text-white">
            Edit account information
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Update your name and
            email address.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <EditProfileForm
            firstName={
              firstName
            }
            lastName={
              lastName
            }
            email={email}
            onCancel={() =>
              setIsEditing(
                false
              )
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">
            Account information
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your current Diary AI
            account details.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setIsEditing(
              true
            )
          }
          className="shrink-0"
        >
          Edit profile
        </Button>
      </div>

      <dl className="divide-y divide-slate-200 dark:divide-slate-800">
        <AccountRow
          label="Name"
          value={`${firstName} ${lastName}`}
        />

        <AccountRow
          label="Email"
          value={email}
        />

        <AccountRow
          label="Member since"
          value={memberSince}
        />
      </dl>
    </div>
  );
}

function AccountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[150px_1fr] sm:gap-5 sm:px-6">
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </dt>

      <dd className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}