import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { getEnemy } from "../../llm";
import Image from 'next/image';
import type { Metadata, ResolvingMetadata } from 'next';
import SummonButton from './summon';

interface Enemy {
  hash: string;
  name: string;
  description: string;
  imageUrl: string;
}

type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

async function fetchEnemy(id: string) {
  const data = await getEnemy(id);

  if (!data.enemy) {
    return null;
  }

  const enemy = {
    hash: id,
    name: data.enemy!.name,
    description: data.enemy!.description,
    imageUrl: data.enemy!.imageUrl,
  }

  return enemy;
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const id = params.id
 
  // fetch data
  const enemy = await fetchEnemy(id);

  if (!enemy) {
    return {
      title: 'Enemy Not Found - Fantasy Battle Simulator'
    }
  }
 
  return {
    title: `${enemy.name} - Fantasy Battle Simulator`,
    openGraph: {
      images: [enemy.imageUrl],
    },
  }
}

export default async function Page({ params }: { params: { id: string } }) {
  const enemy = await fetchEnemy(params.id);

  if (!enemy) {
    return (
      <>
        <div className="flex flex-col items-center">
          <div className="mt-4">
            Enemy Not Found
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center p-5">
        <div className="flex flex-col items-center">
          <Image
            src={enemy.imageUrl}
            alt="Dynamic Image"
            width={420}
            height={420}
            priority
          />

          <div className="text-lg font-bold mt-4">
            {enemy.name}
          </div>

          <div className="text-md mt-2">
            {enemy.description}
          </div>

          <div className="mt-4">
            <SummonButton enemyHash={enemy.hash} />
          </div>

          <div className="footer-padding">
          </div>
        </div>
      </main>
      <Analytics />
    </>
  );
}