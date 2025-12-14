import { useState } from 'react';
import { useChat } from './hooks/useChat';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { CallModal } from './components/CallModal';
import type { User } from './types';

function App() {
  const {
    currentUser,
    users,
    messages,
    typingUsers,
    currentConversationId,
    sendMessage,
    sendFile,
    handleTyping,
    joinConversation,
    rooms,
    reactToMessage,
    deleteMessage,
    // Call props
    callState,
    startCall,
    markRead,
    acceptCall,
    rejectCall,
    endCall
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelectUser = (user: User) => {
    if (!currentUser) return;
    const ids = [currentUser.id, user.id].sort();
    const conversationId = `${ids[0]}_${ids[1]}`;
    joinConversation(conversationId);
    setSidebarOpen(false);
  };

  const handleSelectGlobal = () => {
    joinConversation('global');
    setSidebarOpen(false);
  };

  if (!currentUser) {
    return <Login />;
  }

  // Filter messages for current conversation
  const currentMessages = messages.filter(m => m.conversationId === currentConversationId);

  // Derive chat title
  const isGlobal = currentConversationId === 'global';
  let chatTitle = 'Select a chat'; // Default title

  if (isGlobal) {
    chatTitle = 'Global Chat';
  } else if (currentUser && currentConversationId) {
    // Check if it's a known group/room first
    const room = rooms?.find(r => r.id === currentConversationId);

    if (room) {
      if (room.type === 'private') {
        // Resolve private name
        const otherId = room.id.split('_').find((id: string) => id !== currentUser?.id);
        const otherUser = users.find(u => u.id === otherId);
        chatTitle = otherUser ? otherUser.username : 'Private Chat';
      } else {
        // Group name
        chatTitle = room.name;
      }
    } else {
      // Fallback for direct selection (virtual room)
      if (currentConversationId.includes('_')) {
        const participantIds = currentConversationId.split('_').filter(id => id !== currentUser.id);
        const otherUserId = participantIds[0];
        const otherUser = users.find(u => u.id === otherUserId);
        chatTitle = otherUser ? otherUser.username : (otherUserId ? `User ${otherUserId}` : 'Private Chat');
      } else {
        chatTitle = 'Unknown Chat';
      }
    }
  }



  const handleStartCall = (isVideo: boolean) => {
    if (!currentConversationId || !currentConversationId.includes('_')) {
      alert("Calls only available in 1-on-1 private chats");
      return;
    }
    const otherId = currentConversationId.split('_').find(id => id !== currentUser?.id);
    if (otherId) startCall(otherId, isVideo);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-white font-sans selection:bg-primary/30 relative">

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <div className={`fixed inset-y-0 left-0 w-80 z-50 transition-transform duration-300 transform 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:relative md:translate-x-0 md:flex h-full bg-background border-r border-white/5`}>
        <Sidebar
          users={users}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onSelectGlobal={handleSelectGlobal}
          joinConversation={joinConversation}
        />
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 h-full min-w-0 flex flex-col w-full">
        <ChatArea
          messages={currentMessages}
          currentUser={currentUser}
          typingUsers={typingUsers}
          onSendMessage={sendMessage}
          onSendFile={sendFile}
          onSendImage={(file) => sendFile(file, 'image')}
          onTyping={handleTyping}
          title={chatTitle}
          onReact={reactToMessage}
          onDelete={deleteMessage}
          onMenuClick={() => setSidebarOpen(true)}
          users={users}
          onStartCall={handleStartCall}
          onMarkRead={() => currentConversationId && markRead(currentConversationId)}
        />
      </main>
      <CallModal
        callState={callState}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
      />
    </div>
  );
}

export default App;
