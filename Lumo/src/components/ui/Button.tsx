import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    fullWidth = false,
    style,
    ...props
}) => {
    const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: fullWidth ? '100%' : 'auto',
        cursor: 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        pointerEvents: props.disabled ? 'none' : 'auto',
    };

    const variantStyles = {
        primary: {
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-sm)',
        },
        outline: {
            backgroundColor: 'transparent',
            color: 'var(--text-main)',
            border: '1px solid var(--border-light)',
        },
        ghost: {
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: 'none',
            boxShadow: 'none',
        }
    };

    return (
        <button
            style={{ ...baseStyles, ...variantStyles[variant], ...style }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
