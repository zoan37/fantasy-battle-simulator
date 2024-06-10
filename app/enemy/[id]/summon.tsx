'use client'

import React from 'react';

interface SummonButtonProps {
  enemyHash: string;
}

const SummonButton: React.FC<SummonButtonProps> = ({ enemyHash }) => {
  const handleSummonClick = () => {
    window.location.href = `/?enemy=${enemyHash}`;
  };

  return (
    <button
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-1 mb-4"
      onClick={handleSummonClick}
    >
      Summon in Simulator
    </button>
  );
};

export default SummonButton;