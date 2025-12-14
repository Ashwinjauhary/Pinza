import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { type User, type Message, type Status, type Room } from '../types';
import { API_URL } from '../config';

const SOCKET_URL = API_URL || window.location.origin;

export const useChat = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('pingza_user');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('Failed to parse user from local storage');
            return null;
        }
    });

    const [rooms, setRooms] = useState<Room[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);

    const [messages, setMessages] = useState<Message[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const [currentConversationId, setCurrentConversationId] = useState<string>('global');
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Call State
    const [incomingCall, setIncomingCall] = useState<{ callerId: string, callerName: string, callerAvatar: string, offer: any, isVideo: boolean } | null>(null);
    const [activeCall, setActiveCall] = useState<{ peerId: string, isVideo: boolean, isOutgoing?: boolean } | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const iceUserRef = useRef<string | null>(null); // Who we send ICE candidates to

    const cleanupCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setActiveCall(null);
        setIncomingCall(null);
        iceUserRef.current = null;
    };

    const fetchRooms = async () => {
        const token = localStorage.getItem('pingza_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/rooms/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
                if (socketRef.current) {
                    data.forEach((r: any) => socketRef.current?.emit('join_conversation', r.id));
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (currentUser) fetchRooms();
    }, [currentUser]);

    const createRoom = async (name: string, type: 'private' | 'group' | 'community' | 'channel', members: string[], parentId?: string) => {
        if (!currentUser) return;
        const res = await fetch(`${API_URL}/api/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, members, created_by: currentUser.id, parent_id: parentId })
        });
        const data = await res.json();
        if (socketRef.current) {
            socketRef.current.emit('join_conversation', data.id);
        }
        fetchRooms();
        return data;
    };

    // Auto-connect if allowed
    useEffect(() => {
        const token = localStorage.getItem('pingza_token');
        if (currentUser && token) {
            connectSocket(token);
        }
    }, [currentUser]); // Dependency on currentUser ensures we connect on load if exists

    const sendOtp = async (phone_number: string) => {
        const res = await fetch(`${API_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number })
        });
        return res.json();
    };

    const verifyOtp = async (phone_number: string, otp: string, username?: string) => {
        const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number, otp, username })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        if (data.token) {
            localStorage.setItem('pingza_token', data.token);
            localStorage.setItem('pingza_user', JSON.stringify(data.user));
            setCurrentUser(data.user);
        }
        return data;
    };

    const searchContact = async (query: string) => {
        const res = await fetch(`${API_URL}/api/contacts/search?query=${query}`);
        if (res.status === 404) return null;
        return res.json();
    };



    const updateProfile = async (username: string, avatar: string, bio?: string) => {
        const token = localStorage.getItem('pingza_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, avatar, bio })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setCurrentUser(updatedUser);
                localStorage.setItem('pingza_user', JSON.stringify(updatedUser));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Legacy login removed, use verifyOtp

    const fetchStatuses = async () => {
        try {
            const token = localStorage.getItem('pingza_token');
            if (!token) return;
            const res = await fetch(`${API_URL}/api/status/valid`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatuses(data);
            }
        } catch (e) { console.error(e); }
    };


    const joinConversation = useCallback((conversationId: string) => {
        setCurrentConversationId(conversationId);
        if (socketRef.current) {
            socketRef.current.emit('join_conversation', conversationId);
        }
    }, []);

    const connectSocket = (token: string) => {
        if (socketRef.current) return;

        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('Connected to socket');
            fetchStatuses();
        });

        newSocket.on('status_update', () => {
            fetchStatuses();
        });
        newSocket.emit('join_conversation', 'global');
        // Request history
        newSocket.emit('join_history_request');


        newSocket.on('users_update', (updatedUsers: User[]) => {
            // Filter out self? or keep self for debugging
            if (currentUser) {
                setUsers(updatedUsers.filter(u => u.id !== currentUser.id));
            } else {
                setUsers(updatedUsers);
            }
        });

        // History now needs to be filtered or re-fetched per room. 
        // For MVP, simplistic all-history is sent, we just filter in UI
        // OR we ask server for specific history.
        // Let's rely on server sending all and we filter for MVP (easiest refactor)
        newSocket.on('history', (historyMessages: Message[]) => {
            setMessages(historyMessages);
        });

        newSocket.on('receive_message', (msg: Message) => {
            setMessages(prev => {
                // Deduplication check
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        newSocket.on('message_update', (updatedMsg: Message) => {
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        });

        newSocket.on('message_deleted', (data: { id: string }) => {
            setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: '🚫 This message was deleted', type: 'text' } : m));
        });

        newSocket.on('typing_show', (data: { username: string, conversationId: string }) => {
            // Only show if in same conversation
            // Note: we need to access currentConversationId ref or state if we want to filter here
            // But for MVP, we filter in render or pass simple data
            setTypingUsers(prev => [...prev, data.username]);
        });

        newSocket.on('typing_hide', (data: { username: string }) => {
            setTypingUsers(prev => prev.filter(u => u !== data.username));
        });

        // WebRTC Handlers
        newSocket.on('call_incoming', async (data: any) => {
            setIncomingCall(data);
        });

        newSocket.on('call_accepted', async (data: any) => {
            // Remote accepted our offer
            if (!peerConnectionRef.current) return;
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setActiveCall(prev => prev ? { ...prev, peerId: data.responderId } : null);
        });

        newSocket.on('call_ice_candidate', async (data: any) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        // Read Receipts Listeners
        newSocket.on('message_status_update', (data: { messageId: string, status: 'delivered' | 'read', conversationId: string }) => {
            setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
        });

        newSocket.on('messages_read_update', (data: { conversationId: string, readBy: string }) => {
            // Set all messages in this conversation sent by ME to read
            if (currentUser) {
                setMessages(prev => prev.map(m => {
                    if (m.conversationId === data.conversationId && m.senderId === currentUser.id && m.status !== 'read') {
                        return { ...m, status: 'read' };
                    }
                    return m;
                }));
            }
        });

        newSocket.on('call_rejected', () => {
            cleanupCall();
            alert('Call rejected');
        });

        newSocket.on('call_ended', () => {
            cleanupCall();
            alert('Call ended');
        });
    };

    const startCall = async (targetUserId: string, isVideo: boolean) => {
        if (!socketRef.current) return;

        // 1. Get User Media
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setLocalStream(stream);

            // 2. Create Peer Connection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnectionRef.current = pc;
            iceUserRef.current = targetUserId;

            // 3. Add tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // 4. Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate && socketRef.current) {
                    socketRef.current.emit('call_ice_candidate', {
                        targetUserId,
                        candidate: event.candidate
                    });
                }
            };

            // 5. Handle Remote Stream
            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            // 6. Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 7. Send Invite
            socketRef.current.emit('call_invite', { targetUserId, offer, isVideo });
            setActiveCall({ peerId: targetUserId, isVideo, isOutgoing: true });

        } catch (err) {
            console.error("Failed to start call", err);
            alert("Could not access camera/microphone");
        }
    };

    const acceptCall = async () => {
        if (!incomingCall || !socketRef.current) return;
        const targetUserId = incomingCall.callerId;
        const isVideo = incomingCall.isVideo;

        try {
            // 1. Get Media
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setLocalStream(stream);

            // 2. Peer Connection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnectionRef.current = pc;
            iceUserRef.current = targetUserId;

            // 3. Add tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // 4. Set Remote Description (Offer)
            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

            // 5. ICE & Remote Stream
            pc.onicecandidate = (event) => {
                if (event.candidate && socketRef.current) {
                    socketRef.current.emit('call_ice_candidate', {
                        targetUserId,
                        candidate: event.candidate
                    });
                }
            };
            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            // 6. Create Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // 7. Send Answer
            socketRef.current.emit('call_answer', { targetUserId, answer });

            setActiveCall({ peerId: targetUserId, isVideo, isOutgoing: false });
            setIncomingCall(null);

        } catch (err) {
            console.error("Accept call failed", err);
        }
    };

    const rejectCall = () => {
        if (!incomingCall || !socketRef.current) return;
        socketRef.current.emit('call_reject', { targetUserId: incomingCall.callerId });
        setIncomingCall(null);
    };

    const endCall = () => {
        // Notify other party
        if (activeCall && socketRef.current) {
            socketRef.current.emit('call_end', { targetUserId: activeCall.peerId });
        }
        cleanupCall();
    };





    const handleTyping = () => {
        if (!socketRef.current || !currentUser) return;

        socketRef.current.emit('typing_start', { conversationId: currentConversationId, username: currentUser.username });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('typing_end', { conversationId: currentConversationId, username: currentUser.username });
        }, 2000); // Wait 2s
    };






    const sendMessage = (content: string, type: 'text' | 'image' | 'audio' | 'file' = 'text', replyToId?: string) => {
        if (!socketRef.current || !currentUser) return;

        const msg: Message = {
            id: Date.now().toString(),
            conversationId: currentConversationId,
            senderId: currentUser.id,
            content,
            timestamp: Date.now(),
            type,
            status: 'sent',
            reactions: [],
            replyToId
        };

        socketRef.current.emit('send_message', msg);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socketRef.current.emit('typing_end', { conversationId: currentConversationId, username: currentUser.username });
    };

    const sendFile = async (file: File, type: 'image' | 'audio' | 'file' = 'file') => {
        if (!socketRef.current || !currentUser) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:4000/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.url) {
                const msg: Message = {
                    id: Date.now().toString(),
                    conversationId: currentConversationId,
                    senderId: currentUser.id,
                    content: data.url,
                    timestamp: Date.now(),
                    type: type === 'image' && file.type.startsWith('image/') ? 'image' : type,
                    status: 'sent',
                    reactions: [],
                    fileName: data.filename,
                    fileSize: data.size
                };
                socketRef.current.emit('send_message', msg);
            }
        } catch (error) {
            console.error('Upload failed', error);
        }
    };

    const sendImage = async (file: File) => {
        await sendFile(file, 'image');
    };

    const reactToMessage = (messageId: string, emoji: string) => {
        if (!socketRef.current) return;
        socketRef.current.emit('add_reaction', { messageId, conversationId: currentConversationId, emoji });
    };

    const deleteMessage = (messageId: string) => {
        if (!socketRef.current) return;
        socketRef.current.emit('delete_message', { messageId, conversationId: currentConversationId });
    };

    const markRead = (conversationId: string) => {
        if (!socketRef.current || !currentUser) return;
        socketRef.current.emit('mark_read', { conversationId, userId: currentUser.id });
    };

    const markDelivered = (messageId: string) => {
        if (!socketRef.current) return;
        socketRef.current.emit('mark_delivered', messageId);
    };



    return {
        currentUser,
        users,
        messages,
        rooms,
        createRoom,
        statuses,
        fetchStatuses,
        sendMessage,
        sendFile,
        sendImage,
        joinConversation,
        sendOtp,
        verifyOtp,
        currentConversationId,
        typingUsers,
        onTyping: handleTyping,
        onReact: (id: string, emoji: string) => socketRef.current?.emit('message_reaction', { messageId: id, emoji, userId: currentUser?.id }),
        onDelete: (id: string) => socketRef.current?.emit('message_delete', { messageId: id }),
        updateProfile,
        searchContact,
        connectSocket,
        reactToMessage,
        deleteMessage,
        markRead,
        markDelivered,
        handleTyping,
        // WebRTC
        callState: { incomingCall, activeCall, localStream, remoteStream },
        startCall,
        acceptCall,
        rejectCall,
        endCall
    };
};
