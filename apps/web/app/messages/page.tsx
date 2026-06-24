'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';


export default function MessagesPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState<number | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    
    const fetchConversations = async () => {
      try {
        const res = await ApiClient.get<{ conversations: any[] }>('/messenger/conversations', accessToken!);
        setConversations(res.conversations || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConvos(false);
      }
    };
    
    fetchConversations();
  }, [isAuthenticated, accessToken, router]);

  useEffect(() => {
    if (!activeConversationId || !accessToken) return;
    
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await ApiClient.get<{ messages: any[] }>(`/messenger/conversations/${activeConversationId}/messages`, accessToken!);
        // Reversing to show chronological order (newest at bottom)
        setMessages((res.messages || []).reverse());
        scrollToBottom();
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    // Set initial duration from convo
    const convo = conversations.find(c => c.id === activeConversationId);
    if (convo) {
      setDisappearingDuration(convo.disappearingDuration || null);
    }
  }, [activeConversationId, accessToken, conversations]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId) return;

    const text = messageText.trim();
    setMessageText('');
    
    if (editingMessageId) {
      try {
        await ApiClient.put(`/messenger/messages/${editingMessageId}`, { encryptedContent: text }, accessToken!);
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, encryptedContent: text, isEdited: true } : m));
        setEditingMessageId(null);
      } catch (err) {
        alert('Failed to edit message');
      }
      return;
    }

    setSending(true);

    // Optimistic UI
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      senderId: user!.id,
      encryptedContent: text, // Simulating encrypted content for demo
      createdAt: new Date().toISOString(),
      sender: { profile: { displayName: user!.displayName, avatarUrl: user!.avatarUrl } }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const res = await ApiClient.post<{ message: any }>('/messenger/messages', {
        conversationId: activeConversationId,
        encryptedContent: text
      }, accessToken!);
      
      setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
    } catch (err) {
      alert('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId)); // revert
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Delete message for everyone?')) return;
    try {
      await ApiClient.delete(`/messenger/messages/${id}`, accessToken!);
      setMessages(prev => prev.filter(m => m.id !== id));
      setContextMenuId(null);
    } catch (e) {
      alert('Failed to delete message');
    }
  };

  const handleSetDuration = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === 'OFF' ? null : parseInt(e.target.value);
    try {
      await ApiClient.put(`/messenger/conversations/${activeConversationId}/disappearing`, { duration: val }, accessToken!);
      setDisappearingDuration(val);
      // Update convo list
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, disappearingDuration: val } : c));
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  if (!isAuthenticated) return null;

  const activeConvo = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        
        {/* Conversations List (Sidebar 2) */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-border-token bg-surface flex flex-col shrink-0 transition-transform ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="h-18 px-6 border-b border-border-token flex items-center shrink-0">
            <h1 className="text-xl font-black">Messages</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {loadingConvos ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-surface-hover shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 bg-surface-hover rounded"></div>
                    <div className="h-3 w-3/4 bg-surface-hover rounded"></div>
                  </div>
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-token">
                <div className="text-4xl mb-4 opacity-50">💬</div>
                <p className="font-bold">No messages yet</p>
                <p className="text-xs mt-1">When you connect with friends, your chats will appear here.</p>
              </div>
            ) : (
              conversations.map(convo => {
                const otherParticipant = convo.participants.find((p: any) => p.user.id !== user!.id)?.user;
                const title = convo.title || otherParticipant?.profile?.displayName || 'Unknown';
                const avatar = otherParticipant?.profile?.avatarUrl;
                const initial = title.slice(0, 2).toUpperCase();
                const lastMessage = convo.messages?.[0]?.encryptedContent || 'Started a conversation';

                return (
                  <div 
                    key={convo.id}
                    onClick={() => setActiveConversationId(convo.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition ${activeConversationId === convo.id ? 'bg-surface-hover border border-border-token' : 'hover:bg-surface-hover/50 border border-transparent'}`}
                  >
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="h-12 w-12 rounded-full object-cover shrink-0 border border-border-token" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center shrink-0 border border-border-token">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-primary-text truncate">{title}</p>
                      <p className="text-xs text-muted-token truncate">{lastMessage}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-background ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          {!activeConversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-24 w-24 rounded-full bg-surface border border-border-token flex items-center justify-center text-4xl shadow-xl mb-6">👋</div>
              <h2 className="text-2xl font-black mb-2">Your Messages</h2>
              <p className="text-muted-token max-w-sm">Select a conversation from the sidebar or start a new one to begin chatting.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-18 px-6 border-b border-border-token flex items-center justify-between shrink-0 bg-surface/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveConversationId(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-surface-hover transition text-muted-token" aria-label="Back">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-xs">
                      {activeConvo?.title ? activeConvo.title.slice(0, 2).toUpperCase() : activeConvo?.participants.find((p:any) => p.user.id !== user!.id)?.user.profile.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-primary-text">{activeConvo?.title || activeConvo?.participants.find((p:any) => p.user.id !== user!.id)?.user.profile.displayName}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">End-to-End Encrypted</p>
                    </div>
                  </div>
                </div>
                
                {/* Header Actions */}
                <div className="flex items-center gap-2 relative">
                  <button className="p-2 rounded-full hover:bg-surface-hover text-muted-token transition" aria-label="Voice Call">📞</button>
                  <button className="p-2 rounded-full hover:bg-surface-hover text-muted-token transition" aria-label="Video Call">📹</button>
                  <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition ${showSettings ? 'bg-surface-hover text-primary-text' : 'hover:bg-surface-hover text-muted-token'}`} aria-label="Info">ℹ️</button>
                  
                  {showSettings && (
                    <div className="absolute top-12 right-0 w-64 bg-surface border border-border-token rounded-xl shadow-lg p-4 z-20 text-sm">
                      <h4 className="font-bold text-primary-text mb-3">Chat Settings</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-token mb-1">Disappearing Messages</label>
                          <select 
                            value={disappearingDuration || 'OFF'} 
                            onChange={handleSetDuration}
                            className="w-full bg-background border border-border-token rounded-lg p-2 text-primary-text"
                          >
                            <option value="OFF">Off</option>
                            <option value={86400}>24 Hours</option>
                            <option value={604800}>7 Days</option>
                            <option value={2592000}>30 Days</option>
                            <option value={7776000}>90 Days</option>
                          </select>
                          <p className="text-[10px] text-muted-token mt-1">Messages will disappear after they are seen.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed bg-opacity-5 relative">
                {/* Background overlay for texture */}
                <div className="absolute inset-0 bg-background/90 mix-blend-overlay pointer-events-none"></div>

                {loadingMessages ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center p-12 relative z-10">
                    <div className="bg-surface px-6 py-3 rounded-2xl text-sm font-bold text-muted-token border border-border-token shadow-sm">
                      This is the beginning of your chat.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 relative z-10 pb-4">
                    {messages.filter(msg => !msg.isDeletedForEveryone).map((msg, idx, arr) => {
                      const isMe = msg.senderId === user!.id;
                      const showAvatar = !isMe && (idx === 0 || arr[idx - 1].senderId !== msg.senderId);
                      
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 relative group ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <div className="w-8 shrink-0">
                              {showAvatar && (
                                <img src={msg.sender?.profile?.avatarUrl || `https://ui-avatars.com/api/?name=${msg.sender?.profile?.displayName}`} alt="" className="h-8 w-8 rounded-full border border-border-token" />
                              )}
                            </div>
                          )}
                          
                          {/* Context Menu Trigger */}
                          {isMe && (
                            <button 
                              onClick={() => setContextMenuId(contextMenuId === msg.id ? null : msg.id)}
                              className={`p-1 opacity-0 group-hover:opacity-100 transition text-muted-token hover:text-primary-text ${contextMenuId === msg.id ? 'opacity-100' : ''}`}
                            >
                              •••
                            </button>
                          )}

                          <div className={`max-w-[75%] px-5 py-3 text-sm shadow-sm relative ${isMe ? 'bg-indigo-500 text-white rounded-2xl rounded-br-sm' : 'bg-surface border border-border-token text-primary-text rounded-2xl rounded-bl-sm'}`}>
                            {msg.encryptedContent}
                          </div>

                          {/* Context Menu */}
                          {contextMenuId === msg.id && isMe && (
                            <div className="absolute right-10 bottom-8 w-32 bg-surface border border-border-token rounded-xl shadow-lg z-30 overflow-hidden text-xs">
                              <button onClick={() => { setEditingMessageId(msg.id); setMessageText(msg.encryptedContent); setContextMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-surface-hover transition text-primary-text">Edit</button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2 hover:bg-danger-token/10 transition text-danger-token">Delete</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border-token bg-surface shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <button type="button" aria-label="Attach Media" className="p-3 text-muted-token hover:text-primary-text hover:bg-surface-hover rounded-xl transition shrink-0">
                    📎
                  </button>
                  <div className="flex-1 bg-background border border-border-token rounded-2xl flex items-center pr-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition shadow-sm overflow-hidden min-h-[48px]">
                    <textarea 
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={editingMessageId ? "Edit message..." : "Type an encrypted message..."}
                      className="w-full bg-transparent px-4 py-3 text-sm outline-none resize-none max-h-32"
                      rows={1}
                    />
                    <button type="button" aria-label="Emoji" className="p-2 text-muted-token hover:text-primary-text transition shrink-0">
                      😊
                    </button>
                  </div>
                  {messageText.trim() ? (
                    <button type="submit" disabled={sending} aria-label="Send Message" className={`p-3.5 ${editingMessageId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white rounded-xl transition shadow-md shrink-0 disabled:opacity-50`}>
                      <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                  ) : (
                    <button type="button" aria-label="Voice Note" className="p-3.5 bg-surface border border-border-token text-muted-token rounded-xl hover:bg-surface-hover hover:text-primary-text transition shadow-sm shrink-0">
                      🎤
                    </button>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
