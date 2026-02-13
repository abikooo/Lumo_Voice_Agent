import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client, { type User } from '../api/client';

import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    // Fetch user me
                    // We need to ensure client has the token set in header. 
                    // This is handled by axios interceptor if we set it, 
                    // or we set default header here.
                    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const response = await client.get<User>('/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    logout();
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, [token]);

    const login = async (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        // User fetching will happen in useEffect
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
