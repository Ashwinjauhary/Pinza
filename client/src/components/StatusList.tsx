import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../hooks/useChat';
import type { Status } from '../types';
import { API_URL } from '../config';

export const StatusList: React.FC = () => {
    const { currentUser, statuses, fetchStatuses, users } = useChat();
    const [showCreate, setShowCreate] = useState(false);
    const [createMode, setCreateMode] = useState<'text' | 'image'>('text');
    const [statusText, setStatusText] = useState('');
    const [statusColor, setStatusColor] = useState('bg-purple-600');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Viewer State
    const [viewingUser, setViewingUser] = useState<string | null>(null); // userId
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

    const handleCreateStatus = async () => {
        if (createMode === 'text' && !statusText.trim()) return;
        if (createMode === 'image' && !selectedImage) return;

        setCreating(true);
        try {
            const token = localStorage.getItem('pingza_token');
            let content = statusText;
            let type = 'text';

            if (createMode === 'image' && selectedImage) {
                const formData = new FormData();
                formData.append('file', selectedImage);
                const uploadRes = await fetch(`${API_URL}/api/upload`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                content = uploadData.url;
                type = 'image';
            }

            await fetch(`${API_URL}/api/status/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type,
                    content,
                    caption: createMode === 'image' ? statusText : undefined,
                    background: createMode === 'text' ? statusColor : undefined
                })
            });

            setStatusText('');
            setSelectedImage(null);
            setImagePreview(null);
            setShowCreate(false);
            fetchStatuses?.();
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setCreateMode('image');
        }
    };

    // Group by user
    const groupedStatuses = statuses?.reduce((acc, status) => {
        if (!acc[status.userId]) acc[status.userId] = [];
        acc[status.userId].push(status);
        return acc;
    }, {} as Record<string, Status[]>) || {};

    const colors = [
        'bg-purple-600', 'bg-blue-600', 'bg-green-600',
        'bg-red-600', 'bg-yellow-600', 'bg-pink-600',
        'bg-indigo-600', 'bg-gray-800'
    ];

    const activeUserStatuses = viewingUser ? groupedStatuses[viewingUser] : [];

    // Auto-advance viewer
    useEffect(() => {
        if (!viewingUser || !activeUserStatuses.length) return;

        const timer = setTimeout(() => {
            if (currentStatusIndex < activeUserStatuses.length - 1) {
                setCurrentStatusIndex(prev => prev + 1);
            } else {
                setViewingUser(null); // Close viewer
                setCurrentStatusIndex(0);
            }
        }, 5000); // 5 seconds per status

        return () => clearTimeout(timer);
    }, [viewingUser, currentStatusIndex, activeUserStatuses.length]);

    return (
        <div className="space-y-4">
            {/* My Status */}
            <div
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer"
            >
                <div className="relative">
                    <img
                        src={currentUser?.avatar}
                        alt="My Status"
                        className="w-12 h-12 rounded-full border-2 border-dashed border-gray-500 p-0.5"
                    />
                    <div className="absolute bottom-0 right-0 bg-primary text-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-200">My Status</h4>
                    <p className="text-xs text-gray-500">Tap to add status update</p>
                </div>
            </div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Recent updates</div>

            {Object.keys(groupedStatuses).length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">No recent updates</div>
            )}

            {Object.keys(groupedStatuses).map(userId => (
                <div
                    key={userId}
                    onClick={() => { setViewingUser(userId); setCurrentStatusIndex(0); }}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer"
                >
                    <div className="relative p-0.5 rounded-full border-2 border-primary">
                        <img
                            src={users.find(u => u.id === userId)?.avatar}
                            alt="User"
                            className="w-10 h-10 rounded-full bg-surface"
                        />
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-200">{users.find(u => u.id === userId)?.username}</h4>
                        <p className="text-xs text-gray-500">{groupedStatuses[userId].length} new updates</p>
                    </div>
                </div>
            ))}

            {/* Creator Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
                    >
                        <button
                            onClick={() => setShowCreate(false)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>

                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setCreateMode('text')}
                                className={`px-4 py-2 rounded-full font-medium ${createMode === 'text' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                            >
                                Text
                            </button>
                            <button
                                onClick={() => setCreateMode('image')}
                                className={`px-4 py-2 rounded-full font-medium ${createMode === 'image' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                            >
                                Photo
                            </button>
                        </div>

                        <div className={`w-full max-w-md aspect-[9/16] max-h-[70vh] rounded-2xl ${createMode === 'text' ? statusColor : 'bg-black'} flex flex-col items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden`}>
                            {createMode === 'text' ? (
                                <textarea
                                    value={statusText}
                                    onChange={e => setStatusText(e.target.value)}
                                    placeholder="Type a status..."
                                    className="w-full h-full bg-transparent text-white text-3xl font-bold text-center placeholder-white/50 resize-none outline-none border-none font-sans z-10"
                                    maxLength={200}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center relative">
                                    {imagePreview ? (
                                        <div className="relative w-full h-full">
                                            <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                                            <input
                                                type="text"
                                                value={statusText}
                                                onChange={e => setStatusText(e.target.value)}
                                                placeholder="Add a caption..."
                                                className="absolute bottom-4 left-4 right-4 bg-black/50 p-2 rounded-lg text-white text-sm outline-none text-center"
                                            />
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                            <span>Upload Photo</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {createMode === 'text' && (
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 z-20">
                                    {colors.map(c => (
                                        <button
                                            key={c} onClick={() => setStatusColor(c)}
                                            className={`w-6 h-6 rounded-full border-2 border-white/20 ${c} ${statusColor === c ? 'scale-125 border-white' : ''} transition-all`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleCreateStatus}
                            disabled={creating}
                            className="mt-6 bg-emerald-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2 text-lg disabled:opacity-50"
                        >
                            {creating ? 'Sending...' : 'Send Status'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Viewer */}
            <AnimatePresence>
                {viewingUser && activeUserStatuses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black flex flex-col"
                    >
                        {/* Progress Bar */}
                        <div className="flex gap-1 p-2 pt-4">
                            {activeUserStatuses.map((_, idx) => (
                                <div key={idx} className="h-1 bg-white/20 flex-1 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-white"
                                        initial={{ width: idx < currentStatusIndex ? '100%' : '0%' }}
                                        animate={{ width: idx === currentStatusIndex ? '100%' : (idx < currentStatusIndex ? '100%' : '0%') }}
                                        transition={{ duration: idx === currentStatusIndex ? 5 : 0, ease: 'linear' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="flex items-center gap-3 p-4">
                            <img
                                src={users.find(u => u.id === viewingUser)?.avatar}
                                className="w-10 h-10 rounded-full"
                                alt="User"
                            />
                            <div className="flex-1">
                                <h4 className="font-bold text-white">{users.find(u => u.id === viewingUser)?.username}</h4>
                                <p className="text-xs text-gray-400">
                                    {new Date(activeUserStatuses[currentStatusIndex].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <button onClick={() => setViewingUser(null)} className="text-white p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-center justify-center relative p-4">
                            {activeUserStatuses[currentStatusIndex].type === 'text' ? (
                                <div className={`w-full max-w-lg aspect-[9/16] ${activeUserStatuses[currentStatusIndex].background || 'bg-gray-800'} rounded-2xl flex items-center justify-center p-8 text-center`}>
                                    <p className="text-3xl font-bold text-white">{activeUserStatuses[currentStatusIndex].content}</p>
                                </div>
                            ) : (
                                <div className="w-full max-w-lg aspect-[9/16] bg-black flex items-center justify-center relative">
                                    <img src={activeUserStatuses[currentStatusIndex].content} className="max-w-full max-h-full object-contain" alt="Status" />
                                    {activeUserStatuses[currentStatusIndex].caption && (
                                        <div className="absolute bottom-10 bg-black/60 px-4 py-2 rounded-xl text-white">
                                            {activeUserStatuses[currentStatusIndex].caption}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation Tap Zones */}
                            <div className="absolute inset-y-0 left-0 w-1/3" onClick={() => setCurrentStatusIndex(prev => Math.max(0, prev - 1))} />
                            <div className="absolute inset-y-0 right-0 w-1/3" onClick={() => {
                                if (currentStatusIndex < activeUserStatuses.length - 1) setCurrentStatusIndex(prev => prev + 1);
                                else setViewingUser(null);
                            }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
