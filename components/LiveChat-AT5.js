// components/LiveChat.js
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Image as ImageIcon, Mic, Square, Trash2, ZoomIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import VoiceNotePlayer from './VoiceNotePlayer';
import { compressImage } from '../lib/imageCompress';

const MAX_RECORD_SECONDS = 60;

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl, caption }
  const [pendingAudio, setPendingAudio] = useState(null); // { blob, previewUrl }
  const [zoomImage, setZoomImage] = useState(null);
  const [prefillText, setPrefillText] = useState('');
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  // Cleanup rekaman kalau komponen unmount saat masih merekam
  useEffect(() => {
    return () => {
      clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Init session ID from localStorage
  useEffect(() => {
    let id = localStorage.getItem('zy_chat_id');
    if (!id) {
      id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      localStorage.setItem('zy_chat_id', id);
    }
    setSessionId(id);

    const savedName = localStorage.getItem('zy_chat_name');
    if (savedName) {
      setName(savedName);
      setStarted(true);
    }
  }, []);

  // Dengerin event dari halaman lain (mis. "Pesan via Chat" di Produk Lainnya)
  // buat ngisi otomatis teks pesan & buka widget-nya.
  useEffect(() => {
    function onPrefill(e) {
      setPrefillText(e.detail || '');
      setOpen(true);
    }
    window.addEventListener('zyfay:chat-prefill', onPrefill);
    return () => window.removeEventListener('zyfay:chat-prefill', onPrefill);
  }, []);

  useEffect(() => {
    if (started && prefillText) {
      setInput(prefillText);
      setPrefillText('');
    }
  }, [started, prefillText]);

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

    loadMessages();

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

    await supabase.from('chat_sessions').upsert({
      id: sessionId,
      user_name: name,
      status: 'waiting',
      last_message: 'Sesi chat dimulai',
      last_message_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      sender: 'admin',
      text: `Halo ${name}! Selamat datang di ${siteName} Support. Ada yang bisa kami bantu? 👋`,
      message_type: 'text',
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
        message_type: 'text',
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

  // ===== Gambar: pilih dulu -> preview + caption -> baru kirim =====
  function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 15MB');
      return;
    }
    setPendingImage({ file, previewUrl: URL.createObjectURL(file), caption: '' });
  }

  function cancelImage() {
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  }

  async function confirmSendImage() {
    if (!pendingImage || !sessionId) return;
    setUploading(true);
    try {
      const base64 = await compressImage(pendingImage.file, 1280, 1280, 0.8);
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_base64: base64, file_name: pendingImage.file.name.replace(/\.\w+$/, '') + '.jpg', kind: 'image' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender: 'user',
        text: pendingImage.caption.trim(),
        message_type: 'image',
        media_url: data.url,
      });
      await supabase.from('chat_sessions').update({
        last_message: '📷 Gambar',
        last_message_at: new Date().toISOString(),
        status: 'waiting',
      }).eq('id', sessionId);

      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengirim gambar');
    } finally {
      setUploading(false);
    }
  }

  // ===== Voice note: rekam -> preview -> baru kirim (bisa dibatalkan) =====
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setPendingAudio({ blob, previewUrl: URL.createObjectURL(blob) });
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(s => {
          if (s + 1 >= MAX_RECORD_SECONDS) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      toast.error('Tidak bisa mengakses mikrofon. Cek izin mikrofon browser kamu.');
    }
  }

  function stopRecording() {
    clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function cancelAudio() {
    if (pendingAudio?.previewUrl) URL.revokeObjectURL(pendingAudio.previewUrl);
    setPendingAudio(null);
  }

  async function confirmSendAudio() {
    if (!pendingAudio || !sessionId) return;
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(pendingAudio.blob);
      });
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_base64: base64, file_name: 'voice-note.webm', kind: 'audio' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender: 'user',
        text: '',
        message_type: 'audio',
        media_url: data.url,
      });
      await supabase.from('chat_sessions').update({
        last_message: '🎤 Pesan suara',
        last_message_at: new Date().toISOString(),
        status: 'waiting',
      }).eq('id', sessionId);

      URL.revokeObjectURL(pendingAudio.previewUrl);
      setPendingAudio(null);
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengirim pesan suara');
    } finally {
      setUploading(false);
    }
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  const composing = !!pendingImage || !!pendingAudio || recording;

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
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={msg.sender === 'user' ? 'bubble-user' : 'bubble-admin'}>
                      {msg.message_type === 'image' && msg.media_url ? (
                        <div>
                          <div className="relative group cursor-pointer" onClick={() => setZoomImage(msg.media_url)}>
                            <img src={msg.media_url} alt="Gambar" className="max-w-[180px] rounded-lg block" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center transition-colors">
                              <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          {msg.text && <div className="mt-1.5">{msg.text}</div>}
                        </div>
                      ) : msg.message_type === 'audio' && msg.media_url ? (
                        <VoiceNotePlayer src={msg.media_url} />
                      ) : (
                        msg.text
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted/60 mt-1 px-1">
                      {msg.sender === 'admin' && <span className="font-semibold text-primary-glow/90">Admin</span>}
                      <span>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border">
                {pendingImage ? (
                  /* ===== Preview gambar + caption sebelum kirim ===== */
                  <div className="p-3">
                    <div className="flex gap-2 bg-card-hover rounded-xl p-2 mb-2">
                      <img src={pendingImage.previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                      <textarea
                        value={pendingImage.caption}
                        onChange={e => setPendingImage(p => ({ ...p, caption: e.target.value }))}
                        placeholder="Tambahkan caption (opsional)..."
                        className="input-field flex-1 text-sm resize-none h-16 py-1.5"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={cancelImage} disabled={uploading} className="btn-secondary flex-1 text-sm py-2">
                        Batal
                      </button>
                      <button onClick={confirmSendImage} disabled={uploading} className="btn-primary flex-1 text-sm py-2">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Kirim</>}
                      </button>
                    </div>
                  </div>
                ) : pendingAudio ? (
                  /* ===== Preview voice note sebelum kirim ===== */
                  <div className="p-3">
                    <div className="bg-card-hover rounded-xl p-3 mb-2">
                      <VoiceNotePlayer src={pendingAudio.previewUrl} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={cancelAudio} disabled={uploading} className="btn-secondary flex-1 text-sm py-2">
                        <Trash2 size={14} /> Hapus
                      </button>
                      <button onClick={confirmSendAudio} disabled={uploading} className="btn-primary flex-1 text-sm py-2">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Kirim</>}
                      </button>
                    </div>
                  </div>
                ) : recording ? (
                  /* ===== Lagi merekam ===== */
                  <div className="p-3">
                    <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Merekam... {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
                      </div>
                      <button onClick={stopRecording} className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <Square size={13} className="text-white" fill="white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ===== Input normal ===== */
                  <div className="p-3 flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePickImage}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-10 h-10 bg-card-hover rounded-xl flex items-center justify-center text-muted hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                      title="Kirim gambar"
                    >
                      <ImageIcon size={17} />
                    </button>
                    <input
                      type="text"
                      placeholder="Tulis pesan..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className="input-field py-2 flex-1"
                    />
                    {input.trim() ? (
                      <button
                        onClick={sendMessage}
                        disabled={sending}
                        className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary-light transition-colors flex-shrink-0"
                      >
                        {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        disabled={uploading}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40 bg-primary hover:bg-primary-light"
                        title="Rekam pesan suara"
                      >
                        <Mic size={16} className="text-white" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Lightbox zoom foto */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={zoomImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* FAB */}
      <button
        data-livechat-trigger
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
