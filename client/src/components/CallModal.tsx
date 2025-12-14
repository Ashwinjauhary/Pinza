import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallModalProps {
    callState: {
        incomingCall: any;
        activeCall: any;
        localStream: MediaStream | null;
        remoteStream: MediaStream | null;
    };
    onAccept: () => void;
    onReject: () => void;
    onEnd: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ callState, onAccept, onReject, onEnd }) => {
    const { incomingCall, activeCall, localStream, remoteStream } = callState;
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    if (!incomingCall && !activeCall) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
            >
                {/* Incoming Call UI */}
                {incomingCall && !activeCall && (
                    <div className="flex flex-col items-center gap-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                            <img
                                src={incomingCall.callerAvatar}
                                alt="Caller"
                                className="w-32 h-32 rounded-full border-4 border-primary relative z-10"
                            />
                        </div>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-white mb-2">{incomingCall.callerName}</h2>
                            <p className="text-gray-400">Incoming {incomingCall.isVideo ? 'Video' : 'Voice'} Call...</p>
                        </div>
                        <div className="flex gap-8 mt-4">
                            <button
                                onClick={onReject}
                                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>
                            </button>
                            <button
                                onClick={onAccept}
                                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 animate-pulse"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2z" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Call UI */}
                {activeCall && (
                    <div className="w-full h-full flex flex-col relative">
                        {/* Remote Video (Full Screen) */}
                        <div className="flex-1 bg-black relative overflow-hidden rounded-2xl">
                            {remoteStream ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                                    <p>Connecting...</p>
                                </div>
                            )}

                            {/* Local Video (PIP) */}
                            {activeCall.isVideo && (
                                <div className="absolute top-4 right-4 w-32 h-48 bg-gray-900 rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/50 backdrop-blur-md px-8 py-4 rounded-full border border-white/10">
                            {/* Mute (Mock) */}
                            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                            </button>

                            {/* End Call */}
                            <button
                                onClick={onEnd}
                                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>
                            </button>

                            {/* Video Toggle (Mock) */}
                            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
