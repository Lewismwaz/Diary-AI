import ChangePasswordForm from "@/components/settings/change-password-form";
import AccountInformation from "@/components/settings/account-information";

type AccountSecurityProps = {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
};

export default function AccountSecurity({
  firstName,
  lastName,
  email,
  createdAt,
}: AccountSecurityProps) {
  const day =
    createdAt.getDate();

  const ordinal =
    getOrdinalSuffix(day);

  const monthAndYear =
    new Intl.DateTimeFormat(
      "en",
      {
        month: "long",
        year: "numeric",
      }
    ).format(createdAt);

  const memberSince =
    `${day}${ordinal} ${monthAndYear}`;

  return (
    <section
      id="account"
      className="space-y-5"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Account & Security
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage your account
          information and protect
          access to your private
          journal.
        </p>
      </div>

      <AccountInformation
        firstName={firstName}
        lastName={lastName}
        email={email}
        memberSince={
          memberSince
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-slate-950 dark:text-white">
            Change password
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Enter your current
            password before choosing
            a new one.
          </p>
        </div>

        <div className="max-w-xl">
          <ChangePasswordForm />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Biometric & local
              unlock
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Device-level secure
              unlock will become
              available with the
              Diary AI mobile and
              desktop applications.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Coming later
          </span>
        </div>
      </div>
    </section>
  );
}


function getOrdinalSuffix(
  day: number
): string {
  if (
    day >= 11 &&
    day <= 13
  ) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";

    case 2:
      return "nd";

    case 3:
      return "rd";

    default:
      return "th";
  }
}