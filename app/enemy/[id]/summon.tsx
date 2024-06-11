'use client'

import React from 'react';
import { Button } from "@nextui-org/react";

interface SummonButtonProps {
    enemyHash: string;
}

const SummonButton: React.FC<SummonButtonProps> = ({ enemyHash }) => {
    const handleSummonClick = () => {
        window.location.href = `/?enemy=${enemyHash}`;
    };

    return (
        <>
            <Button
                onClick={handleSummonClick}
                color="success"
                style={{ fontSize: '1rem' }}
            >
                Summon in Simulator
            </Button>
        </>
    );
};

export default SummonButton;