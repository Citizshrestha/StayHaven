/**
 * EmojiPicker — Lightweight inline emoji picker
 * 
 * Categorized emojis with search, rendered as a popover.
 * No external dependencies needed.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';

const EMOJI_DATA = {
    'Smileys': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
        '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
        '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡',
        '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬',
        '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
        '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎',
        '🤓', '🧐', '😕', '🫤', '😟', '🙁', '😮', '😯', '😲', '😳',
        '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
        '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
        '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
        '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀',
        '😿', '😾',
    ],
    'Gestures': [
        '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌',
        '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
        '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛',
        '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
        '🤳', '💪', '🦾', '🦿',
    ],
    'Hearts': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
        '💟', '♥️', '💋', '💌',
    ],
    'Food': [
        '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇',
        '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🫓', '🥗', '🥙',
        '🥪', '🌮', '🌯', '🫔', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣',
        '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮',
        '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮',
        '🍭', '🍬', '🍫', '🍩', '🍪', '☕', '🍵', '🫖', '🧃', '🥤',
        '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🫗', '🥃', '🍸', '🍹',
        '🧉', '🍾',
    ],
    'Objects': [
        '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💡', '🔦', '🏮',
        '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒',
        '📝', '✏️', '🖊️', '🖋️', '📎', '📌', '📍', '✂️', '🗑️', '📦',
        '🔑', '🗝️', '🔨', '🪓', '🔧', '🔩', '⚙️', '🧲', '💊', '🩹',
        '🛒', '🎁', '🎈', '🎉', '🎊', '🎀',
    ],
    'Symbols': [
        '✅', '❌', '⭕', '❗', '❓', '‼️', '⁉️', '💯', '🔥', '✨',
        '⭐', '🌟', '💫', '💥', '💢', '💦', '💨', '🕳️', '💬', '👁️‍🗨️',
        '🗨️', '🗯️', '💭', '🔔', '🔕', '🎵', '🎶', '🏳️', '🏴', '🚩',
    ],
};

const CATEGORY_ICONS = {
    'Smileys': '😀',
    'Gestures': '👋',
    'Hearts': '❤️',
    'Food': '🍕',
    'Objects': '💻',
    'Symbols': '✨',
};

const EmojiPicker = ({ onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Smileys');
    const [recentEmojis, setRecentEmojis] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('_recentEmojis') || '[]');
        } catch { return []; }
    });
    const pickerRef = useRef(null);
    const categories = Object.keys(EMOJI_DATA);

    // Close on click outside
    useEffect(() => {
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const handleSelect = (emoji) => {
        onSelect(emoji);
        // Update recents
        const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
        setRecentEmojis(updated);
        try { localStorage.setItem('_recentEmojis', JSON.stringify(updated)); } catch { /* */ }
    };

    // Filter emojis by search (basic name-based matching via unicode names is hard,
    // so we'll just search across all emojis and show matching categories)
    const filteredEmojis = useMemo(() => {
        if (!search.trim()) return null;
        const q = search.toLowerCase();
        // Simple: filter nothing for emoji search (emojis don't have text names in this impl)
        // Instead match category names
        const results = [];
        for (const [cat, emojis] of Object.entries(EMOJI_DATA)) {
            if (cat.toLowerCase().includes(q)) {
                results.push(...emojis);
            }
        }
        // If no category match, show all
        if (results.length === 0) {
            for (const emojis of Object.values(EMOJI_DATA)) results.push(...emojis);
        }
        return results;
    }, [search]);

    const displayEmojis = filteredEmojis || EMOJI_DATA[activeCategory] || [];

    return (
        <div className="emoji-picker" ref={pickerRef}>
            {/* Search */}
            <div className="emoji-picker-search">
                <input
                    type="text"
                    placeholder="Search category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Category tabs */}
            {!search && (
                <div className="emoji-picker-cats">
                    {recentEmojis.length > 0 && (
                        <button
                            className={`emoji-cat-btn ${activeCategory === '_recent' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('_recent')}
                            title="Recent"
                        >🕐</button>
                    )}
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`emoji-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                            title={cat}
                        >{CATEGORY_ICONS[cat]}</button>
                    ))}
                </div>
            )}

            {/* Emoji grid */}
            <div className="emoji-picker-grid">
                {activeCategory === '_recent' && !search
                    ? recentEmojis.map((em, i) => (
                        <button key={`r-${i}`} className="emoji-btn" onClick={() => handleSelect(em)}>
                            {em}
                        </button>
                    ))
                    : displayEmojis.map((em, i) => (
                        <button key={`${activeCategory}-${i}`} className="emoji-btn" onClick={() => handleSelect(em)}>
                            {em}
                        </button>
                    ))
                }
            </div>
        </div>
    );
};

export default EmojiPicker;
