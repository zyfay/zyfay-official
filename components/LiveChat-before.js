// components/LiveChat.js
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  // Init session ID from localStorage
  useEffect(() => {
    let id = localStorage.getItem('zy_chat_id');
    if (!id) {
      id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      localStorage.setItem('zy_chat_id', id);
    }
    setSessionId(id);

    // Check if already started
    const savedName = localStorage.getItem('zy_chat_name');
    if (savedName) {
      setName(savedName);
      setStarted(true);
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [open, messages]);

  // Subscribe to realtime messages when chat started
  useEffect(() => {
    if (!sessionId || !started) return;

    // Load existing messages
    loadMessages();

    // Subscribe to new messages via Supabase Realtime
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const msg = payload.new;
          setMessages((prev) => {
            // avoid duplicates
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender === 'admin' && !open) {
            setUnread((p) => p + 1);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [sessionId, started]);

  async function loadMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  async function startChat() {
    if (!name.trim()) return;
    localStorage.setItem('zy_chat_name', name);

    // Upsert session
    await supabase.from('chat_sessions').upsert({
      id: sessionId,
      user_name: name,
      status: 'waiting',
      last_message: 'Sesi chat dimulai',
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    // Add welcome message from system
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      sender: 'admin',
      text: `Halo ${name}! Selamat datang di ${siteName} Support. Ada yang bisa kami bantu? 👋`,
    });

    setStarted(true);
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');

    try {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender: 'user',
        text,
      });

      await supabase.from('chat_sessions').update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        status: 'waiting',
      }).eq('id', sessionId);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-4 w-80 h-[500px] bg-surface border border-border rounded-2xl shadow-glow flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">{siteName} Support</div>
                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full block" />
                  Online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>

          {!started ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-primary-glow" />
              </div>
              <p className="text-white font-semibold mb-1">Mulai Chat</p>
              <p className="text-muted text-xs mb-5">Masukkan nama kamu untuk memulai</p>
              <input
                type="text"
                placeholder="Nama kamu..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startChat()}
                className="input-field mb-3"
                autoFocus
              />
              <button onClick={startChat} className="btn-primary w-full">
                Mulai Chat <Send size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-2.5">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={msg.sender === 'user' ? 'bubble-user' : 'bubble-admin'}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  placeholder="Tulis pesan..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="input-field py-2 flex-1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary-light transition-colors flex-shrink-0"
                >
                  {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-glow flex items-center justify-center z-50 transition-all active:scale-90 btn-glow"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
