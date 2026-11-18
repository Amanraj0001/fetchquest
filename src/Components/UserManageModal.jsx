import React, { useState } from 'react';
import defaultAvatar from '../assets/default-user.png';

function UserManageModal({ user, token, onClose, onUserUpdated }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [showSuspendInput, setShowSuspendInput] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Helper to make API calls
    const makeApiCall = async (url, method, body = null) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const options = {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Operation failed');
            }

            setSuccessMessage(data.msg);
            if (onUserUpdated) {
                onUserUpdated(data.user);
            }
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspendToggle = async () => {
        if (!user.isSuspended && !showSuspendInput) {
            setShowSuspendInput(true);
            return;
        }

        const body = user.isSuspended ? {} : { reason: suspendReason || 'Violation of platform policies.' };
        await makeApiCall(`/api/users/admin/user/${user._id}/suspend`, 'PATCH', body);
        setShowSuspendInput(false);
        setSuspendReason('');
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }

        const result = await makeApiCall(`/api/users/admin/user/${user._id}/delete`, 'DELETE');
        if (result) {
            
            setTimeout(() => onClose(), 1500);
        }
    };


    const handleToggleAdmin = async () => {
        await makeApiCall(`/api/users/admin/user/${user._id}/toggle-admin`, 'PATCH');
    };


    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content user-manage-modal" onClick={(e) => e.stopPropagation()}>

                <div className="modal-header">
                    <div className="user-modal-header">
                        <img
                            src={user.profilePictureUrl || defaultAvatar}
                            alt={user.name}
                            className="user-avatar-lg"
                        />
                        <div className="user-header-info">
                            <h2>{user.name}</h2>
                            <p className="user-email">{user.email}</p>
                            <div className="user-badges">
                                {user.isAdmin && <span className="badge badge-admin">Admin</span>}
                                {user.isSuspended && <span className="badge badge-suspended">Suspended</span>}
                                {user.isVerified ? (
                                    <span className="badge badge-verified">Verified</span>
                                ) : (
                                    <span className="badge badge-unverified">Unverified</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>

  
                <div className="user-stats-grid">
                    <div className="stat-box">
                        <span className="stat-value">{user.requestsMade}</span>
                        <span className="stat-label">Quests Made</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{user.runsCompleted}</span>
                        <span className="stat-label">Runs Completed</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{user.averageRating?.toFixed(1) || '0.0'} ★</span>
                        <span className="stat-label">Rating ({user.numberOfRatings || 0})</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{formatDate(user.createdAt)}</span>
                        <span className="stat-label">Joined</span>
                    </div>
                </div>


                {user.isSuspended && user.hasAppealed && (
                    <div className="appeal-info-box">
                        <h4>📝 Pending Appeal</h4>
                        <p className="appeal-reason-label">Suspension Reason:</p>
                        <p className="appeal-reason-text">{user.suspensionReason || 'Not specified'}</p>
                        <p className="appeal-reason-label">User's Appeal:</p>
                        <p className="appeal-message">{user.appealMessage}</p>
                        <p className="appeal-date-text">Submitted: {formatDate(user.appealDate)}</p>
                    </div>
                )}


                {error && <p className="form-error">{error}</p>}
                {successMessage && <p className="form-success">{successMessage}</p>}


                {showSuspendInput && (
                    <div className="suspend-reason-input">
                        <label>Reason for suspension:</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Violation of platform policies"
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                        />
                    </div>
                )}

    
                {showDeleteConfirm && (
                    <div className="delete-confirm-box">
                        <p>⚠️ This will permanently delete this user and all their data. This cannot be undone!</p>
                    </div>
                )}


                <div className="modal-actions">
                    <button
                        className={`btn ${user.isSuspended ? 'btn-success' : 'btn-warning'}`}
                        onClick={handleSuspendToggle}
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : user.isSuspended ? 'Unsuspend User' : (showSuspendInput ? 'Confirm Suspend' : 'Suspend User')}
                    </button>

                    <button
                        className={`btn ${user.isAdmin ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={handleToggleAdmin}
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                    </button>

                    <button
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : showDeleteConfirm ? 'Confirm Delete' : 'Delete User'}
                    </button>
                </div>


                {(showSuspendInput || showDeleteConfirm) && (
                    <button
                        className="btn btn-secondary cancel-btn"
                        onClick={() => {
                            setShowSuspendInput(false);
                            setShowDeleteConfirm(false);
                            setSuspendReason('');
                        }}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

export default UserManageModal;
