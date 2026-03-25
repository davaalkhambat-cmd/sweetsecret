import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, onSnapshot, addDoc, doc, setDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, Minus, Send, Image as ImageIcon, Settings2, LoaderCircle, Edit3 } from 'lucide-react';

const TEAM_CHAT_NICKNAME_KEY = 'sweet_secret_team_chat_nickname';

const formatMessageTime = (createdAt) => {
    try {
        if (!createdAt) return '';
        const date =
            typeof createdAt?.toDate === 'function'
                ? createdAt.toDate()
                : new Date(createdAt);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('mn-MN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
};

const getAvatarFallback = (name = '') => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
};

const TeamChat = () => {
    const { user, userProfile } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Nickname State
    const [nickname, setNickname] = useState('');
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [draftNickname, setDraftNickname] = useState('');

    // Typing state
    const [typingUsers, setTypingUsers] = useState({});

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Initialize nickname
    useEffect(() => {
        const stored = window.localStorage.getItem(TEAM_CHAT_NICKNAME_KEY);
        if (stored) {
            setNickname(stored);
        } else {
            const defaultName = userProfile?.displayName || user?.email?.split('@')[0] || 'Ажилтан';
            setNickname(defaultName);
        }
    }, [userProfile, user]);

    // Handle incoming messages
    useEffect(() => {
        if (!isOpen) return;
        const q = query(
            collection(db, 'team_chats'),
            orderBy('createdAt', 'asc'),
            limit(150)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Filter out 'typing_indicator' doc from the general messages list
            const msgs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => doc.id !== 'typing_indicator');
            setMessages(msgs);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        // Typing indicator listener
        const typingUnsub = onSnapshot(doc(db, 'team_chats', 'typing_indicator'), (docSnap) => {
            if (docSnap.exists()) {
                setTypingUsers(docSnap.data() || {});
            }
        });

        return () => {
            unsubscribe();
            typingUnsub();
        };
    }, [isOpen]);

    const handleSaveSettings = (e) => {
        e.preventDefault();
        const trimmed = draftNickname.trim() || userProfile?.displayName || 'Ажилтан';
        setNickname(trimmed);
        window.localStorage.setItem(TEAM_CHAT_NICKNAME_KEY, trimmed);
        setIsEditingSettings(false);
    };

    const handleTyping = (val) => {
        setText(val);
        if (!user) return;

        // Throttle Firestore writes
        if (!typingTimeoutRef.current) {
            setDoc(doc(db, 'team_chats', 'typing_indicator'), {
                [user.uid]: {
                    name: nickname,
                    time: Date.now(),
                    isTyping: val.length > 0
                }
            }, { merge: true }).catch(() => { }); // ignore minor errors

            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 1500);
        }
    };

    const sendFirestoreMessage = async (msgData) => {
        try {
            await addDoc(collection(db, 'team_chats'), {
                ...msgData,
                userId: user.uid,
                userName: nickname,
                userPhoto: userProfile?.photoURL || '',
                createdAt: serverTimestamp()
            });
            // Stop typing status
            setDoc(doc(db, 'team_chats', 'typing_indicator'), {
                [user.uid]: { name: nickname, time: Date.now(), isTyping: false }
            }, { merge: true }).catch(() => { });
        } catch (error) {
            console.error('Error sending message:', error);
            alert("Илгээхэд алдаа гарлаа.");
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || !user) return;
        setText('');
        await sendFirestoreMessage({ text: trimmed });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        const fileName = `team_chats/${user.uid}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);

        try {
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on(
                'state_changed',
                () => { },
                (error) => {
                    console.error('Image upload failed', error);
                    setIsUploading(false);
                    alert("Зураг хуулах үед алдаа гарлаа.");
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await sendFirestoreMessage({ imageUrl: downloadURL, text: '' });
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            );
        } catch (err) {
            console.error(err);
            setIsUploading(false);
        }
    };

    // Calculate active typing users (who typed in last 6 seconds)
    const activeTypers = useMemo(() => {
        const now = Date.now();
        return Object.entries(typingUsers)
            .filter(([uid, data]) => data.isTyping && uid !== user?.uid && (now - data.time) < 6000)
            .map(([uid, data]) => data.name);
    }, [typingUsers, user]);

    const content = (
        <>
            {!isOpen ? (
                <button
                    className="team-chat-fab-messenger"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="messenger-icon-bg">
                        <MessageCircle size={28} fill="white" color="#0A7CFF" />
                    </div>
                </button>
            ) : (
                <div className="team-chat-widget">
                    <div className="team-chat-header">
                        <div className="team-chat-title">
                            <MessageCircle size={20} />
                            <span>Дотоод чат</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="team-chat-icon-btn" onClick={() => {
                                setDraftNickname(nickname);
                                setIsEditingSettings(!isEditingSettings);
                            }}>
                                <Edit3 size={16} />
                            </button>
                            <button className="team-chat-icon-btn" onClick={() => setIsOpen(false)}>
                                <Minus size={22} />
                            </button>
                        </div>
                    </div>

                    {isEditingSettings && (
                        <form className="team-chat-settings" onSubmit={handleSaveSettings}>
                            <label>Никнэйм:</label>
                            <input
                                autoFocus
                                value={draftNickname}
                                onChange={e => setDraftNickname(e.target.value)}
                                placeholder="Өөрийн нэр..."
                            />
                            <button type="submit">Хадгалах</button>
                        </form>
                    )}

                    <div className="team-chat-body">
                        {messages.length === 0 ? (
                            <div className="team-chat-empty">Харилцсан зурвас олдсонгүй.</div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.userId === user?.uid;
                                const messageTime = formatMessageTime(msg.createdAt);
                                const displayName = isMe ? 'Та' : (msg.userName || 'Ажилтан');
                                return (
                                    <div key={msg.id} className={`team-chat-msg ${isMe ? 'msg-me' : 'msg-other'}`}>
                                        <div className="msg-avatar" title={displayName}>
                                            {msg.userPhoto ? (
                                                <img src={msg.userPhoto} alt={displayName} />
                                            ) : (
                                                <div className="msg-avatar-fallback">{getAvatarFallback(displayName)}</div>
                                            )}
                                        </div>
                                        <div className="msg-content-wrapper">
                                            <div className={`msg-meta ${isMe ? 'msg-meta-me' : ''}`}>
                                                <span className="msg-name">{displayName}</span>
                                                {messageTime ? <span className="msg-time">{messageTime}</span> : null}
                                            </div>
                                            <div className={`msg-bubble ${msg.imageUrl ? 'msg-bubble-image' : ''}`}>
                                                {msg.imageUrl ? (
                                                    <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                                                        <img src={msg.imageUrl} alt="chat attachment" className="chat-image-attachment" />
                                                    </a>
                                                ) : (
                                                    <>{msg.text}</>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {activeTypers.length > 0 && (
                            <div className="team-chat-typing-indicator">
                                <LoaderCircle size={12} className="spin" />
                                <span>{activeTypers.join(', ')} бичиж байна...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="team-chat-input-area" onSubmit={handleSend}>
                        <button type="button" className="team-chat-action-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <LoaderCircle size={20} className="spin" /> : <ImageIcon size={20} />}
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <input
                            type="text"
                            placeholder="Зурвас бичих..."
                            value={text}
                            onChange={(e) => handleTyping(e.target.value)}
                        />
                        <button type="submit" disabled={!text.trim() && !isUploading} className="team-chat-send">
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            <style aria-hidden="true">{`
                .team-chat-fab-messenger {
                    position: fixed;
                    right: 32px;
                    bottom: 32px;
                    width: 60px;
                    height: 60px;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .team-chat-fab-messenger:hover {
                    transform: scale(1.08) translateY(-2px);
                }
                .messenger-icon-bg {
                    background: linear-gradient(135deg, #0A7CFF 0%, #0056D4 100%);
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 25px rgba(10, 124, 255, 0.4);
                }
                .messenger-icon-bg svg {
                    stroke: white;
                }
                .team-chat-widget {
                    position: fixed;
                    right: 32px;
                    bottom: 32px;
                    width: 340px;
                    height: 520px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 24px 48px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: inherit;
                }
                @keyframes slideUpFade {
                    from { transform: translateY(50px) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .team-chat-header {
                    background: linear-gradient(135deg, #0A7CFF 0%, #0056D4 100%);
                    color: white;
                    padding: 14px 18px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                    z-index: 2;
                }
                .team-chat-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                    font-size: 1rem;
                }
                .team-chat-icon-btn {
                    background: rgba(255,255,255,0);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .team-chat-icon-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .team-chat-settings {
                    background: #F8FAFC;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border-bottom: 1px solid #E2E8F0;
                }
                .team-chat-settings label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #475569;
                }
                .team-chat-settings input {
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid #CBD5E1;
                    font-size: 0.9rem;
                    outline: none;
                }
                .team-chat-settings input:focus {
                    border-color: #0A7CFF;
                }
                .team-chat-settings button {
                    background: #10B981;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .team-chat-settings button:hover {
                    background: #059669;
                }
                .team-chat-body {
                    flex: 1;
                    padding: 16px 14px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
                }
                .team-chat-empty {
                    text-align: center;
                    color: #94A3B8;
                    margin: auto;
                    font-size: 0.95rem;
                    max-width: 80%;
                }
                .team-chat-msg {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                }
                .team-chat-msg.msg-me {
                    justify-content: flex-end;
                    flex-direction: row-reverse;
                }
                .msg-avatar {
                    width: 30px;
                    height: 30px;
                    flex-shrink: 0;
                    border-radius: 50%;
                    overflow: hidden;
                    background: linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%);
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05);
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
                    font-weight: 700;
                    color: #31508f;
                    font-size: 0.78rem;
                }
                .msg-content-wrapper {
                    max-width: min(78%, 230px);
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .msg-me .msg-content-wrapper {
                    align-items: flex-end;
                }
                .msg-meta {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 4px;
                }
                .msg-meta-me {
                    justify-content: flex-end;
                }
                .msg-name {
                    font-size: 0.72rem;
                    color: #64748B;
                    font-weight: 700;
                }
                .msg-time {
                    font-size: 0.68rem;
                    color: #94A3B8;
                }
                .msg-bubble {
                    padding: 10px 12px;
                    border-radius: 18px;
                    font-size: 0.92rem;
                    line-height: 1.45;
                    word-break: break-word;
                    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
                }
                .msg-bubble-image {
                    padding: 0;
                    overflow: hidden;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .chat-image-attachment {
                    max-width: 100%;
                    border-radius: 14px;
                    display: block;
                    border: 1px solid #E2E8F0;
                }
                .msg-other .msg-bubble {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    color: #1E293B;
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    border-top-left-radius: 8px;
                }
                .msg-me .msg-bubble {
                    background: linear-gradient(135deg, #0A7CFF 0%, #2563eb 100%);
                    color: white;
                    border-top-right-radius: 8px;
                }
                .team-chat-typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    color: #94A3B8;
                    font-size: 0.8rem;
                    margin-top: -4px;
                }
                .team-chat-typing-indicator .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
                .team-chat-input-area {
                    display: flex;
                    padding: 12px;
                    gap: 10px;
                    background: white;
                    border-top: 1px solid #F1F5F9;
                    align-items: center;
                }
                .team-chat-action-btn {
                    background: transparent;
                    color: #0A7CFF;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    border-radius: 50%;
                }
                .team-chat-action-btn:hover {
                    background: #F1F5F9;
                }
                .team-chat-input-area input[type="text"] {
                    flex: 1;
                    background: #F1F5F9;
                    border: none;
                    border-radius: 20px;
                    padding: 10px 16px;
                    font-size: 0.95rem;
                    outline: none;
                    color: #1E293B;
                }
                .team-chat-input-area input[type="text"]::placeholder {
                    color: #94A3B8;
                }
                .team-chat-send {
                    background: transparent;
                    color: #0A7CFF;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                }
                .team-chat-send:disabled {
                    color: #CBD5E1;
                    cursor: not-allowed;
                }
                .team-chat-send:not(:disabled):hover {
                    background: #F1F5F9;
                }
            `}</style>
        </>
    );

    return createPortal(content, document.body);
};

export default TeamChat;
