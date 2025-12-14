import React, { useState } from 'react';
import type { User } from '../types';
import { motion } from 'framer-motion';

interface ProfileSettingsProps {
    user: User;
    onClose: () => void;
    onUpdate: (username: string, avatar: string, bio?: string) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onClose, onUpdate }) => {
    const [username, setUsername] = useState(user.username);
    const [currentAvatar, setCurrentAvatar] = useState(user.avatar);
    const [bio, setBio] = useState(user.bio || '');

    // Simple way to regenerate: use random seeds
    const regenerateAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        setCurrentAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
    };

    const handleSave = () => {
        onUpdate(username, currentAvatar, bio);
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>

                <h3 className="text-xl font-bold text-white mb-6 text-center">Edit Profile</h3>

                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="relative group cursor-pointer" onClick={regenerateAvatar}>
                        <img src={currentAvatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-surface shadow-lg" />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium">Tap to Change</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Phone Number</label>
                        <input
                            type="text"
                            value={user.phone_number}
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-400 outline-none cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Bio</label>
                        <input
                            type="text"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Available"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all mt-4"
                    >
                        Save Changes
                    </button>
                </div>

            </motion.div>
        </div>
    );
};
