import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, options, style, ...props }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            {label && <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</label>}
            <div style={{ position: 'relative' }}>
                <select
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        paddingRight: '2.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-card)',
                        fontSize: '0.95rem',
                        color: 'var(--text-main)',
                        outline: 'none',
                        appearance: 'none',
                        cursor: 'pointer',
                        ...style
                    }}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--primary)'
                }}>
                    <ChevronDown size={20} />
                </div>
            </div>
        </div>
    );
};

export default Select;
