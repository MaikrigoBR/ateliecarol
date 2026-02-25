import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Menu } from 'lucide-react';

export const Layout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Close sidebar on route change (mobile UX)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

    return (
        <div className="layout-container">
            {/* Sidebar Overlay (Mobile) */}
            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
                onClick={() => setSidebarOpen(false)}
                style={{ display: isSidebarOpen ? 'block' : 'none' }} // Force display logic
            />

            {/* Sidebar Wrapper */}
            <div className={`sidebar-wrapper ${isSidebarOpen ? 'mobile-open' : ''}`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main Content Area */}
            <main className="main-content">
                 <Header onOpenSidebar={() => setSidebarOpen(true)} />
                 <div className="page-content">
                    <Outlet />
                 </div>
            </main>
        </div>
    );
};
