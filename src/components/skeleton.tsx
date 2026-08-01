"use client";

import React from "react";

export function ShimmerBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`}
    />
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative mx-4 my-2 h-[340px] overflow-hidden rounded-3xl bg-[#14151a] p-6">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <ShimmerBox className="h-6 w-32 rounded-full" />
          <ShimmerBox className="h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-3">
          <ShimmerBox className="h-8 w-3/4" />
          <ShimmerBox className="h-5 w-1/2" />
          <ShimmerBox className="h-4 w-5/6" />
          <div className="flex items-center gap-3 pt-2">
            <ShimmerBox className="h-11 w-32 rounded-full" />
            <ShimmerBox className="h-11 w-11 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpeedDialSkeleton() {
  return (
    <div className="px-4 py-3">
      <ShimmerBox className="mb-3 h-5 w-28" />
      <div className="grid grid-cols-2 gap-2.5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 overflow-hidden rounded-xl bg-[#141519] p-2"
          >
            <ShimmerBox className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5 overflow-hidden">
              <ShimmerBox className="h-3.5 w-3/4" />
              <ShimmerBox className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBox className="h-5 w-40" />
        <ShimmerBox className="h-4 w-16" />
      </div>
      <div className="flex gap-3.5 overflow-x-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-[140px] shrink-0 space-y-2">
            <ShimmerBox className="h-[140px] w-[140px] rounded-2xl" />
            <ShimmerBox className="h-3.5 w-full" />
            <ShimmerBox className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyDiscoverSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="space-y-1">
          <ShimmerBox className="h-5 w-36" />
          <ShimmerBox className="h-3 w-24" />
        </div>
        <ShimmerBox className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex gap-3 overflow-x-hidden py-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[130px] shrink-0 space-y-2 text-center">
            <ShimmerBox className="mx-auto h-20 w-20 rounded-full" />
            <ShimmerBox className="mx-auto h-3.5 w-20" />
            <ShimmerBox className="mx-auto h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBox className="h-5 w-32" />
        <ShimmerBox className="h-4 w-16" />
      </div>
      <div className="space-y-2.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-xl bg-[#121317] p-2.5"
          >
            <ShimmerBox className="h-4 w-4 shrink-0" />
            <ShimmerBox className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <ShimmerBox className="h-3.5 w-4/5" />
              <ShimmerBox className="h-3 w-1/2" />
            </div>
            <ShimmerBox className="h-4 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewReleasesSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBox className="h-5 w-36" />
        <ShimmerBox className="h-4 w-16" />
      </div>
      <div className="flex gap-3 overflow-x-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-[150px] shrink-0 space-y-2">
            <ShimmerBox className="h-[150px] w-[150px] rounded-2xl" />
            <ShimmerBox className="h-3.5 w-full" />
            <ShimmerBox className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MusicVideosSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBox className="h-5 w-40" />
        <ShimmerBox className="h-4 w-16" />
      </div>
      <div className="flex gap-3 overflow-x-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-[240px] shrink-0 space-y-2">
            <ShimmerBox className="h-[135px] w-[240px] rounded-2xl" />
            <ShimmerBox className="h-3.5 w-full" />
            <ShimmerBox className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DanceGridSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBox className="h-5 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <ShimmerBox className="aspect-square w-full rounded-2xl" />
            <ShimmerBox className="h-3.5 w-5/6" />
            <ShimmerBox className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BiggestHitsSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBox className="h-5 w-44" />
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <ShimmerBox className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1">
              <ShimmerBox className="h-3.5 w-3/4" />
              <ShimmerBox className="h-3 w-1/2" />
            </div>
            <ShimmerBox className="h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="space-y-3 px-4 py-3">
      <ShimmerBox className="h-10 w-full rounded-2xl" />
      <div className="flex gap-2 py-2">
        {[...Array(4)].map((_, i) => (
          <ShimmerBox key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-2.5 pt-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-[#121317] p-2">
            <ShimmerBox className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <ShimmerBox className="h-3.5 w-3/4" />
              <ShimmerBox className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      <ShimmerBox className="h-7 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <ShimmerBox key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3 pt-4">
        <ShimmerBox className="h-6 w-36" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <ShimmerBox key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FullFeedSkeleton() {
  return (
    <div className="space-y-2 pb-32">
      <HeroSkeleton />
      <SpeedDialSkeleton />
      <CommunitySkeleton />
      <DailyDiscoverSkeleton />
      <ChartsSkeleton />
      <NewReleasesSkeleton />
      <MusicVideosSkeleton />
      <DanceGridSkeleton />
      <BiggestHitsSkeleton />
    </div>
  );
}
