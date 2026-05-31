import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="h-[100svh] w-screen flex flex-col bg-transparent px-6 animate-entrance overflow-hidden">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 relative">
        <div className="bg-aura" />
        
        {/* Header Skeleton */}
        <header className="flex items-center justify-between mb-12 mt-12">
          <div className="flex flex-col gap-3">
            <div className="w-40 h-8 rounded-2xl skeleton" />
            <div className="w-24 h-4 rounded-xl skeleton opacity-60" />
          </div>
          <div className="w-14 h-14 rounded-3xl skeleton shadow-sm" />
        </header>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col gap-8">
          {/* Large Card Skeleton */}
          <div className="h-56 rounded-[3rem] skeleton shadow-sm" />
          
          {/* Grid Skeletons */}
          <div className="grid grid-cols-2 gap-5">
            <div className="h-36 rounded-[2.5rem] skeleton shadow-sm" />
            <div className="h-36 rounded-[2.5rem] skeleton shadow-sm" />
          </div>

          {/* List Skeleton */}
          <div className="space-y-5">
            <div className="h-20 rounded-[2rem] skeleton opacity-80" />
            <div className="h-20 rounded-[2rem] skeleton opacity-60" />
          </div>
        </div>

        {/* Bottom Nav Skeleton */}
        <div className="fixed bottom-6 left-6 right-6 h-16 bg-white rounded-[2rem] border-2 border-gray-100 flex items-center justify-around px-2 max-w-md mx-auto shadow-lg">
          <div className="w-10 h-10 rounded-2xl skeleton opacity-20" />
          <div className="w-10 h-10 rounded-2xl skeleton opacity-20" />
          <div className="w-10 h-10 rounded-2xl skeleton opacity-20" />
        </div>
      </div>
    </div>
  );
}
