"use client"

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';

export default function Page({ params }: { params: { id: string } }) {
  useEffect(() => {
    redirect(`/?enemy=${params.id}`);
  }, [params.id]);

  return (
    <>
      <Analytics />
      <div className="p-4">
        Redirecting...
      </div>
    </>
  );
}