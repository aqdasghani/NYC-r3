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
  Clock,
  ArrowLeft,
  Bot
} from 'lucide-react';

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'them' | 'bot';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
};

type Chat = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  unread: number;
  isOnline: boolean;
  messages: Message[];
};

const INITIAL_CHATS: Chat[] = [
  {
    id: "c1",
    name: "Sarah Jenkins",
    phone: "+91 98765 43211",
    avatar: "SJ",
    unread: 2,
    isOnline: true,
    messages: [
      { id: "m1", text: "Hi, I placed an order yesterday but I need to change the delivery address.", sender: "them", timestamp: "10:30 AM", status: "read" },
      { id: "m2", text: "Order #ORD-3392. Can you help?", sender: "them", timestamp: "10:31 AM", status: "read" }
    ]
  },
  {
    id: "c2",
    name: "Michael Chen",
    phone: "+91 98765 43212",
    avatar: "MC",
    unread: 0,
    isOnline: false,
    messages: [
      { id: "m1", text: "Is the Bamboo Utensil Set back in stock?", sender: "them", timestamp: "Yesterday", status: "read" },
      { id: "m2", text: "Yes! We just restocked them this morning. Would you like me to reserve one for you?", sender: "me", timestamp: "Yesterday", status: "read" },
      { id: "m3", text: "Yes please, I'll pick it up this evening.", sender: "them", timestamp: "Yesterday", status: "read" },
      { id: "m4", text: "Perfect. It's reserved under your name.", sender: "me", timestamp: "Yesterday", status: "read" },
    ]
  },
  {
    id: "c3",
    name: "EcoPack Suppliers",
    phone: "+91 98765 43213",
    avatar: "ES",
    unread: 0,
    isOnline: true,
    messages: [
      { id: "m1", text: "Your shipment #SHP-9021 is out for delivery today.", sender: "them", timestamp: "09:00 AM", status: "read" },
      { id: "m2", text: "Thank you. Our receiving team is ready.", sender: "me", timestamp: "09:15 AM", status: "read" }
    ]
  },
  {
    id: "c4",
    name: "Green Quant AI (Bot)",
    phone: "Automated Assistant",
    avatar: "🤖",
    unread: 1,
    isOnline: true,
    messages: [
      { id: "m1", text: "Hello! I noticed high traffic on the 'Reusable Water Bottle' product page.", sender: "bot", timestamp: "11:00 AM", status: "read" },
      { id: "m2", text: "Would you like me to send a promotional broadcast to customers who abandoned their carts with this item?", sender: "bot", timestamp: "11:01 AM", status: "read" }
    ]
  }
];

export default function WhatsAppHubPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("gs_whatsapp_chats");
    if (savedChats) setChats(JSON.parse(savedChats));
    else setChats(INITIAL_CHATS);
  }, []);

  // Save to localStorage whenever chats change
  useEffect(() => {
    if (chats.length > 0) localStorage.setItem("gs_whatsapp_chats", JSON.stringify(chats));
  }, [chats]);

  const [activeChatId, setActiveChatId] = useState<string | null>("c1");
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const newMsg: Message = {
      id: `m${Date.now()}`,
      text: newMessage,
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

    setNewMessage("");

    // Simulate message delivered and read
    setTimeout(() => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === activeChatId) {
          const updatedMessages = chat.messages.map(m => 
            m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m
          );
          return { ...chat, messages: updatedMessages };
        }
        return chat;
      }));
      
      setTimeout(() => {
        setChats(prevChats => prevChats.map(chat => {
          if (chat.id === activeChatId) {
            const updatedMessages = chat.messages.map(m => 
              m.id === newMsg.id ? { ...m, status: 'read' as const } : m
            );
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        }));
        
        // Simulate auto-reply
        setTimeout(() => {
          setChats(prevChats => prevChats.map(chat => {
            if (chat.id === activeChatId) {
              const replyMsg: Message = {
                id: `m${Date.now()}`,
                text: chat.id === "c4" // AI Bot
                  ? "I'm looking into that for you right now!" 
                  : "Thanks for the update. Let me know if anything else changes.",
                sender: chat.id === "c4" ? "bot" : "them",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'read'
              };
              return { 
                ...chat, 
                messages: [...chat.messages, replyMsg],
                unread: activeChatId === chat.id ? 0 : chat.unread + 1
              };
            }
            return chat;
          }));
        }, 2000);
      }, 1500);
    }, 1000);
  };

  const MessageStatus = ({ status }: { status: Message['status'] }) => {
    switch(status) {
      case 'sent': return <Check className="w-3.5 h-3.5 text-slate-400" />;
      case 'delivered': return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'read': return <CheckCheck className="w-3.5 h-3.5 text-[#0FA958]" />;
      default: return null;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
      {/* Sidebar - Chat List */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white transition-all ${isMobileView && activeChatId ? 'hidden' : 'flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">WhatsApp Hub</h2>
          <div className="flex items-center gap-2 text-slate-500">
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 border-transparent focus:bg-white border focus:border-green-500 rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition-all"
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
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-slate-50 ${activeChatId === chat.id ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-lg overflow-hidden">
                    {chat.avatar}
                  </div>
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-slate-800 truncate pr-2">{chat.name}</h3>
                    <span className={`text-xs whitespace-nowrap ${chat.unread > 0 ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
                      {lastMessage?.timestamp}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      {lastMessage?.sender === 'me' && (
                        <span className="inline-block mr-1 align-middle mb-0.5"><MessageStatus status={lastMessage.status} /></span>
                      )}
                      {lastMessage?.text}
                    </p>
                    {chat.unread > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredChats.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No chats found for "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChat ? (
        <div className={`flex-1 flex flex-col bg-[#efeae2] relative ${isMobileView && !activeChatId ? 'hidden' : 'flex'}`}>
          {/* Custom WhatsApp Background Pattern */}
          <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: '400px' }}></div>

          {/* Chat Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between z-10 shadow-sm relative">
            <div className="flex items-center gap-3">
              {isMobileView && (
                <button onClick={() => setActiveChatId(null)} className="p-1 -ml-2 mr-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                {activeChat.avatar}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 leading-tight">{activeChat.name}</h3>
                <p className="text-xs text-slate-500">{activeChat.isOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-4 text-slate-500">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"><Video className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"><Phone className="w-5 h-5" /></button>
              <span className="w-px h-6 bg-slate-200 hidden sm:block mx-1"></span>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Search className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 relative">
            {activeChat.messages.map((msg, index) => {
              const isMe = msg.sender === 'me';
              const isBot = msg.sender === 'bot';
              
              // Add date separator (mocked for visual effect)
              const showDate = index === 0;

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center mb-4 mt-2">
                      <span className="bg-white/80 backdrop-blur-sm text-slate-600 text-xs px-3 py-1 rounded-lg shadow-sm font-medium">
                        TODAY
                      </span>
                    </div>
                  )}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 pb-6 pt-2 shadow-sm ${
                      isMe 
                        ? 'bg-[#dcf8c6] rounded-tr-none' 
                        : isBot
                          ? 'bg-purple-100 rounded-tl-none border border-purple-200'
                          : 'bg-white rounded-tl-none'
                    }`}>
                      {/* Tail for bubbles */}
                      {!isMe && (
                        <svg viewBox="0 0 8 13" className={`absolute -left-2 top-0 w-2 h-3 ${isBot ? 'text-purple-100' : 'text-white'}`}>
                          <path fill="currentColor" d="M5.188 1H0v11.142l5.188-11.142z"></path>
                        </svg>
                      )}
                      {isMe && (
                        <svg viewBox="0 0 8 13" className="absolute -right-2 top-0 w-2 h-3 text-[#dcf8c6]">
                          <path fill="currentColor" d="M5.188 1H0v11.142l5.188-11.142z"></path>
                        </svg>
                      )}
                      
                      {isBot && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-bold text-purple-700">Green Quant Assistant</span>
                        </div>
                      )}
                      
                      <p className="text-[#111b21] text-[14.5px] leading-[22px] whitespace-pre-wrap word-break">
                        {msg.text}
                      </p>
                      
                      <div className="absolute right-2 bottom-1 flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-medium select-none">
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
          <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-2 z-10 relative">
            <button className="p-2.5 text-slate-500 hover:text-slate-700 transition-colors shrink-0">
              <Smile className="w-6 h-6" />
            </button>
            <button className="p-2.5 text-slate-500 hover:text-slate-700 transition-colors shrink-0 hidden sm:block">
              <Paperclip className="w-5 h-5 transform -rotate-45" />
            </button>
            
            <form onSubmit={handleSendMessage} className="flex-1 bg-white rounded-lg flex items-center border border-transparent focus-within:border-green-500 transition-colors shadow-sm overflow-hidden min-h-[44px]">
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
                className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-800 outline-none resize-none max-h-32"
                rows={1}
                style={{ minHeight: '44px' }}
              />
            </form>
            
            {newMessage.trim() ? (
              <button 
                onClick={handleSendMessage}
                className="p-3 bg-[#0FA958] text-white rounded-full hover:bg-green-600 transition-colors shadow-sm shrink-0 flex items-center justify-center h-[44px] w-[44px]"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button className="p-3 text-slate-500 hover:text-slate-700 transition-colors shrink-0 h-[44px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="24" height="24" className="w-6 h-6">
                  <path fill="currentColor" d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zM8.995 8.548c0-1.657 1.344-3 3.004-3s3.004 1.343 3.004 3v2.862c0 1.657-1.344 3-3.004 3s-3.004-1.343-3.004-3V8.548z"></path>
                  <path fill="currentColor" d="M19.297 10.125a.999.999 0 10-1.997 0c0 2.827-2.316 5.143-5.143 5.143s-5.143-2.316-5.143-5.143a.999.999 0 10-1.997 0c0 3.737 2.852 6.812 6.505 7.098v3.237h2.52V20.21c3.653-.286 6.505-3.361 6.505-7.085z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f0f2f5] text-center p-8 border-l border-slate-200">
          <div className="w-48 h-48 bg-slate-200 rounded-full mb-8 flex items-center justify-center">
            <Phone className="w-24 h-24 text-slate-400 opacity-50" />
          </div>
          <h2 className="text-3xl font-light text-slate-700 mb-4">WhatsApp Web</h2>
          <p className="text-slate-500 max-w-md leading-relaxed">
            Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
        </div>
      )}
    </div>
  );
}
