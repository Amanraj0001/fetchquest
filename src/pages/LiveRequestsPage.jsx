import React, { useState, useEffect, useMemo } from 'react';
import RequestCard from '../Components/RequestCard';
import { useAuth } from '../Context/useAuth';
import { useNavigate } from 'react-router-dom';

const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
};

function LiveRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('newest');

    const { token, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOpenRequests = async () => {
            try {
                const response = await fetch('/api/requests');
                if (!response.ok) {
                    throw new Error('Failed to fetch data from the server');
                }
                const data = await response.json();
                setRequests(data.requests);
            } catch (fetchError) {
                setError(fetchError.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOpenRequests();
    }, []);

    const sortedRequests = useMemo(() => {
        const sorted = [...requests];
        switch (sortBy) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'highest':
                sorted.sort((a, b) => (b.estimatedCost + b.tip) - (a.estimatedCost + a.tip));
                break;
            case 'lowest':
                sorted.sort((a, b) => (a.estimatedCost + a.tip) - (b.estimatedCost + b.tip));
                break;
            default:
                break;
        }
        return sorted;
    }, [requests, sortBy]);

    const handleAcceptQuest = async (questId) => {
        if (!isAuthenticated || !token) {
            setError("You must be logged in to accept a quest.");
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`/api/requests/${questId}/accept`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.msg || 'Failed to accept quest.');
            }

            setRequests(prevRequests =>
                prevRequests.filter(request => request._id !== questId)
            );

        } catch (err) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return <main className='container'><p className='page-title'>Loading Quests...</p></main>;
    }

    if (error && isLoading) {
        return <main className='container'><p className='page-title'>Error: {error}</p></main>;
    }

    return (
        <main className='container'>
            <div className="page-header-row">
                <h1 className='page-title'>Live Requests</h1>

                <div className="sort-controls">
                    <label htmlFor="sortBy">Sort by:</label>
                    <select
                        id="sortBy"
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {error && !isLoading && <p className='form-error' style={{ marginBottom: '1rem' }}>{error}</p>}

            <div className='requests-grid'>
                {sortedRequests.length > 0 ? (
                    sortedRequests.map(request => (
                        <RequestCard
                            key={request._id}
                            request={request}
                            context="live"
                            onAccept={handleAcceptQuest}
                            timeAgo={getTimeAgo(request.createdAt)}
                        />
                    ))
                ) : (
                    <p>No open requests found.</p>
                )}
            </div>
        </main>
    )
}

export default LiveRequestsPage;
