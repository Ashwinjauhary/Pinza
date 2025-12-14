import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import otpGenerator from 'otp-generator';
import { initDB, getDB } from './db';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Serve Client in Production
const clientDist = path.join(__dirname, '../public');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return res.status(404);
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});
const upload = multer({ storage });

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

interface User {
    id: string;
    phone_number: string;
    username: string;
    avatar: string;
    public_key?: string;
    socketId?: string;
}

// Extend Socket to include user info
interface AuthenticatedSocket extends Socket {
    user?: User;
}

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: number;
    type: 'text' | 'image' | 'audio' | 'file';
    status: 'sent' | 'delivered' | 'read';
    reactions: { userId: string, emoji: string }[];
    fileName?: string;
    fileSize?: number;
    duration?: number;
    replyToId?: string;
    replyToMessage?: {
        id: string;
        content: string;
        type: 'text' | 'image' | 'audio' | 'file' | 'deleted';
        senderName?: string;
    };
}

// In-memory active users for presence (DB stores registered users)
let activeUsers: { [socketId: string]: User } = {};

// Socket Middleware for Auth
io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Authentication error"));
    }
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) return next(new Error("Authentication error"));
        socket.user = decoded as User;
        next();
    });
});

io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return; // Should not happen due to middleware

    console.log(`User connected: ${user.username} (${user.id})`);

    // Join personal room for 1-1 targeted messages
    socket.join(user.id);

    activeUsers[socket.id] = { ...user, socketId: socket.id };

    // Broadcast status
    io.emit('users_update', Object.values(activeUsers));

    socket.on('join_history_request', async () => {
        // Send relevant history (only for rooms user is part of)
        const db = getDB();
        const history: Message[] = await db.all('SELECT * FROM messages ORDER BY timestamp ASC');
        // Parse reactions potentially if stored as string, but interface expects it?
        // Client expects parsed JSON for reactions? SQLite driver returns string for JSON column?
        // Let's ensure compatibility.
        // Actually, db.all returns rows. We need to map if necessary?
        // Assuming client handles it or driver handles it.
        // Let's map strict types just in case.
        const parsedHistory = history.map(h => ({
            ...h,
            reactions: typeof h.reactions === 'string' ? JSON.parse(h.reactions) : h.reactions
        }));

        socket.emit('history', parsedHistory);
    });

    socket.on('send_message', async (msg: Message) => {
        const db = getDB();
        await db.run(
            'INSERT INTO messages (id, conversationId, senderId, content, timestamp, type, status, reactions, fileName, fileSize, duration, replyToId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            msg.id, msg.conversationId, msg.senderId, msg.content, msg.timestamp, msg.type, msg.status || 'sent', JSON.stringify(msg.reactions || []), msg.fileName, msg.fileSize, msg.duration, msg.replyToId
        );

        // Populate reply message data for broadcast if exists
        let fullMsg = { ...msg };
        if (msg.replyToId) {
            const replyMsg = await db.get('SELECT id, content, type, senderId FROM messages WHERE id = ?', msg.replyToId);
            if (replyMsg) {
                const sender = await db.get('SELECT username FROM users WHERE id = ?', replyMsg.senderId);
                fullMsg.replyToMessage = {
                    ...replyMsg,
                    senderName: sender ? sender.username : 'Unknown'
                };
            }
        }

        // Determine routing
        if (msg.conversationId === 'global') {
            io.emit('receive_message', fullMsg);
        } else {
            // Check if it's a group room or private
            // Private convention: userA_userB (sorted)
            // Group convention room_UUID
            // We just emit to the room. Users must join rooms.

            // For 1-on-1 private chat using IDs:
            // The room might not exist "physically" via join() if dynamic
            // But if we enforce 'join_conversation', it works.

            // Allow sending to room OR specifically to users if it's a private pair ID
            io.to(msg.conversationId).emit('receive_message', msg);

            // Hack for MVP private chat autojoin if not joined:
            // msg.conversationId looks like "id1_id2"
            if (msg.conversationId.includes('_')) {
                const parts = msg.conversationId.split('_');
                parts.forEach(partId => {
                    // Emit to specific user's personal socket room
                    io.to(partId).emit('receive_message', msg);
                });
            }
        }
    });

    socket.on('join_conversation', (conversationId: string) => {
        socket.join(conversationId);
    });

    // ... (Typing handlers same as before, just ensure they broadcast to room or user)
    socket.on('typing_start', (data: { conversationId: string, username: string }) => {
        if (data.conversationId === 'global') {
            socket.broadcast.emit('typing_show', data);
        } else {
            socket.to(data.conversationId).emit('typing_show', data);
            // Also to private pair
            if (data.conversationId.includes('_')) {
                const parts = data.conversationId.split('_');
                parts.forEach(partId => {
                    if (partId !== user.id) io.to(partId).emit('typing_show', data);
                });
            }
        }
    });

    socket.on('typing_end', (data: { conversationId: string, username: string }) => {
        if (data.conversationId === 'global') {
            socket.broadcast.emit('typing_hide', data);
        } else {
            socket.to(data.conversationId).emit('typing_hide', data);
            if (data.conversationId.includes('_')) {
                const parts = data.conversationId.split('_');
                parts.forEach(partId => {
                    if (partId !== user.id) io.to(partId).emit('typing_hide', data);
                });
            }
        }
    });

    socket.on('add_reaction', async (data: { messageId: string, conversationId: string, emoji: string }) => {
        const db = getDB();
        const msg = await db.get('SELECT * FROM messages WHERE id = ?', data.messageId);

        if (msg) {
            let reactions = [];
            try {
                reactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || []);
            } catch (e) {
                reactions = [];
            }

            // Toggle logic
            const existingIdx = reactions.findIndex((r: any) => r.userId === user.id && r.emoji === data.emoji);
            if (existingIdx > -1) {
                reactions.splice(existingIdx, 1);
            } else {
                reactions.push({ userId: user.id, emoji: data.emoji });
            }

            await db.run('UPDATE messages SET reactions = ? WHERE id = ?', JSON.stringify(reactions), data.messageId);

            // Broadcast update
            const updatedMsg = { ...msg, reactions };

            if (data.conversationId === 'global') {
                io.emit('message_update', updatedMsg);
            } else {
                io.to(data.conversationId).emit('message_update', updatedMsg);
                if (data.conversationId.includes('_')) {
                    const parts = data.conversationId.split('_');
                    parts.forEach(partId => io.to(partId).emit('message_update', updatedMsg));
                }
            }
        }
    });
    // ...

    socket.on('delete_message', async (data: { messageId: string, conversationId: string }) => {
        const db = getDB();
        // Check ownership
        const msg = await db.get('SELECT * FROM messages WHERE id = ?', data.messageId);
        if (msg && msg.senderId === user.id) {
            // Soft delete or Hard delete?
            // "Delete for everyone" typically replaces content with "This message was deleted"
            await db.run('UPDATE messages SET content = "🚫 This message was deleted", type = "deleted" WHERE id = ?', data.messageId);

            // Broadcast delete
            const updated = { id: data.messageId, conversationId: data.conversationId, type: 'deleted' };
            if (data.conversationId === 'global') {
                io.emit('message_deleted', updated);
            } else {
                io.to(data.conversationId).emit('message_deleted', updated);
                if (data.conversationId.includes('_')) {
                    const parts = data.conversationId.split('_');
                    parts.forEach(partId => io.to(partId).emit('message_deleted', updated));
                }
            }
        }
    });

    socket.on('mark_read', async (data: { conversationId: string, userId: string }) => {
        // Mark all messages in this conversation sent by OTHER users as read
        const db = getDB();
        await db.run(
            `UPDATE messages SET status = 'read' WHERE conversationId = ? AND senderId != ? AND status != 'read'`,
            data.conversationId, data.userId
        );

        // Notify sender(s) that their messages have been read
        // Optimization: Find distinct senders or just emit to room
        if (data.conversationId === 'global') {
            io.emit('messages_read_update', { conversationId: data.conversationId, readBy: data.userId });
        } else {
            io.to(data.conversationId).emit('messages_read_update', { conversationId: data.conversationId, readBy: data.userId });
            if (data.conversationId.includes('_')) {
                const parts = data.conversationId.split('_');
                parts.forEach(partId => io.to(partId).emit('messages_read_update', { conversationId: data.conversationId, readBy: data.userId }));
            }
        }
    });

    socket.on('mark_delivered', async (messageId: string) => {
        const db = getDB();
        await db.run('UPDATE messages SET status = "delivered" WHERE id = ? AND status = "sent"', messageId);

        const msg = await db.get('SELECT * FROM messages WHERE id = ?', messageId);
        if (msg) {
            const updatePayload = { messageId, status: 'delivered', conversationId: msg.conversationId };
            // Emit to sender
            io.to(msg.senderId).emit('message_status_update', updatePayload);
            // Also emit to conversation room so sender sees it if they are in there
            io.to(msg.conversationId).emit('message_status_update', updatePayload);
        }
    });

    socket.on('update_profile', async (data: { username: string, avatar: string, bio: string }) => {
        // Socket update only? Prefer REST.
    });

    // --- WebRTC Signaling ---
    socket.on('call_invite', (data: { targetUserId: string, offer: any, isVideo: boolean }) => {
        io.to(data.targetUserId).emit('call_incoming', {
            callerId: user.id,
            callerName: user.username,
            callerAvatar: user.avatar,
            offer: data.offer,
            isVideo: data.isVideo
        });
    });

    socket.on('call_answer', (data: { targetUserId: string, answer: any }) => {
        io.to(data.targetUserId).emit('call_accepted', {
            responderId: user.id,
            answer: data.answer
        });
    });

    socket.on('call_ice_candidate', (data: { targetUserId: string, candidate: any }) => {
        io.to(data.targetUserId).emit('call_ice_candidate', {
            senderId: user.id,
            candidate: data.candidate
        });
    });

    socket.on('call_reject', (data: { targetUserId: string }) => {
        io.to(data.targetUserId).emit('call_rejected', { responderId: user.id });
    });

    socket.on('call_end', (data: { targetUserId: string }) => {
        io.to(data.targetUserId).emit('call_ended', { senderId: user.id });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete activeUsers[socket.id];
        io.emit('users_update', Object.values(activeUsers));
    });
});



app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size
    });
});

// Auth Routes

app.post('/api/auth/send-otp', async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number) return res.status(400).json({ error: "Phone number required" });

    // Generate 6 digit OTP
    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });

    // Save to DB
    const db = getDB();
    await db.run('INSERT OR REPLACE INTO otps (phone_number, otp, expires_at) VALUES (?, ?, ?)',
        phone_number, otp, Date.now() + 300000); // 5 mins

    // Mock SMS
    console.log(`[SMS-MOCK] OTP for ${phone_number}: ${otp}`);

    res.json({ success: true, message: "OTP sent (check server console)" });
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone_number, otp, username } = req.body;
    if (!phone_number || !otp) return res.status(400).json({ error: "Phone and OTP required" });

    const db = getDB();
    const otpRecord = await db.get('SELECT * FROM otps WHERE phone_number = ?', phone_number);

    if (!otpRecord) {
        console.log(`[AuthError] No OTP record found for ${phone_number}`);
        return res.status(400).json({ error: "Invalid OTP" });
    }

    if (otpRecord.otp !== otp) {
        console.log(`[AuthError] OTP mismatch for ${phone_number}: expected ${otpRecord.otp}, got ${otp}`);
        return res.status(400).json({ error: "Invalid OTP" });
    }

    if (Date.now() > otpRecord.expires_at) {
        console.log(`[AuthError] OTP expired for ${phone_number}`);
        return res.status(400).json({ error: "OTP expired" });
    }

    // Check if user exists
    let user = await db.get('SELECT * FROM users WHERE phone_number = ?', phone_number);

    if (!user) {
        // Create new user (Signup)
        if (!username) return res.status(400).json({ error: "Username required for new signup" });
        const id = uuidv4();
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

        await db.run('INSERT INTO users (id, phone_number, username, avatar, created_at) VALUES (?, ?, ?, ?, ?)',
            id, phone_number, username, avatar, Date.now());

        user = { id, phone_number, username, avatar };
    }

    // Clean up OTP
    await db.run('DELETE FROM otps WHERE phone_number = ?', phone_number);

    // Generate JWT
    const token = jwt.sign({ id: user.id, phone_number: user.phone_number, username: user.username, avatar: user.avatar }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
});

// STATUS ROUTES
app.post('/api/status/create', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const { type, content, caption, background } = req.body;

        const db = getDB();
        const id = uuidv4();
        const timestamp = Date.now();
        const expiresAt = timestamp + (24 * 60 * 60 * 1000); // 24 hours

        await db.run(
            'INSERT INTO statuses (id, userId, type, content, caption, background, timestamp, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            id, decoded.id, type, content, caption, background, timestamp, expiresAt
        );

        res.json({ success: true, id });

        // Notify contacts
        io.emit('status_update', { userId: decoded.id });
    } catch (e) {
        res.status(500).json({ error: "Failed to create status" });
    }
});

app.get('/api/status/valid', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    try {
        const db = getDB();
        const now = Date.now();
        const statuses = await db.all('SELECT * FROM statuses WHERE expiresAt > ? ORDER BY timestamp DESC', now);
        res.json(statuses);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch statuses" });
    }
});

app.put('/api/users/profile', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.id;
        const { username, avatar, bio } = req.body;

        const db = getDB();
        await db.run('UPDATE users SET username = ?, avatar = ?, bio = ? WHERE id = ?', username, avatar, bio || '', userId);

        const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', userId);
        res.json(updatedUser);

        // Notify others? Not strictly necessary for MVP but good for consistency
        // io.emit('user_updated', updatedUser); 
    } catch (e) {
        return res.status(403).json({ error: "Invalid token" });
    }
});

app.get('/api/contacts/search', async (req, res) => {
    const { query } = req.query; // Changed from phone to query
    const phone = req.query.phone as string; // Legacy support

    const searchTerm = (query as string) || phone;

    if (!searchTerm) return res.status(400).json({ error: "Query required" });

    const db = getDB();
    // Search by phone OR username (like)
    // Using LIKE for username for broader matches (Tier 3 USP: Smart Search)
    const user = await db.get(`
        SELECT id, phone_number, username, avatar, public_key 
        FROM users 
        WHERE phone_number = ? OR username LIKE ?
    `, searchTerm, `%${searchTerm}%`);

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
});

app.post('/api/rooms/create', async (req, res) => {
    const { name, type, members, created_by, parent_id } = req.body;
    // members is array of userIds
    const db = getDB();

    if (!members || members.length === 0) return res.status(400).json({ error: "Members required" });

    const roomId = type === 'private'
        ? [created_by, members[0]].sort().join('_')
        : uuidv4();

    // Check if exists
    const existing = await db.get('SELECT * FROM rooms WHERE id = ?', roomId);
    if (existing) {
        return res.json({ id: roomId, ...existing });
    }

    const roomName = name || (type === 'private' ? 'Private Chat' : 'New Group');

    await db.run('INSERT INTO rooms (id, name, type, created_by, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
        roomId, roomName, type, created_by, Date.now(), parent_id || null);

    // Add members
    const allMembers = [...members];
    if (!allMembers.includes(created_by)) allMembers.push(created_by);

    for (const uid of allMembers) {
        await db.run('INSERT OR IGNORE INTO members (room_id, user_id, joined_at) VALUES (?, ?, ?)',
            roomId, uid, Date.now());
    }

    // If creating a Community, automatically create an 'Announcements' channel
    if (type === 'community') {
        const announceId = uuidv4();
        await db.run('INSERT INTO rooms (id, name, type, created_by, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
            announceId, 'Announcements', 'channel', created_by, Date.now(), roomId);

        // Add all members to Announcements too
        for (const uid of allMembers) {
            await db.run('INSERT OR IGNORE INTO members (room_id, user_id, joined_at) VALUES (?, ?, ?)',
                announceId, uid, Date.now());
        }
    }

    res.json({ id: roomId, name: roomName, type, members: allMembers, parent_id });
});

app.get('/api/rooms/my', async (req, res) => {
    // Expect userId in query for now to enable quick MVP client usage without full auth middleware on every route (though we have it)
    // Or stick to JWT if we assume client sends Token in header? 
    // Client currently uses fetch() without standard header wrapper in all calls.
    // Let's rely on query param userId or better, verify token here properly.

    // Quick auth check:
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.id;

        const db = getDB();
        const rows = await db.all(`
            SELECT r.* 
            FROM rooms r
            JOIN members m ON r.id = m.room_id
            WHERE m.user_id = ?
        `, userId);

        res.json(rows);

    } catch (e) {
        return res.status(403).json({ error: "Invalid token" });
    }
});

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    });
} else {
    app.get('/', (req, res) => {
        res.send('Pingza Server is running (Dev Mode)');
    });
}

const PORT = process.env.PORT || 4000;

initDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
