import React, { useState, useRef, useEffect } from 'react';
import type { Message, User } from '../types';
import { BsEmojiSmile, BsMic, BsPaperclip, BsSend, BsThreeDotsVertical, BsTelephone, BsCameraVideo } from 'react-icons/bs';
import { MessageBubble } from './MessageBubble';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatAreaProps {
    messages: Message[];
    currentUser: User | null;
    typingUsers: string[];
    onSendMessage: (content: string, type?: 'text' | 'image' | 'audio' | 'file', replyToId?: string) => void;
    onSendImage: (file: File) => void;
    onSendFile: (file: File, type: 'image' | 'audio' | 'file') => void;
    onTyping: () => void;
    title?: string;
    onReact?: (messageId: string, emoji: string) => void;
    onDelete?: (messageId: string) => void;
    onMenuClick?: () => void;
    users?: User[];
    onStartCall?: (isVideo: boolean) => void;
    onMarkRead?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, currentUser, typingUsers, onSendMessage, onSendFile, onTyping, title, onReact, onDelete, onMenuClick, users, onStartCall, onMarkRead }) => {
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        onMarkRead?.();
    }, [messages, typingUsers, onMarkRead]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;
        onSendMessage(inputText, 'text', replyTo?.id);
        setInputText('');
        setReplyTo(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            onSendFile(file, 'image');
        } else if (file.type.startsWith('audio/')) {
            onSendFile(file, 'audio');
        } else {
            onSendFile(file, 'file');
        }

        // Reset
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-background/50 relative">
            {/* Header */}
            <header className="h-16 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onMenuClick} className="md:hidden text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                    {/* Avatar Placeholder */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-900/20">
                        {title?.[0]?.toUpperCase() || '#'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-100">{title}</h3>
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-gray-400">
                    <button onClick={() => onStartCall?.(false)} className="hover:text-primary transition-colors p-2 hover:bg-white/5 rounded-full">
                        <BsTelephone size={20} />
                    </button>
                    <button onClick={() => onStartCall?.(true)} className="hover:text-primary transition-colors p-2 hover:bg-white/5 rounded-full">
                        <BsCameraVideo size={20} />
                    </button>
                    <button className="hover:text-white transition-colors p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </button>
                    <button className="hover:text-white transition-colors p-2">
                        <BsThreeDotsVertical size={20} />
                    </button>
                </div>
            </header>


            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-1 custom-scrollbar">
                {messages.map((msg, index) => {
                    const isSelf = msg.senderId === currentUser?.id;
                    const showAvatar = !isSelf && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                    // Resolve avatar
                    const sender = users?.find(u => u.id === msg.senderId);
                    const avatarUrl = sender?.avatar;

                    return (
                        <div key={msg.id || index}>
                            <MessageBubble
                                message={msg}
                                isSelf={isSelf}
                                showAvatar={showAvatar}
                                avatarUrl={avatarUrl}
                                onReact={onReact ? (emoji) => onReact(msg.id, emoji) : undefined}
                                onDelete={onDelete ? () => onDelete(msg.id) : undefined}
                                onReply={() => setReplyTo(msg)}
                            />
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>


            {/* Input */}
            {/* Input */}
            <div className="bg-white/5 border-t border-white/5 shrink-0 backdrop-blur-md">
                {/* Reply Banner */}
                {replyTo && (
                    <div className="px-4 py-2 bg-black/20 flex items-center justify-between border-l-4 border-primary mx-4 mt-2 rounded-r-lg">
                        <div className="flex flex-col text-sm">
                            <span className="text-primary font-medium text-xs">Replying to message</span>
                            <span className="text-gray-300 truncate max-w-xs">{replyTo.content || (replyTo.type === 'image' ? 'Image' : 'File')}</span>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                )}
                <div className="p-4">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
                        {isRecording ? (
                            <VoiceRecorder
                                onCancel={() => setIsRecording(false)}
                                onRecordingComplete={(file) => {
                                    setIsRecording(false);
                                    onSendFile(file, 'audio');
                                }}
                            />
                        ) : (
                            <>
                                <button type="button" className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                                    <BsEmojiSmile size={20} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
                                >
                                    <BsPaperclip size={20} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />

                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => {
                                        setInputText(e.target.value);
                                        onTyping();
                                    }}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                                />

                                {inputText.trim() ? (
                                    <button
                                        type="submit"
                                        className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all"
                                    >
                                        <BsSend size={18} className="ml-0.5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsRecording(true)}
                                        className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                        title="Record Voice Note"
                                    >
                                        <BsMic size={20} />
                                    </button>
                                )}
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div >
    );
};
