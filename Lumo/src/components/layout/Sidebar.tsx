import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sparkles, FileText, GraduationCap, History, User, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Sparkles, label: 'Smart Notes', path: '/smart-notes' },
        { icon: FileText, label: 'My Notes', path: '/my-notes' },
        { icon: GraduationCap, label: 'Study', path: '/study' },
        { icon: History, label: 'History', path: '/history' },
        { icon: User, label: 'Profile', path: '/profile' },
    ];

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0
        }}>
            <div className="logo" style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sun color="var(--primary)" size={28} />
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>LUMO AI</span>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            transition: 'all 0.2s',
                            fontWeight: isActive ? 600 : 500
                        })}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        width: '100%',
                        backgroundColor: 'var(--bg-body)',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        justifyContent: 'center'
                    }}
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    Toggle Theme
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
