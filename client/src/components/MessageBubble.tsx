import React, { useRef, useState } from 'react';
import type { Message } from '../types';
import { format } from 'date-fns';
import {
    BsCheck2, BsCheck2All, BsFileEarmarkText,
    BsPlayFill, BsPauseFill, BsDownload
} from 'react-icons/bs';

interface MessageBubbleProps {
    message: Message;
    isSelf: boolean;
    showAvatar?: boolean;
    onReact?: (emoji: string) => void;
    onDelete?: () => void;
    onReply?: () => void;
    avatarUrl?: string;
}

const AudioPlayer: React.FC<{ url: string, duration?: number }> = ({ url, duration }) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = async () => {
        if (!audioRef.current || error) return;

        try {
            if (playing) {
                audioRef.current.pause();
            } else {
                await audioRef.current.play();
            }
            setPlaying(!playing);
        } catch (err) {
            console.error("Audio playback failed:", err);
            setError(true);
            setPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration || 1;
            setProgress((current / total) * 100);
        }
    };

    return (
        <div className="flex items-center gap-3 min-w-[200px] bg-black/10 p-2 rounded-lg">
            <button
                onClick={togglePlay}
                className={`p-2 rounded-full text-white transition-colors ${error ? 'bg-red-500' : 'bg-primary hover:bg-emerald-600'}`}
                disabled={error}
            >
                {error ? '!' : (playing ? <BsPauseFill size={20} /> : <BsPlayFill size={20} />)}
            </button>
            <div className="flex-1">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-xs opacity-70 mt-1 block">
                    {error ? 'Error playing' : (duration ? `${duration}s` : 'Audio')}
                </span>
            </div>
            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    setPlaying(false);
                    setProgress(0);
                }}
                onError={() => setError(true)}
                className="hidden"
            />
        </div>
    );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSelf, showAvatar, onReact, onDelete, onReply, avatarUrl }) => {
    const time = format(new Date(message.timestamp), 'h:mm a');
    const [showPicker, setShowPicker] = useState(false);

    return (
        <div className={`flex gap-3 mb-4 ${isSelf ? 'flex-row-reverse' : 'flex-row'} group animate-message origin-bottom`}>
            {/* Real Avatar */}
            {!isSelf && (
                <div className={`w-8 h-8 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover bg-surface border border-white/10" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10" />
                    )}
                </div>
            )}

            <div className={`max-w-[70%] relative`}>
                <div className={`
             p-2.5 rounded-xl shadow-md
             ${isSelf
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-surface text-gray-100 rounded-tl-none border border-white/5'}
          `}>

                    {/* CONTENT TYPES */}

                    {/* REPLY CONTEXT */}
                    {message.replyToMessage && (
                        <div className={`mb-1 p-2 rounded-lg text-xs ${isSelf ? 'bg-black/20 text-white/90' : 'bg-black/5 text-gray-600'} border-l-4 border-primary/50`}>
                            <p className="font-bold mb-0.5 text-primary">{message.replyToMessage.senderName || 'Unknown'}</p>
                            <p className="truncate opacity-80">{message.replyToMessage.content || 'Media'}</p>
                        </div>
                    )}

                    {/* TEXT */}
                    {message.type === 'text' && (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                    )}

                    {/* IMAGE */}
                    {message.type === 'image' && (
                        <div className="rounded-lg overflow-hidden mb-1">
                            <img src={message.content} alt="Shared" className="max-w-full h-auto object-cover max-h-64" loading="lazy" />
                        </div>
                    )}

                    {/* AUDIO */}
                    {message.type === 'audio' && (
                        <AudioPlayer url={message.content} duration={message.duration} />
                    )}

                    {/* FILE */}
                    {message.type === 'file' && (
                        <a
                            href={message.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-black/20 p-3 rounded-xl hover:bg-black/30 transition-colors"
                        >
                            <div className="p-3 bg-white/10 rounded-lg">
                                <BsFileEarmarkText size={24} className="text-white/80" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{message.fileName || 'Document'}</p>
                                <p className="text-xs opacity-60">{message.fileSize ? `${Math.round(message.fileSize / 1024)} KB` : 'File'}</p>
                            </div>
                            <BsDownload className="opacity-50" />
                        </a>
                    )}

                    {/* METADATA (Time + Status) */}
                    <div className="flex items-center justify-end gap-1 mt-0.5 select-none -space-y-1">
                        <span className="text-[10px] text-gray-300/70">{time}</span>
                        {isSelf && (
                            <span className="ml-1">
                                {message.status === 'read' ? <BsCheck2All className="text-blue-300" size={15} strokeWidth={0.5} /> :
                                    message.status === 'delivered' ? <BsCheck2All className="text-gray-400" size={15} /> :
                                        <BsCheck2 className="text-gray-400" size={15} />}
                            </span>
                        )}
                    </div>

                </div>

                {/* Reactions Display */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="absolute -bottom-2 right-0 bg-surface border border-white/10 rounded-full px-1.5 py-0.5 flex gap-0.5 shadow-sm transform translate-y-1/2 z-10">
                        {Array.from(new Set(message.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                            <span key={i} className="text-xs">{emoji}</span>
                        ))}
                        <span className="text-[10px] text-gray-400 ml-1 font-medium leading-4">
                            {message.reactions.length}
                        </span>
                    </div>
                )}

                {/* Reaction Picker Trigger */}
                <div className={`absolute top-0 ${isSelf ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col gap-1 items-center`}>
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                            className="text-gray-400 hover:text-white"
                            title="React"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                        </button>

                        {/* Picker Popover */}
                        {showPicker && (
                            <div className="absolute bottom-full mb-2 -left-2 bg-surface border border-white/10 rounded-xl shadow-xl flex gap-1 p-2 transform -translate-x-1/2 z-50 animate-in fade-in zoom-in-50 duration-200">
                                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReact && onReact(emoji);
                                            setShowPicker(false);
                                        }}
                                        className="hover:scale-125 transition-transform p-1 text-lg"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reply Option */}
                    {onReply && message.type !== 'deleted' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReply(); }}
                            className="text-gray-400 hover:text-primary mt-1"
                            title="Reply"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                        </button>
                    )}

                    {/* Delete Option (only for self) */}
                    {isSelf && onDelete && message.type !== 'deleted' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete for everyone?')) onDelete(); }}
                            className="text-gray-400 hover:text-red-400 mt-1"
                            title="Delete for Everyone"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
