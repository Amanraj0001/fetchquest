import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import { socket } from '../socket';
import defaultAvatar from '../assets/default-user.png';

// Chat Page, shows up only for in Progress quests.
function ChatPage() {
    const { questId } = useParams();
    const { user, token } = useAuth();
    const [error, setError] = useState('');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [questInfo, setQuestInfo] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const join = () => socket.emit('joinRoom', { questId });
        const onError = err => setError(err.msg || err.message || 'Chat connection failed.');
        const details = ({ quest, otherUser }) => {
            setQuestInfo(quest);
            setOtherUser(otherUser);
            setError('');
        };
        socket.auth = { token };
        socket.on('connect', join);
        socket.on('connect_error', onError);
        socket.on('chatError', onError);
        socket.on('questDetails', details);

        // 4. Listen for new messages
        const messageListener = (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        };
        socket.on('receiveMessage', messageListener);

        // 5. Listen for previous messages
        const historyListener = (messageHistory) => {
            setMessages(messageHistory);
        };
        socket.on('messageHistory', historyListener);
        socket.connect();

        // 6. Clean up on unmount
        return () => {
            socket.off('receiveMessage', messageListener);
            socket.off('messageHistory', historyListener);
            socket.off('connect', join);
            socket.off('connect_error', onError);
            socket.off('chatError', onError);
            socket.off('questDetails', details);
            socket.emit('leaveRoom', { questId });
            socket.disconnect();
        };
    }, [questId, token]);

    // Effect to scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const messageData = {
            questId,
            senderId: user._id,
            text: newMessage.trim(),
        };

        // Emit the message to the server
        socket.timeout(5000).emit('sendMessage', messageData, (err, response) => {
            if (err || !response?.ok) setError(response?.msg || 'Message was not confirmed. Check the conversation before retrying.');
            else { setNewMessage(''); setError(''); }
        });
    };

    if (!questInfo || !otherUser) {
        return (
            <main className="chat-container">
                <div className="chat-header">
                    <h2>{error || 'Loading Chat...'}</h2>
                </div>
            </main>
        );
    }

    return (
        <main className="chat-container">
            <div className="chat-header">
                <Link to="/dashboard" className="chat-back-btn">← Back</Link>
                <img
                    src={otherUser.profilePictureUrl || defaultAvatar}
                    alt={otherUser.name}
                    className="user-avatar"
                />
                <div className="chat-header-info">
                    <h2>{otherUser.name}</h2>
                    <p>RE: {questInfo.itemsList}</p>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`chat-message ${msg.senderId === user._id ? 'sent' : 'received'}`}
                    >
                        <p>{msg.text}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {error && <p role="alert" className="form-error">{error}</p>}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                />
                <button type="submit" className="chat-send-btn">Send</button>
            </form>
        </main>
    );
}

export default ChatPage;
