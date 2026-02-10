import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: string;
}

const Card: React.FC<CardProps> = ({ children, padding = '1.5rem', style, ...props }) => {
    return (
        <div
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding,
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-light)',
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
