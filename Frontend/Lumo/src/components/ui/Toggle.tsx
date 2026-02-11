import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '48px',
                height: '26px',
                backgroundColor: checked ? 'var(--primary)' : '#E5E7EB',
                borderRadius: '999px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }}
        >
            <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: checked ? '25px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }} />
        </div>
    );
};

export default Toggle;
