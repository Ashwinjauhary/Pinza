import React, { useState, useRef, useEffect } from 'react';
import { BsTrash, BsSend } from 'react-icons/bs';

interface VoiceRecorderProps {
    onRecordingComplete: (file: File) => void;
    onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onCancel }) => {
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        startRecording();
        return () => {
            stopRecording();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();

            // Timer
            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Could not access microphone", err);
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleSend = () => {
        stopRecording();
        // Tiny delay to ensure creating blob
        setTimeout(() => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const file = new File([blob], "voice_note.webm", { type: 'audio/webm' });
            onRecordingComplete(file);
        }, 200);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-4 flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 animate-fade-in">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-mono min-w-[50px]">{formatTime(duration)}</span>

            <div className="flex-1" /> {/* Spacer */}

            <button
                type="button"
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
                <BsTrash size={20} />
            </button>

            <button
                type="button"
                onClick={handleSend}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
            >
                <BsSend size={20} className="ml-0.5" />
            </button>
        </div>
    );
};
