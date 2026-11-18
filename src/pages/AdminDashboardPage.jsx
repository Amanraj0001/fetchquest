

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/useAuth';
import defaultAvatar from '../assets/default-user.png';
import UserManageModal from '../Components/UserManageModal';

function AdminDashboardPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    const fetchAllUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/users/admin/all-users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.msg || "Failed to fetch users. Are you an admin?");
            }

            const data = await response.json();
            setUsers(data.users);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const fetchAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const response = await fetch('/api/users/admin/analytics', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAllUsers();
        fetchAnalytics();
    }, [fetchAllUsers, fetchAnalytics]);

    const handleManageClick = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleUserUpdated = (updatedUser) => {
        if (updatedUser) {
            setUsers(prevUsers =>
                prevUsers.map(u => u._id === updatedUser._id ? updatedUser : u)
            );
            setSelectedUser(updatedUser);
        } else {
            setUsers(prevUsers => prevUsers.filter(u => u._id !== selectedUser._id));
            handleCloseModal();
        }
        fetchAnalytics();
    };

    const formatCurrency = (amount) => {
        return `₹${amount?.toLocaleString() || 0}`;
    };

    return (
        <main className="container admin-dashboard">
            <h1 className="page-title">Admin Panel</h1>

            <section className="analytics-section">
                <h2 className="section-subtitle">📊 Platform Overview</h2>

                {analyticsLoading ? (
                    <p>Loading analytics...</p>
                ) : analytics ? (
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <span className="analytics-icon">👥</span>
                                <h3>Users</h3>
                            </div>
                            <div className="analytics-card-body">
                                <div className="analytics-stat-row">
                                    <span>Total Users</span>
                                    <strong>{analytics.users.total}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Verified</span>
                                    <strong>{analytics.users.verified}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Suspended</span>
                                    <strong className="text-danger">{analytics.users.suspended}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Pending Appeals</span>
                                    <strong className="text-warning">{analytics.users.pendingAppeals}</strong>
                                </div>
                                <div className="analytics-stat-row highlight">
                                    <span>New (7 days)</span>
                                    <strong className="text-success">+{analytics.users.newLast7Days}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <span className="analytics-icon">📦</span>
                                <h3>Quests</h3>
                            </div>
                            <div className="analytics-card-body">
                                <div className="analytics-stat-row">
                                    <span>Total Quests</span>
                                    <strong>{analytics.requests.total}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Open</span>
                                    <strong className="text-primary">{analytics.requests.open}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>In Progress</span>
                                    <strong className="text-warning">{analytics.requests.accepted}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Completed</span>
                                    <strong className="text-success">{analytics.requests.completed + analytics.requests.rated}</strong>
                                </div>
                                <div className="analytics-stat-row highlight">
                                    <span>New (7 days)</span>
                                    <strong className="text-success">+{analytics.requests.newLast7Days}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <span className="analytics-icon">💰</span>
                                <h3>Financial</h3>
                            </div>
                            <div className="analytics-card-body">
                                <div className="analytics-stat-row">
                                    <span>Total Volume</span>
                                    <strong>{formatCurrency(analytics.financial.totalTransactionVolume)}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Items Cost</span>
                                    <strong>{formatCurrency(analytics.financial.totalItemsCost)}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Tips Earned</span>
                                    <strong className="text-success">{formatCurrency(analytics.financial.totalTipsEarned)}</strong>
                                </div>
                                <div className="analytics-stat-row">
                                    <span>Transactions</span>
                                    <strong>{analytics.financial.completedTransactions}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="user-management-section">
                <h2 className="section-subtitle">👤 User Management</h2>

                {isLoading ? (
                    <p>Loading users...</p>
                ) : error ? (
                    <p className="form-error">{error}</p>
                ) : (
                    <div className="admin-user-table-container">
                        <table className="admin-user-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Quests</th>
                                    <th>Runs</th>
                                    <th>Rating</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id} className={user.isSuspended ? 'suspended-row' : ''}>
                                        <td>
                                            <div className="user-info-cell">
                                                <img
                                                    src={user.profilePictureUrl || defaultAvatar}
                                                    alt={user.name}
                                                    className="user-avatar-sm"
                                                />
                                                <span>
                                                    {user.name}
                                                    {user.isAdmin && <span className="admin-tag"> (Admin)</span>}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            {user.isSuspended ? (
                                                <span className="status-badge suspended">Suspended</span>
                                            ) : user.isVerified ? (
                                                <span className="status-badge completed">Active</span>
                                            ) : (
                                                <span className="status-badge in-progress">Unverified</span>
                                            )}
                                        </td>
                                        <td>{user.requestsMade}</td>
                                        <td>{user.runsCompleted}</td>
                                        <td>{user.averageRating?.toFixed(1) || '0.0'} ★</td>
                                        <td>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleManageClick(user)}
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {isModalOpen && selectedUser && (
                <UserManageModal
                    user={selectedUser}
                    token={token}
                    onClose={handleCloseModal}
                    onUserUpdated={handleUserUpdated}
                />
            )}
        </main>
    );
}

export default AdminDashboardPage;
