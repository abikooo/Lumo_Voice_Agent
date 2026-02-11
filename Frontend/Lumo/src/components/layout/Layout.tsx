import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', marginLeft: 'var(--sidebar-width)' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
