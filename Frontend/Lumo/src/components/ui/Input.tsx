import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: LucideIcon;
}

const Input: React.FC<InputProps> = ({ icon: Icon, style, ...props }) => {
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {Icon && (
                <div style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Icon size={18} />
                </div>
            )}
            <input
                style={{
                    width: '100%',
                    padding: Icon ? '0.75rem 1rem 0.75rem 2.75rem' : '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    ...style
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                {...props}
            />
        </div>
    );
};

export default Input;
