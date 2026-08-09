"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send, 
  Phone, 
  Video,
  Check,
  CheckCheck,
  ArrowLeft,
  Bot,
  Loader2,
  AlertCircle
} from 'lucide-react';
import apiClient from "@/lib/api-client";

type BackendMessage = {
  id: string;
  store_id: string;
  customer_phone: string;
  message_text: string;
  is_from_customer: boolean;
  timestamp: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'them' | 'bot';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
};

type Chat = {
  id: string; // phone number or bot
  name: string;
  phone: string;
  avatar: string;
  unread: number;
  isOnline: boolean;
  messages: Message[];
};

export default function WhatsAppHubPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMessages() {
      try {
        const msgs = await apiClient.get<BackendMessage[]>("/api/whatsapp/");
        
        const chatsMap = new Map<string, Chat>();
        
        msgs.forEach(m => {
           if (!chatsMap.has(m.customer_phone)) {
              chatsMap.set(m.customer_phone, {
                 id: m.customer_phone,
                 name: m.customer_phone,
                 phone: m.customer_phone,
                 avatar: m.customer_phone.substring(0, 2).toUpperCase() || "CU",
                 unread: 0,
                 isOnline: false,
                 messages: []
              });
           }
           const d = new Date(m.timestamp);
           chatsMap.get(m.customer_phone)!.messages.push({
               id: m.id,
               text: m.message_text,
               sender: m.is_from_customer ? "them" : "me",
               timestamp: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               status: 'read'
           });
        });

        setChats(Array.from(chatsMap.values()));
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load messages");
        console.error("Failed to load WhatsApp messages:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId);
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Handle window resize for mobile view
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    // Mark as read
    setChats(chats.map(chat => chat.id === id ? { ...chat, unread: 0 } : chat));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const newMsgText = newMessage;
    setNewMessage("");

    // Optimistic UI update
    const tempId = `m${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      text: newMsgText,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setChats(chats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMsg]
        };
      }
      return chat;
    }));

    try {
       if (activeChatId !== "bot") {
         await apiClient.post<any>("/api/whatsapp/", {
            customer_phone: activeChatId,
            message_text: newMsgText,
            is_from_customer: false
         });
       }
       
       // Mark delivered/read
       setTimeout(() => {
          setChats(prevChats => prevChats.map(chat => {
            if (chat.id === activeChatId) {
              const updatedMessages = chat.messages.map(m => 
                m.id === tempId ? { ...m, status: 'read' as const } : m
              );
              return { ...chat, messages: updatedMessages };
            }
            return chat;
          }));
       }, 500);

    } catch (err: any) {
       alert("Failed to send message: " + err.message);
    }
  };

  const MessageStatus = ({ status }: { status: Message['status'] }) => {
    switch(status) {
      case 'sent': return <Check className="w-3.5 h-3.5 text-slate-400" />;
      case 'delivered': return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'read': return <CheckCheck className="w-3.5 h-3.5 text-brand-green" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex overflow-hidden glass-panel">
      {/* Sidebar - Chat List */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border-default bg-bg-surface transition-all ${isMobileView && activeChatId ? 'hidden' : 'flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border-default bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-text-primary text-lg">WhatsApp Hub</h2>
          <div className="flex items-center gap-2 text-text-secondary">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border-default">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-transparent focus:bg-white border focus:border-brand-green rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            return (
              <div 
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border-default/50 ${activeChatId === chat.id ? 'bg-brand-green/10' : 'hover:bg-slate-50/50'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-border-default flex items-center justify-center font-bold text-text-secondary text-lg overflow-hidden">
                    {chat.avatar}
                  </div>
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-text-primary truncate pr-2">{chat.name}</h3>
                    <span className={`text-xs whitespace-nowrap ${chat.unread > 0 ? 'text-brand-green font-bold' : 'text-text-muted'}`}>
                      {lastMessage?.timestamp}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                      {lastMessage?.sender === 'me' && (
                        <span className="inline-block mr-1 align-middle mb-0.5"><MessageStatus status={lastMessage.status} /></span>
                      )}
                      {lastMessage?.text}
                    </p>
                    {chat.unread > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-brand-green text-black text-[10px] font-bold flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredChats.length === 0 && (
            <div className="p-8 text-center text-text-secondary text-sm">
              No chats found for "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChat ? (
        <div className={`flex-1 flex flex-col bg-slate-50 relative ${isMobileView && !activeChatId ? 'hidden' : 'flex'}`}>
          {/* Custom WhatsApp Background Pattern Mock */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

          {/* Chat Header */}
          <div className="px-4 py-3 bg-white border-b border-border-default flex items-center justify-between z-10 shadow-sm relative">
            <div className="flex items-center gap-3">
              {isMobileView && (
                <button onClick={() => setActiveChatId(null)} className="p-1 -ml-2 mr-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5 text-text-secondary" />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-border-default flex items-center justify-center font-bold text-text-secondary shrink-0">
                {activeChat.avatar}
              </div>
              <div>
                <h3 className="font-semibold text-text-primary leading-tight">{activeChat.name}</h3>
                <p className="text-xs text-text-secondary">{activeChat.isOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-4 text-text-secondary">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"><Video className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"><Phone className="w-5 h-5" /></button>
              <span className="w-px h-6 bg-border-default hidden sm:block mx-1"></span>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Search className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 relative">
            {activeChat.messages.map((msg, index) => {
              const isMe = msg.sender === 'me';
              const isBot = msg.sender === 'bot';
              
              const showDate = index === 0;

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center mb-4 mt-2">
                      <span className="bg-white/80 backdrop-blur-sm text-text-secondary text-xs px-3 py-1 rounded-lg border border-border-default shadow-sm font-medium">
                        TODAY
                      </span>
                    </div>
                  )}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 pb-6 pt-2 shadow-sm border border-border-default ${
                      isMe 
                        ? 'bg-[#e8fce8] rounded-tr-none' 
                        : isBot
                          ? 'bg-brand-green/5 rounded-tl-none'
                          : 'bg-white rounded-tl-none'
                    }`}>
                      {isBot && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3.5 h-3.5 text-brand-green" />
                          <span className="text-xs font-bold text-brand-green">Green Quant Assistant</span>
                        </div>
                      )}
                      
                      <p className="text-text-primary text-[14.5px] leading-[22px] whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                      
                      <div className="absolute right-2 bottom-1 flex items-center gap-1">
                        <span className="text-[10px] text-text-muted font-medium select-none">
                          {msg.timestamp}
                        </span>
                        {isMe && (
                          <MessageStatus status={msg.status} />
                        )}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-border-default px-4 py-3 flex items-end gap-2 z-10 relative">
            <button className="p-2.5 text-text-secondary hover:text-text-primary transition-colors shrink-0">
              <Smile className="w-6 h-6" />
            </button>
            <button className="p-2.5 text-text-secondary hover:text-text-primary transition-colors shrink-0 hidden sm:block">
              <Paperclip className="w-5 h-5 transform -rotate-45" />
            </button>
            
            <form onSubmit={handleSendMessage} className="flex-1 bg-slate-50 rounded-lg flex items-center border border-border-default focus-within:border-brand-green transition-colors shadow-sm overflow-hidden min-h-[44px]">
              <textarea 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message"
                className="w-full bg-transparent px-4 py-2.5 text-sm text-text-primary outline-none resize-none max-h-32"
                rows={1}
                style={{ minHeight: '44px' }}
              />
            </form>
            
            {newMessage.trim() ? (
              <button 
                onClick={handleSendMessage}
                className="p-3 bg-brand-green text-black rounded-full hover:bg-brand-green/90 transition-colors shadow-sm shrink-0 flex items-center justify-center h-[44px] w-[44px]"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button className="p-3 text-text-secondary hover:text-text-primary transition-colors shrink-0 h-[44px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="24" height="24" className="w-6 h-6">
                  <path fill="currentColor" d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zM8.995 8.548c0-1.657 1.344-3 3.004-3s3.004 1.343 3.004 3v2.862c0 1.657-1.344 3-3.004 3s-3.004-1.343-3.004-3V8.548z"></path>
                  <path fill="currentColor" d="M19.297 10.125a.999.999 0 10-1.997 0c0 2.827-2.316 5.143-5.143 5.143s-5.143-2.316-5.143-5.143a.999.999 0 10-1.997 0c0 3.737 2.852 6.812 6.505 7.098v3.237h2.52V20.21c3.653-.286 6.505-3.361 6.505-7.085z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50 text-center p-8 border-l border-border-default">
          <div className="w-48 h-48 bg-slate-100 rounded-full mb-8 flex items-center justify-center">
            <Phone className="w-24 h-24 text-text-muted opacity-50" />
          </div>
          <h2 className="text-3xl font-light text-text-primary mb-4">WhatsApp Web</h2>
          <p className="text-text-secondary max-w-md leading-relaxed">
            Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
        </div>
      )}
    </div>
  );
}
