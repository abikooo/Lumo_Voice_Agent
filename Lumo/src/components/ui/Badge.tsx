import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'neutral';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
    const getColors = () => {
        switch (variant) {
            case 'success': return { bg: '#ECFDF5', text: '#10B981' };
            case 'warning': return { bg: '#FFFBEB', text: '#F59E0B' };
            default: return { bg: '#F3F4F6', text: '#6B7280' };
        }
    };

    const colors = getColors();

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: colors.bg,
            color: colors.text
        }}>
            {children}
        </span>
    );
};

export default Badge;
