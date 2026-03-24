import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, X, Send } from 'lucide-react';

const TeamChat = () => {
    const { user, userProfile } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const q = query(
            collection(db, 'team_chats'),
            orderBy('createdAt', 'asc'),
            limit(100)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });
        return () => unsubscribe();
    }, [isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || !user) return;

        try {
            await addDoc(collection(db, 'team_chats'), {
                text: trimmed,
                userId: user.uid,
                userName: userProfile?.displayName || user.email?.split('@')[0] || 'Ажилтан',
                userPhoto: userProfile?.photoURL || '',
                createdAt: serverTimestamp()
            });
            setText('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    if (!isOpen) {
        return (
            <button
                className="team-chat-fab"
                onClick={() => setIsOpen(true)}
            >
                <MessageCircle size={24} />
                <span>Багийн чат</span>
            </button>
        );
    }

    return (
        <div className="team-chat-widget">
            <div className="team-chat-header">
                <div className="team-chat-title">
                    <MessageCircle size={18} />
                    <span>Багийн чат (Ажилтнууд дунд)</span>
                </div>
                <button className="team-chat-close" onClick={() => setIsOpen(false)}>
                    <X size={18} />
                </button>
            </div>

            <div className="team-chat-body">
                {messages.length === 0 ? (
                    <div className="team-chat-empty">Ажилтнуудын харилцсан зурвас алга байна.</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.userId === user?.uid;
                        return (
                            <div key={msg.id} className={`team-chat-msg ${isMe ? 'msg-me' : 'msg-other'}`}>
                                {!isMe && (
                                    <div className="msg-avatar">
                                        {msg.userPhoto ? (
                                            <img src={msg.userPhoto} alt={msg.userName} />
                                        ) : (
                                            <div className="msg-avatar-fallback">{msg.userName?.charAt(0) || 'А'}</div>
                                        )}
                                    </div>
                                )}
                                <div className="msg-content-wrapper">
                                    {!isMe && <span className="msg-name">{msg.userName}</span>}
                                    <div className="msg-bubble">
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="team-chat-input-area" onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Зурвас бичих..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" disabled={!text.trim()} className="team-chat-send">
                    <Send size={18} />
                </button>
            </form>

            <style aria-hidden="true">{`
                .team-chat-fab {
                    position: fixed;
                    right: 32px;
                    bottom: 32px;
                    background: #2563EB;
                    color: white;
                    border: none;
                    border-radius: 99px;
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.15);
                    z-index: 9999;
                    transition: transform 0.2s, background 0.2s;
                }
                .team-chat-fab:hover {
                    background: #1D4ED8;
                    transform: translateY(-2px);
                }
                .team-chat-widget {
                    position: fixed;
                    right: 32px;
                    bottom: 32px;
                    width: 320px;
                    height: 450px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideUp {
                    from { transform: translateY(40px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .team-chat-header {
                    background: #2563EB;
                    color: white;
                    padding: 14px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .team-chat-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    font-size: 0.95rem;
                }
                .team-chat-close {
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.8);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 4px;
                }
                .team-chat-close:hover {
                    background: rgba(255,255,255,0.15);
                    color: white;
                }
                .team-chat-body {
                    flex: 1;
                    padding: 16px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    background: #F8FAFC;
                }
                .team-chat-empty {
                    text-align: center;
                    color: #94A3B8;
                    margin: auto;
                    font-size: 0.9rem;
                    max-width: 80%;
                }
                .team-chat-msg {
                    display: flex;
                    gap: 10px;
                    align-items: flex-end;
                }
                .team-chat-msg.msg-me {
                    justify-content: flex-end;
                }
                .msg-avatar {
                    width: 28px;
                    height: 28px;
                    flex-shrink: 0;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #E2E8F0;
                }
                .msg-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .msg-avatar-fallback {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #64748B;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                }
                .msg-content-wrapper {
                    max-width: 75%;
                    display: flex;
                    flex-direction: column;
                }
                .msg-me .msg-content-wrapper {
                    align-items: flex-end;
                }
                .msg-name {
                    font-size: 0.7rem;
                    color: #64748B;
                    margin-bottom: 4px;
                    padding-left: 2px;
                }
                .msg-bubble {
                    padding: 10px 14px;
                    border-radius: 16px;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    word-break: break-word;
                }
                .msg-other .msg-bubble {
                    background: white;
                    color: #1E293B;
                    border-bottom-left-radius: 4px;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .msg-me .msg-bubble {
                    background: #2563EB;
                    color: white;
                    border-bottom-right-radius: 4px;
                    box-shadow: 0 1px 2px rgba(37,99,235,0.2);
                }
                .team-chat-input-area {
                    display: flex;
                    padding: 12px;
                    gap: 8px;
                    background: white;
                    border-top: 1px solid #E2E8F0;
                }
                .team-chat-input-area input {
                    flex: 1;
                    border: 1px solid #E2E8F0;
                    border-radius: 99px;
                    padding: 8px 16px;
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .team-chat-input-area input:focus {
                    border-color: #3B82F6;
                }
                .team-chat-send {
                    background: #2563EB;
                    color: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .team-chat-send:disabled {
                    background: #E2E8F0;
                    color: #94A3B8;
                    cursor: not-allowed;
                }
                .team-chat-send:not(:disabled):hover {
                    background: #1D4ED8;
                }
            `}</style>
        </div>
    );
};

export default TeamChat;
