"use client";

interface ResultCountProps {
  total: number;
  filtered: boolean;
}

export default function ResultCount({ total, filtered }: ResultCountProps) {
  if (!filtered) {
    return (
      <p className="text-sm text-gray-500">
        全 <span className="font-medium text-gray-700">{total}</span> 作品
      </p>
    );
  }

  if (total === 0) {
    return (
      <p className="text-sm text-orange-600">
        条件に一致する作品がありません
      </p>
    );
  }

  return (
    <p className="text-sm text-gray-500">
      <span className="font-medium text-gray-700">{total}</span> 件の作品が一致
    </p>
  );
}
