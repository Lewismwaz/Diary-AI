type TrendFrequencyItem = {
  label: string;
  count: number;
};

type TrendFrequencyChartProps = {
  title: string;
  description: string;
  items: TrendFrequencyItem[];
  emptyMessage: string;
  maxItems?: number;
};

function formatLabel(
  value: string
) {
  return value
    .split(" ")
    .map((word) => {
      if (
        word.toLowerCase() ===
        "ai"
      ) {
        return "AI";
      }

      return (
        word.charAt(0)
          .toUpperCase() +
        word.slice(1)
      );
    })
    .join(" ");
}

export default function TrendFrequencyChart({
  title,
  description,
  items,
  emptyMessage,
  maxItems = 8,
}: TrendFrequencyChartProps) {
  const visibleItems =
    items.slice(
      0,
      maxItems
    );

  const maximumCount =
    Math.max(
      ...visibleItems.map(
        (item) =>
          item.count
      ),
      1
    );

  return (
    <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      {visibleItems.length ===
      0 ? (
        <p className="mt-5 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {visibleItems.map(
            (item) => {
              const percentage =
                Math.max(
                  (
                    item.count /
                    maximumCount
                  ) *
                    100,
                  4
                );

              return (
                <div
                  key={
                    item.label
                  }
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatLabel(
                        item.label
                      )}
                    </span>

                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {
                        item.count
                      }
                    </span>
                  </div>

                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="progressbar"
                    aria-label={`${formatLabel(
                      item.label
                    )}: ${
                      item.count
                    }`}
                    aria-valuenow={
                      item.count
                    }
                    aria-valuemin={
                      0
                    }
                    aria-valuemax={
                      maximumCount
                    }
                  >
                    <div
                      className="h-full rounded-full bg-slate-900 transition-[width] duration-500 dark:bg-slate-200"
                      style={{
                        width:
                          `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}