import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton Loader — 명세서 규격
 * - 배경: --color-primary-light
 * - 하이라이트: rgba(255,255,255,0.06) 좌→우 shimmer
 * - Radius: 부모 컴포넌트 radius 상속
 * - 애니메이션: 1.5s infinite linear
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/** 텍스트 플레이스홀더 스켈레톤 — 높이: 폰트 사이즈 동일, 폭: 랜덤 60-80% */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${60 + Math.random() * 20}%` }}
        />
      ))}
    </div>
  );
}

/** 카드형 스켈레톤 — 이미지 + 텍스트 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-base border border-border bg-card p-0 overflow-hidden", className)}>
      {/* 이미지 플레이스홀더 */}
      <Skeleton className="h-40 w-full rounded-none" />
      {/* 콘텐츠 플레이스홀더 */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

/** 테이블 행 스켈레톤 — 5행 기본 (명세서 규격) */
function SkeletonTableRows({
  rows = 5,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className={cn("border-b border-border/30", className)}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <Skeleton
                className="h-4"
                style={{ width: `${50 + Math.random() * 30}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRows };
