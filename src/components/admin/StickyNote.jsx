import React, { useState, useEffect, useRef } from 'react';
import { Settings2 } from 'lucide-react';

const DAILY_NEWS_STORAGE_KEY = 'sweet-secret-orders-daily-news';
const STICKY_NOTE_POS_KEY = 'sweet-secret-sticky-pos';
const STICKY_NOTE_COLOR_KEY = 'sweet-secret-sticky-color';

const COLORS = [
    { bg: '#FEF08A', headerBg: '#FDE047', text: '#854D0E', name: 'yellow' },
    { bg: '#FBCFE8', headerBg: '#F9A8D4', text: '#831843', name: 'pink' },
    { bg: '#BAE6FD', headerBg: '#7DD3FC', text: '#0C4A6E', name: 'blue' },
    { bg: '#BBF7D0', headerBg: '#86EFAC', text: '#14532D', name: 'green' },
    { bg: '#E5E7EB', headerBg: '#D1D5DB', text: '#374151', name: 'gray' },
];

const StickyNote = () => {
    const [news, setNews] = useState('');
    const [draft, setDraft] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const [pos, setPos] = useState({ x: window.innerWidth > 1200 ? window.innerWidth - 380 : 300, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [color, setColor] = useState(COLORS[0]);
    const [showColors, setShowColors] = useState(false);

    const noteRef = useRef(null);

    useEffect(() => {
        try {
            const todayKey = new Date().toISOString().slice(0, 10);
            const storedNews = JSON.parse(window.localStorage.getItem(DAILY_NEWS_STORAGE_KEY) || '{}');
            const todayNews = storedNews[todayKey] || '';
            setNews(todayNews);
            setDraft(todayNews);

            const storedPos = JSON.parse(window.localStorage.getItem(STICKY_NOTE_POS_KEY) || 'null');
            if (storedPos) setPos(storedPos);

            const storedColor = window.localStorage.getItem(STICKY_NOTE_COLOR_KEY);
            if (storedColor) {
                const found = COLORS.find(c => c.name === storedColor);
                if (found) setColor(found);
            }
        } catch (e) { console.error('Error loading sticky note data', e); }
    }, []);

    const handleSave = () => {
        const nextNews = String(draft || '').trim();
        const todayKey = new Date().toISOString().slice(0, 10);
        try {
            const storedNews = JSON.parse(window.localStorage.getItem(DAILY_NEWS_STORAGE_KEY) || '{}');
            storedNews[todayKey] = nextNews;
            window.localStorage.setItem(DAILY_NEWS_STORAGE_KEY, JSON.stringify(storedNews));
        } catch (e) { }
        setNews(nextNews);
        setDraft(nextNews);
        setIsEditing(false);
    };

    const handleColorChange = (c) => {
        setColor(c);
        setShowColors(false);
        try {
            window.localStorage.setItem(STICKY_NOTE_COLOR_KEY, c.name);
        } catch (e) { }
    }

    const handlePointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('.color-picker-flyout')) return;
        setIsDragging(true);
        const rect = noteRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;

        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > window.innerWidth - 100) newX = window.innerWidth - 100;
        if (newY > window.innerHeight - 50) newY = window.innerHeight - 100;

        setPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.target.releasePointerCapture(e.pointerId);
        try {
            window.localStorage.setItem(STICKY_NOTE_POS_KEY, JSON.stringify(pos));
        } catch (error) { }
    };

    return (
        <div
            ref={noteRef}
            className="sticky-note-widget"
            style={{
                left: pos.x,
                top: pos.y,
                backgroundColor: color.bg,
                borderColor: color.headerBg,
                color: color.text,
                cursor: isDragging ? 'grabbing' : 'auto'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="sticky-note-header" style={{ backgroundColor: color.headerBg }}>
                <div className="sticky-note-title">
                    📍 Мэдээлэл
                </div>
                <div className="sticky-note-actions">
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            className="sticky-note-btn"
                            style={{ color: color.text }}
                            onClick={() => setShowColors(!showColors)}
                        >
                            <Settings2 size={14} />
                        </button>
                        {showColors && (
                            <div className="color-picker-flyout">
                                {COLORS.map(c => (
                                    <div
                                        key={c.name}
                                        className="color-swatch"
                                        style={{ backgroundColor: c.bg, border: color.name === c.name ? '2px solid #000' : '1px solid #ddd' }}
                                        onClick={() => handleColorChange(c)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <button type="button" className="sticky-note-btn" style={{ color: color.text, fontWeight: 'bold' }} onClick={handleSave}>
                            Хадгалах
                        </button>
                    ) : (
                        <button type="button" className="sticky-note-btn" style={{ color: color.text }} onClick={() => setIsEditing(true)}>
                            Засах
                        </button>
                    )}
                </div>
            </div>
            <div className="sticky-note-body">
                {isEditing ? (
                    <textarea
                        className="sticky-note-textarea"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Өнөөдрийн мэдээллээ энд оруулна уу..."
                        style={{ color: color.text }}
                        autoFocus
                    />
                ) : (
                    <div className="sticky-note-content">
                        {news || 'Өнөөдрийн мэдээлэл ороогүй байна.'}
                    </div>
                )}
            </div>

            <style aria-hidden="true">{`
                .sticky-note-widget {
                    position: fixed;
                    width: 280px;
                    min-height: 200px;
                    border-radius: 8px;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid transparent;
                    transition: box-shadow 0.2s;
                    user-select: none;
                    touch-action: none;
                }
                .sticky-note-widget:hover {
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                }
                .sticky-note-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-top-left-radius: 7px;
                    border-top-right-radius: 7px;
                    cursor: grab;
                }
                .sticky-note-widget[style*="grabbing"] .sticky-note-header {
                    cursor: grabbing;
                }
                .sticky-note-title {
                    font-weight: 700;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .sticky-note-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .sticky-note-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 0.8rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
                .sticky-note-btn:hover {
                    background: rgba(0,0,0,0.05);
                }
                .color-picker-flyout {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 4px;
                    background: white;
                    border-radius: 6px;
                    padding: 6px;
                    display: flex;
                    gap: 4px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    border: 1px solid #e5e7eb;
                    z-index: 10;
                }
                .color-swatch {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .sticky-note-body {
                    padding: 12px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .sticky-note-textarea {
                    width: 100%;
                    flex: 1;
                    min-height: 140px;
                    background: transparent;
                    border: none;
                    resize: none;
                    outline: none;
                    font-family: inherit;
                    font-size: 0.95rem;
                    line-height: 1.5;
                }
                .sticky-note-textarea::placeholder {
                    color: inherit;
                    opacity: 0.6;
                }
                .sticky-note-content {
                    font-size: 0.95rem;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    flex: 1;
                    cursor: text;
                    user-select: text;
                }
            `}</style>
        </div>
    );
};

export default StickyNote;
