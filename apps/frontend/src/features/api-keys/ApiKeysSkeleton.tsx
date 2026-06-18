import React from "react";

const TABLE_COLS = [
  "Key Name",
  "Token",
  "Permissions",
  "Created",
  "Last Used",
  "Action",
] as const;

export function ApiKeysSkeleton() {
  const skeletonItems = [1, 2, 3]; // Відображаємо 3 скелетні рядки/картки

  return (
    <>
      {/* Десктопний скелет таблиці */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block animate-pulse">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {TABLE_COLS.map((col, i) => (
                <th
                  key={col}
                  className={`px-5 py-3.5 text-xs font-semibold tracking-wide text-text-muted uppercase ${
                    i === TABLE_COLS.length - 1 ? "text-right" : "text-left"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skeletonItems.map((item) => (
              <tr key={item} className="border-b border-border last:border-0">
                <td className="px-5 py-4">
                  <div className="h-5 w-32 rounded-md bg-white/10" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-7 w-40 rounded-md bg-white/10" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-6 w-20 rounded-full bg-white/10" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-24 rounded-md bg-white/5" />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-24 rounded-md bg-white/5" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <div className="h-8 w-24 rounded-md bg-white/10" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Мобільний скелет карток */}
      <div className="flex flex-col gap-3 lg:hidden animate-pulse">
        {skeletonItems.map((item) => (
          <div
            key={item}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-32 rounded-md bg-white/10" />
              <div className="h-5 w-16 rounded-full bg-white/10" />
            </div>

            {/* Токен */}
            <div className="flex items-center gap-2">
              <div className="h-9 flex-1 rounded-md bg-white/10" />
              <div className="h-9 w-9 shrink-0 rounded-md bg-white/10" />
            </div>

            {/* Метадані */}
            <div className="grid grid-cols-2 gap-1 mt-1">
              <div>
                <div className="h-3 w-12 mb-1.5 rounded-sm bg-white/5" />
                <div className="h-4 w-24 rounded-sm bg-white/10" />
              </div>
              <div>
                <div className="h-3 w-16 mb-1.5 rounded-sm bg-white/5" />
                <div className="h-4 w-24 rounded-sm bg-white/10" />
              </div>
            </div>

            {/* Кнопка видалення */}
            <div className="flex justify-end mt-1">
              <div className="h-8 w-24 rounded-md bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
