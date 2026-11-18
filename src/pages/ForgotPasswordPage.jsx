import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Something went wrong.');
            }

            setSuccess(true);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <main className="form-page-container">
                <div className="form-card">
                    <div className="success-icon">✉️</div>
                    <h1 className="form-title">Check Your Email</h1>
                    <p className="form-description">
                        If an account exists with that email address, we've sent password reset instructions.
                    </p>
                    <p className="form-description" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        The link will expire in 10 minutes.
                    </p>
                    <Link to="/login" className="form-button" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', textDecoration: 'none' }}>
                        Back to Login
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="form-page-container">
            <div className="form-card">
                <h1 className="form-title">Forgot Password?</h1>
                <p className="form-description">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="you@college.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <button type="submit" className="form-button" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <Link to="/login" className="form-link">
                    ← Back to Login
                </Link>
            </div>
        </main>
    );
}

export default ForgotPasswordPage;
