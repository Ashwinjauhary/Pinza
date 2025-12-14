import React, { useState } from 'react';
import type { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../hooks/useChat';

import { ProfileSettings } from './ProfileSettings';
import { StatusList } from './StatusList';
import { CommunitiesList } from './CommunitiesList';

interface SidebarProps {
    users: User[];
    currentUser: User | null;
    onSelectUser: (user: User) => void;
    onSelectGlobal: () => void;
    joinConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ users, currentUser, onSelectUser, onSelectGlobal, joinConversation }) => {
    const chatData = useChat() as any;
    const { searchContact, createRoom, rooms, updateProfile } = chatData;
    const [view, setView] = useState<'chats' | 'status' | 'communities'>('chats');

    // ...

    // Sort rooms: Groups then Privates? Or just all together?
    // Let's filter out 'global' if it's there.
    const myRooms = rooms || [];

    const getRoomName = (room: any) => {
        if (room.type === 'private') {
            const otherId = room.id.split('_').find((id: string) => id !== currentUser?.id);
            const otherUser = users.find(u => u.id === otherId);
            return otherUser ? otherUser.username : (room.name || 'Private Chat');
        }
        return room.name;
    };

    const getRoomAvatar = (room: any) => {
        if (room.type === 'private') {
            const otherId = room.id.split('_').find((id: string) => id !== currentUser?.id);
            const otherUser = users.find(u => u.id === otherId);
            return otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`; // Fallback random
        }
        return `https://ui-avatars.com/api/?name=${room.name}&background=random`;
    };
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [searchPhone, setSearchPhone] = useState('');
    const [searchError, setSearchError] = useState('');

    // Group State
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError('');
        try {
            const user = await searchContact(searchPhone);
            if (user) {
                onSelectUser(user);
                setShowNewChat(false);
                setSearchPhone('');
            } else {
                setSearchError('User not found');
            }
        } catch (err) {
            setSearchError('Search failed');
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim() || selectedMembers.length === 0) return;

        try {
            // Create room with selected members + current user (handled by backend usually, but we pass members)
            // The backend createRoom expects { type: 'group', name, members: [id1, id2] }
            await createRoom(groupName, 'group', selectedMembers);
            setShowCreateGroup(false);
            setGroupName('');
            setSelectedMembers([]);
            // Optionally select the new group? 
            // We might need a way to switch to it, but createRoom currently just sends event.
        } catch (err) {
            console.error("Failed to create group", err);
        }
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div className="w-80 border-r border-white/5 bg-background/50 backdrop-blur-sm flex flex-col h-full relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    Pingza
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-primary"
                        title="Create Group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </button>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-primary"
                        title="New Chat"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/5">
                <button
                    onClick={() => setView('chats')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${view === 'chats' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    Chats
                    {view === 'chats' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setView('communities')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${view === 'communities' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    Comm
                    {view === 'communities' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setView('status')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${view === 'status' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    Status
                    {view === 'status' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {view === 'status' ? (
                    <StatusList />
                ) : view === 'communities' ? (
                    <CommunitiesList
                        rooms={rooms}
                        onJoinChannel={(id) => joinConversation(id)}
                        onCreateCommunity={(name) => createRoom(name, 'community', [currentUser?.id || ''])}
                        onCreateChannel={(param: any, communityId: any) => createRoom(param, 'channel', [currentUser?.id || ''], communityId)}
                    />
                ) : (
                    <>
                        <div
                            onClick={onSelectGlobal}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer mb-4 border border-primary/20 bg-primary/5"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">#</div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-200">Global Chat</h4>
                                <p className="text-xs text-primary/70">Public Room</p>
                            </div>
                        </div>

                        {/* My Chats/Rooms */}
                        {myRooms.length > 0 && (
                            <>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Conversations</h3>
                                {myRooms.filter((r: any) => r.id !== 'global').map((room: any) => (
                                    <motion.div
                                        key={room.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => joinConversation(room.id)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                    >
                                        <img
                                            src={getRoomAvatar(room)}
                                            alt={getRoomName(room)}
                                            className="w-10 h-10 rounded-full bg-surface border border-white/10 group-hover:border-primary/50 transition-colors"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-200 truncate">{getRoomName(room)}</h4>
                                            <p className="text-xs text-gray-500 truncate capitalize">{room.type}</p>
                                        </div>
                                    </motion.div>
                                ))}
                                <div className="my-4 border-t border-white/5" />
                            </>
                        )}

                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Online Users</h3>
                        <AnimatePresence>
                            {users.filter(u => u.id !== currentUser?.id).map((user) => (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onClick={() => onSelectUser(user)}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                >
                                    <div className="relative">
                                        <img
                                            src={user.avatar}
                                            alt={user.username}
                                            className="w-10 h-10 rounded-full bg-surface border border-white/10 group-hover:border-primary/50 transition-colors"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-200 truncate">{user.username}</h4>
                                        <p className="text-xs text-gray-500 truncate">{user.phone_number}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </>
                )}
            </div>

            <div className="p-4 border-t border-white/5 bg-surface/30">
                <div className="flex items-center gap-3">
                    <img
                        src={currentUser?.avatar}
                        alt="Me"
                        className="w-9 h-9 rounded-full bg-surface cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowProfile(true)}
                        title="Edit Profile"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{currentUser?.username}</p>
                        <p className="text-xs text-emerald-400 truncate">{currentUser?.phone_number}</p>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('pingza_token');
                            localStorage.removeItem('pingza_user');
                            window.location.reload();
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* New Chat Modal */}
            {
                showNewChat && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-4">Start New Chat</h3>
                            <form onSubmit={handleSearch}>
                                <label className="block text-xs text-gray-400 mb-1">Enter Phone or Username</label>
                                <input
                                    type="text"
                                    value={searchPhone}
                                    onChange={e => setSearchPhone(e.target.value)}
                                    placeholder="+1... or @username"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary mb-2"
                                    autoFocus
                                />
                                {searchError && <p className="text-red-400 text-xs mb-2">{searchError}</p>}
                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewChat(false)}
                                        className="px-3 py-2 text-sm text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80"
                                    >
                                        Search
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Create Group Modal */}
            {
                showCreateGroup && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <h3 className="text-lg font-bold text-white mb-4">Create New Group</h3>
                            <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0">
                                <label className="block text-xs text-gray-400 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    placeholder="e.g. Weekend Trip"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary mb-4"
                                    autoFocus
                                />

                                <label className="block text-xs text-gray-400 mb-2">Select Members ({selectedMembers.length})</label>
                                <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 custom-scrollbar bg-black/20 rounded-lg p-2">
                                    {users.filter(u => u.id !== currentUser?.id).map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleMember(user.id)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedMembers.includes(user.id) ? 'bg-primary/20 border border-primary/50' : 'hover:bg-white/5 border border-transparent'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedMembers.includes(user.id) ? 'bg-primary border-primary' : 'border-gray-500'}`}>
                                                {selectedMembers.includes(user.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <img src={user.avatar} className="w-8 h-8 rounded-full" />
                                            <span className="text-sm text-gray-200 truncate">{user.username}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateGroup(false)}
                                        className="px-3 py-2 text-sm text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!groupName || selectedMembers.length === 0}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Group
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Profile Settings Modal */}
            {
                showProfile && currentUser && (
                    <ProfileSettings
                        user={currentUser}
                        onClose={() => setShowProfile(false)}
                        onUpdate={(username, avatar) => {
                            updateProfile(username, avatar);
                        }}
                    />
                )
            }
        </div >
    );
};
