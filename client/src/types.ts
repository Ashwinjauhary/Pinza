export interface User {
    id: string;
    phone_number: string;
    username: string;
    avatar: string;
    socketId?: string;
    isOnline?: boolean;
    bio?: string;
}

export interface Reaction {
    userId: string;
    emoji: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string; // Text content or File URL
    timestamp: number;
    type: 'text' | 'image' | 'audio' | 'file' | 'deleted';
    status: 'sent' | 'delivered' | 'read';
    reactions: Reaction[];
    fileName?: string;
    fileSize?: number;
    duration?: number; // For audio in seconds
    replyToId?: string;
    replyToMessage?: {
        id: string;
        content: string;
        type: 'text' | 'image' | 'audio' | 'file' | 'deleted';
        senderName?: string;
    };
}

export interface ChatState {
    currentUser: User | null;
    selectedUser: User | null; // For 1-on-1 chat
    users: User[];
    messages: Message[];
}

export interface Status {
    id: string;
    userId: string;
    type: 'text' | 'image' | 'video';
    content: string;
    caption?: string;
    background?: string;
    timestamp: number;
    expiresAt: number;
}

export interface Room {
    id: string;
    name: string;
    type: 'private' | 'group' | 'community' | 'channel';
    created_by: string;
    created_at: number;
    parent_id?: string;
    members?: string[]; // IDs
}
