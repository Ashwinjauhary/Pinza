import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Room } from '../types';

interface CommunitiesListProps {
    rooms: Room[];
    onJoinChannel: (id: string, name: string) => void;
    onCreateCommunity: (name: string) => Promise<any>;
    onCreateChannel: (name: string, communityId: string) => Promise<any>;
}

export const CommunitiesList: React.FC<CommunitiesListProps> = ({ rooms, onJoinChannel, onCreateCommunity, onCreateChannel }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newCommunityName, setNewCommunityName] = useState('');

    const [showCreateChannel, setShowCreateChannel] = useState<string | null>(null); // communityId
    const [newChannelName, setNewChannelName] = useState('');

    const communities = rooms.filter(r => r.type === 'community');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommunityName.trim()) return;
        await onCreateCommunity(newCommunityName);
        setNewCommunityName('');
        setShowCreate(false);
    };

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim() || !showCreateChannel) return;
        await onCreateChannel(newChannelName, showCreateChannel);
        setNewChannelName('');
        setShowCreateChannel(null);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-primary font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                New Community
            </button>

            {communities.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No communities yet. Create one!
                </div>
            )}

            <div className="space-y-2">
                {communities.map(comm => (
                    <div key={comm.id} className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div
                            onClick={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                    {comm.name.substring(0, 1).toUpperCase()}
                                </div>
                                <h3 className="font-semibold text-gray-200">{comm.name}</h3>
                            </div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transform transition-transform ${expandedId === comm.id ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        <AnimatePresence>
                            {expandedId === comm.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-black/20"
                                >
                                    <div className="p-2 space-y-1">
                                        <div className="text-xs font-semibold text-gray-500 px-3 py-1 uppercase tracking-wider flex justify-between items-center">
                                            CHANNELS
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowCreateChannel(comm.id); }}
                                                className="text-primary hover:text-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                        {rooms
                                            .filter(r => r.type === 'channel' && r.parent_id === comm.id)
                                            .map(channel => (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => onJoinChannel(channel.id, channel.name)}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <span className="text-lg">#</span>
                                                    <span>{channel.name}</span>
                                                </div>
                                            ))
                                        }
                                        {rooms.filter(r => r.type === 'channel' && r.parent_id === comm.id).length === 0 && (
                                            <div className="px-3 py-2 text-xs text-gray-600 italic">No channels</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Create Community Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-4">Create Community</h3>
                            <form onSubmit={handleCreate}>
                                <input
                                    type="text"
                                    value={newCommunityName}
                                    onChange={e => setNewCommunityName(e.target.value)}
                                    placeholder="Community Name"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-primary transition-colors"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-emerald-400 transition-colors"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Channel Modal */}
            <AnimatePresence>
                {showCreateChannel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-4">Create Channel</h3>
                            <form onSubmit={handleCreateChannel}>
                                <input
                                    type="text"
                                    value={newChannelName}
                                    onChange={e => setNewChannelName(e.target.value)}
                                    placeholder="Channel Name"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-primary transition-colors"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateChannel(null)}
                                        className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-emerald-400 transition-colors"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
