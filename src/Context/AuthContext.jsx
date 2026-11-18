
import React, { useState, useEffect } from 'react';
import { AuthContext } from './useAuth';

//Global Manager for authorization, Stores User data, login status, Provide functions and persiting the Session. 

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true); 

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newQuestTrigger, setNewQuestTrigger] = useState(0)

    useEffect(() => {
        const fetchUserOnLoad = async () => {
            if (token) {
                try {
                    localStorage.setItem('token', token);

                    const response = await fetch('/api/users/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);
                    } else {
                        logout();
                    }
                } catch (error) {
                    console.error("Failed to fetch user on load", error);
                    logout();
                }
            }
            setLoading(false);
        };

        fetchUserOnLoad();
    }, [token]);

    const login = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('token', userToken);
    };

    const logout = () => {
        const activeToken = localStorage.getItem('token');
        if (activeToken) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { Authorization: `Bearer ${activeToken}` },
            }).catch(() => {});
        }
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
    };

    const openCreateModal = () => setIsCreateModalOpen(true);
    const closeCreateModal = () => setIsCreateModalOpen(false);

    const triggerNewQuest = () => {
        setNewQuestTrigger(prev => prev + 1);
        closeCreateModal();
    }


    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading: loading,
        setUser,

        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,

        newQuestTrigger,
        triggerNewQuest,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

