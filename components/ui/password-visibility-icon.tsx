type PasswordVisibilityIconProps = {
  visible: boolean;
};

export function PasswordVisibilityIcon({
  visible,
}: PasswordVisibilityIconProps) {
  if (visible) {
    return <EyeOffIcon />;
  }

  return <EyeIcon />;
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.605 7.986 7.174 5.5 12 5.5s8.395 2.486 9.938 6.152a1 1 0 0 1 0 .696C20.395 16.014 16.826 18.5 12 18.5s-8.395-2.486-9.938-6.152Z" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="m3 3 18 18" />

      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />

      <path d="M9.88 4.24A9.7 9.7 0 0 1 12 4c5 0 8.5 3 10 8a12.7 12.7 0 0 1-2.17 3.65" />

      <path d="M6.61 6.61A12.7 12.7 0 0 0 2 12c1.5 5 5 8 10 8a9.7 9.7 0 0 0 5.39-1.61" />
    </svg>
  );
}