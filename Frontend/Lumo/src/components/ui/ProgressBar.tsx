import React from 'react';

interface ProgressBarProps {
    progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    return (
        <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
            overflow: 'hidden'
        }}>
            <div style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                backgroundColor: 'var(--primary)',
                borderRadius: '4px',
                transition: 'width 0.5s ease-in-out'
            }} />
        </div>
    );
};

export default ProgressBar;
