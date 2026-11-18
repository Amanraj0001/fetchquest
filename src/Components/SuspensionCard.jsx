
import React, { useState } from 'react';

function SuspensionCard({
    suspensionData,
    email,
    password,
    onClose
}) {
    const [appealMessage, setAppealMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleAppealSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const response = await fetch('/api/auth/submit-appeal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: suspensionData.userId,
                    email,
                    password,
                    appealMessage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Failed to submit appeal');
            }

            setSubmitSuccess(true);
        } catch (error) {
            setSubmitError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="suspension-card">
            <div className="suspension-header">
                <span className="suspension-icon">⚠️</span>
                <h2>Account Suspended</h2>
            </div>
            <div className="suspension-reason">
                <p className="reason-label">Reason for suspension:</p>
                <p className="reason-text">{suspensionData.suspensionReason}</p>
            </div>


            {suspensionData.hasAppealed ? (
                <div className="appeal-status">
                    <div className="appeal-submitted">
                        <span className="check-icon">✓</span>
                        <p>You have already submitted an appeal.</p>
                    </div>
                    <p className="appeal-date">
                        Submitted on: {formatDate(suspensionData.appealDate)}
                    </p>
                    <p className="appeal-waiting">
                        An administrator will review your appeal soon. Please check back later.
                    </p>
                </div>
            ) : submitSuccess ? (
                <div className="appeal-success">
                    <span className="check-icon">✓</span>
                    <h3>Appeal Submitted!</h3>
                    <p>Your appeal has been sent to our administrators for review.</p>
                    <p>Please check back later.</p>
                </div>
            ) : (
                <form onSubmit={handleAppealSubmit} className="appeal-form">
                    <h3>Submit an Appeal</h3>
                    <p className="appeal-instructions">
                        If you believe your account was suspended in error, please explain below:
                    </p>
                    <textarea
                        className="appeal-textarea"
                        placeholder="Explain why you believe your suspension should be lifted... (minimum 10 characters)"
                        value={appealMessage}
                        onChange={(e) => setAppealMessage(e.target.value)}
                        maxLength={500}
                        required
                    />
                    <p className="character-count">
                        {appealMessage.length}/500 characters
                    </p>
                    {submitError && <p className="form-error">{submitError}</p>}
                    <button
                        type="submit"
                        className="form-button"
                        disabled={isSubmitting || appealMessage.trim().length < 10}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
                    </button>
                </form>
            )}

            <button
                type="button"
                className="form-link back-to-login"
                onClick={onClose}
            >
                ← Back to Login
            </button>
        </div>
    );
}

export default SuspensionCard;
