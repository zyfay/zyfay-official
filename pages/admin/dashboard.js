// pages/admin/dashboard.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  LayoutDashboard, Package, Gamepad2, MessageSquare, Wallet,
  LogOut, ExternalLink, Plus, Pencil, Trash2, X, Check,
  Loader2, Send, Upload, Image as ImageIcon, ChevronDown,
  TrendingUp, Users, ShoppingCart, DollarSign, Clock, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Search, Eye, EyeOff, Zap, Wrench, Flame, Bell, Megaphone, CalendarClock, Images, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import VoiceNotePlayer from '../../components/VoiceNotePlayer';

const TABS = [
  { id: 'overview',  label: 'Overview',   icon: LayoutDashboard },
  { id: 'orders',    label: 'Pesanan',     icon: ShoppingCart },
  { id: 'products',  label: 'Produk',      icon: Package },
  { id: 'games',     label: 'Games',       icon: Gamepad2 },
  { id: 'chat',      label: 'Live Chat',   icon: MessageSquare },
  { id: 'banner',    label: 'Banner',      icon: Images },
  { id: 'zysale',    label: 'ZySale',      icon: Flame },
  { id: 'notif',     label: 'Notifikasi',  icon: Bell },
  { id: 'settings',  label: 'Pengaturan',  icon: Wrench },
];

const STATUS_BADGE = {
  pending:    'badge-warning',
  processing: 'badge-info',
  success:    'badge-success',
  failed:     'badge-danger',
  paid:       'badge-success',
  expired:    'badge-danger',
  waiting:    'badge-warning',
  active:     'badge-success',
  resolved:   'badge-purple',
};

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function logout() {
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/admin/login');
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-primary animate-spin" />
    </div>
  );

  return (
    <>
      <Head><title>Admin | {siteName}</title></Head>
      <div className="min-h-screen bg-bg flex">

        {/* Sidebar */}
        <aside className="w-16 md:w-56 bg-surface border-r border-border flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" fill="white" />
              </div>
              <span className="font-display font-bold text-white hidden md:block">{siteName}</span>
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`sidebar-item w-full ${tab === id ? 'active' : ''}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="hidden md:block">{label}</span>
                {id === 'chat' && stats?.waiting_chats > 0 && (
                  <span className="hidden md:flex ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full items-center justify-center font-bold">
                    {stats.waiting_chats}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-2 border-t border-border space-y-1">
            <Link href="/" className="sidebar-item w-full">
              <ExternalLink size={18} className="flex-shrink-0" />
              <span className="hidden md:block">Lihat Website</span>
            </Link>
            <button onClick={logout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <LogOut size={18} className="flex-shrink-0" />
              <span className="hidden md:block">Keluar</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {tab === 'overview'  && <OverviewTab stats={stats} onRefresh={fetchStats} />}
            {tab === 'orders'    && <OrdersTab />}
            {tab === 'products'  && <ProductsTab />}
            {tab === 'games'     && <GamesTab />}
            {tab === 'chat'      && <ChatTab />}
            {tab === 'banner'    && <BannerTab />}
            {tab === 'zysale'    && <ZySaleTab />}
            {tab === 'notif'     && <NotifTab />}
            {tab === 'settings'  && <SettingsTab />}
          </div>
        </main>
      </div>
    </>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({ stats, onRefresh }) {
  const statCards = [
    { label: 'Total Pesanan', value: stats?.total_orders ?? 0, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Berhasil', value: stats?.success_orders ?? 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Pending', value: stats?.pending_orders ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Saldo TV', value: stats?.tv_balance !== null ? `Rp ${parseInt(stats?.tv_balance || 0).toLocaleString('id-ID')}` : '—', icon: Wallet, color: 'text-primary-glow', bg: 'bg-primary/10' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <button onClick={onRefresh} className="btn-ghost text-sm">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-muted text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {!stats?.tv_configured && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/5 flex items-start gap-3 mb-6">
          <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-400">TokoVoucher belum dikonfigurasi</p>
            <p className="text-muted mt-1">Set <code className="text-white">TOKOVOUCHER_MEMBER_CODE</code> dan <code className="text-white">TOKOVOUCHER_SECRET_KEY</code> di Vercel Environment Variables.</p>
          </div>
        </div>
      )}

      <RecentOrders />
    </div>
  );
}

function RecentOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    fetch('/api/admin/orders?limit=10', { credentials: 'include' })
      .then(r => r.json()).then(d => setOrders(d.orders || []));
  }, []);

  return (
    <div>
      <h2 className="font-display text-lg font-bold mb-3">Pesanan Terbaru</h2>
      <div className="card overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-muted">Belum ada pesanan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['ID', 'Game', 'Produk', 'Harga', 'Status', 'Tanggal'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs font-medium uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs text-primary-glow">{o.id}</td>
                    <td className="px-4 py-3 text-sm">{o.game_name}</td>
                    <td className="px-4 py-3 text-sm">{o.product_name}</td>
                    <td className="px-4 py-3 text-sm">Rp {o.product_price?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_BADGE[o.order_status] || 'badge-purple'}`}>{o.order_status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted">{new Date(o.created_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ORDERS TAB
// ============================================================
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    const res = await fetch('/api/admin/orders?limit=100', { credentials: 'include' });
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }

  async function updateStatus(id, order_status) {
    await fetch('/api/admin/orders', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status }),
    });
    toast.success('Status diperbarui');
    loadOrders();
  }

  const filtered = orders.filter(o =>
    !filter || o.id.includes(filter) || o.game_name?.toLowerCase().includes(filter.toLowerCase()) || o.user_email?.includes(filter)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Pesanan</h1>
        <button onClick={loadOrders} className="btn-ghost text-sm"><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" placeholder="Cari ID, game, email..." value={filter} onChange={e => setFilter(e.target.value)} className="input-field pl-9 py-2" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-primary mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['ID', 'User', 'Game', 'Produk', 'Harga', 'Bayar', 'Status', 'Aksi', 'Tanggal'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs font-medium uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs text-primary-glow whitespace-nowrap">{o.id}</td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[120px] truncate">{o.user_email}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{o.game_name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{o.product_name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">Rp {o.product_price?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_BADGE[o.payment_status] || 'badge-purple'}`}>{o.payment_status}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_BADGE[o.order_status] || 'badge-purple'}`}>{o.order_status}</span></td>
                    <td className="px-4 py-3">

                    {o.payment_status === 'paid' && o.order_status !== 'success' && (
  <button
    onClick={() => processTV(o.id)}
    className="text-xs bg-primary/20 text-primary-glow hover:bg-primary/30 px-2 py-1 rounded-lg transition-colors mb-1 w-full"
  >
    Proses TV
  </button>
)}
                      <select
                        value={o.order_status}
                        onChange={e => updateStatus(o.id, e.target.value)}
                          
                        className="bg-card-hover border border-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
                      >
                        {['pending','processing','success','failed'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{new Date(o.created_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Tidak ada pesanan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCTS TAB
// ============================================================
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | product object
  const [filterGame, setFilterGame] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [pRes, gRes] = await Promise.all([
      fetch('/api/admin/products', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/games', { credentials: 'include' }).then(r => r.json()),
    ]);
    setProducts(pRes.products || []);
    setGames(gRes.games || []);
    setLoading(false);
  }

  async function deleteProduct(id) {
    if (!confirm('Hapus produk ini?')) return;
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success('Produk dihapus');
    loadData();
  }

  const filtered = products.filter(p => !filterGame || p.game_id === filterGame);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Produk</h1>
        <button onClick={() => setModal('add')} className="btn-primary text-sm">
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterGame} onChange={e => setFilterGame(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
          <option value="">Semua Game</option>
          {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card p-4 flex gap-3">
              <div className="w-16 h-16 bg-card-hover rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  : <ImageIcon size={24} className="text-muted" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                <div className="text-muted text-xs mt-0.5">{p.game_name || p.category}</div>
                <div className="text-primary-glow font-bold text-sm mt-1">Rp {p.price.toLocaleString('id-ID')}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={p.is_active ? 'badge-success badge' : 'badge-danger badge'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  {p.tv_code && <span className="badge badge-purple text-xs">{p.tv_code}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => setModal(p)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-primary/20 hover:text-primary-glow transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteProduct(p.id)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada produk</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          games={games}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, games, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'topup',
    game_id: product?.game_id || '',
    game_name: product?.game_name || '',
    publisher: product?.publisher || '',
    tv_code: product?.tv_code || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    is_active: product?.is_active !== false,
    sort_order: product?.sort_order || 0,
    metadata: JSON.stringify(product?.metadata || {}),
    image_url: product?.image_url || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  function handleGameChange(gameId) {
    const g = games.find(g => g.id === gameId);
    setForm(f => ({ ...f, game_id: gameId, game_name: g?.name || '', publisher: g?.publisher || '' }));
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form.name || !form.price) return toast.error('Nama dan harga wajib diisi');
    setSaving(true);
    try {
      const payload = { ...form };
      if (imageFile) {
        payload.image_base64 = imagePreview;
        payload.image_name = imageFile.name;
      }
      if (isEdit) payload.id = product.id;

      const res = await fetch('/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan'); onSaved(); }
      else toast.error(data.message);
    } catch (e) { toast.error('Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-lg font-bold">{isEdit ? 'Edit Produk' : 'Tambah Produk'}</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Foto Produk</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors"
            >
              {imagePreview
                ? <img src={imagePreview} alt="Preview" className="h-28 object-contain mx-auto rounded-lg" />
                : <div className="py-4"><Upload size={28} className="text-muted mx-auto mb-2" /><p className="text-muted text-sm">Klik untuk upload foto</p></div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nama Produk *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="86 Diamonds" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Game</label>
              <select value={form.game_id} onChange={e => handleGameChange(e.target.value)} className="input-field">
                <option value="">— Pilih Game —</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                <option value="topup">Top Up</option>
                <option value="voucher">Voucher</option>
                <option value="item">Item</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Harga Jual (Rp) *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field" placeholder="19000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Harga Modal (Rp)</label>
              <input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} className="input-field" placeholder="16000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kode TokoVoucher</label>
              <input value={form.tv_code} onChange={e => setForm(f => ({ ...f, tv_code: e.target.value }))} className="input-field" placeholder="MLBB-86" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Urutan</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="input-field" placeholder="1" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Deskripsi</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Deskripsi opsional" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Metadata (JSON)</label>
              <input value={form.metadata} onChange={e => setForm(f => ({ ...f, metadata: e.target.value }))} className="input-field font-mono text-xs" placeholder='{"diamond":86,"bonus":0}' />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-border'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm">{form.is_active ? 'Produk Aktif' : 'Produk Nonaktif'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : <><Check size={15} /> Simpan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GAMES TAB
// ============================================================
function GamesTab() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => { loadGames(); }, []);

  async function loadGames() {
    setLoading(true);
    const res = await fetch('/api/admin/games', { credentials: 'include' });
    const data = await res.json();
    setGames(data.games || []);
    setLoading(false);
  }

  async function deleteGame(id) {
    if (!confirm('Hapus game ini? Semua produknya akan dinonaktifkan.')) return;
    await fetch(`/api/admin/games?id=${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success('Game dihapus');
    loadGames();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Manajemen Game</h1>
        <button onClick={() => setModal('add')} className="btn-primary text-sm"><Plus size={16} /> Tambah Game</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {games.map(g => (
            <div key={g.id} className="card p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-card-hover flex items-center justify-center flex-shrink-0">
                {g.image_url
                  ? <img src={g.image_url} alt={g.name} className="w-full h-full object-cover" />
                  : <Gamepad2 size={24} className="text-muted" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{g.name}</div>
                <div className="text-muted text-xs mt-0.5">{g.publisher} · {g.category}</div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className={g.is_active ? 'badge-success badge' : 'badge-danger badge'}>{g.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  {g.is_trending && <span className="badge badge-warning">Trending</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => setModal(g)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-primary/20 hover:text-primary-glow transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteGame(g.id)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {games.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted">
              <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada game</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <GameModal
          game={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadGames(); }}
        />
      )}
    </div>
  );
}

function GameModal({ game, onClose, onSaved }) {
  const isEdit = !!game;
  const [form, setForm] = useState({
    id: game?.id || '',
    name: game?.name || '',
    publisher: game?.publisher || '',
    category: game?.category || 'mobile',
    is_trending: game?.is_trending || false,
    is_active: game?.is_active !== false,
    sort_order: game?.sort_order || 0,
    fields: JSON.stringify(game?.fields || [{ name: 'user_id', label: 'User ID', placeholder: 'Masukkan User ID' }]),
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(game?.image_url || null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form.name || (!isEdit && !form.id)) return toast.error('ID dan Nama wajib diisi');
    setSaving(true);
    try {
      let parsedFields;
      try { parsedFields = JSON.parse(form.fields); } catch { return toast.error('Format fields JSON tidak valid'); }
      const payload = { ...form, fields: parsedFields };
      if (imageFile) { payload.image_base64 = imagePreview; payload.image_name = imageFile.name; }

      const res = await fetch('/api/admin/games', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? 'Game diperbarui' : 'Game ditambahkan'); onSaved(); }
      else toast.error(data.message);
    } catch (e) { toast.error('Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-lg font-bold">{isEdit ? 'Edit Game' : 'Tambah Game'}</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors">
            {imagePreview
              ? <img src={imagePreview} alt="Preview" className="h-24 object-contain mx-auto rounded-lg" />
              : <div className="py-3"><Upload size={24} className="text-muted mx-auto mb-2" /><p className="text-muted text-sm">Upload cover game</p></div>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />

          <div className="grid grid-cols-2 gap-3">
            {!isEdit && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">ID Game *</label>
                <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase() }))} className="input-field" placeholder="mlbb" />
                <p className="text-muted text-xs mt-1">Huruf kecil, tanpa spasi (contoh: mlbb, ff)</p>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nama Game *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Mobile Legends" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Publisher</label>
              <input value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} className="input-field" placeholder="Moonton" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                <option value="mobile">Mobile</option>
                <option value="pc">PC</option>
                <option value="console">Console</option>
                <option value="voucher">Voucher</option>
                <option value="steam">Steam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Urutan</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Form Fields (JSON)</label>
              <textarea value={form.fields} onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} className="input-field h-20 font-mono text-xs resize-none" />
              <p className="text-muted text-xs mt-1">Format: [{`{"name":"user_id","label":"User ID","placeholder":"..."}`}]</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-border'}`}>
                <div className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm">Aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, is_trending: !f.is_trending }))} className={`w-10 h-5 rounded-full transition-colors ${form.is_trending ? 'bg-amber-500' : 'bg-border'}`}>
                <div className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${form.is_trending ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm">Trending</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : <><Check size={15} /> Simpan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHAT TAB — Realtime via Supabase
// ============================================================
function ChatTab() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef();
  const bottomRef = useRef();

  useEffect(() => {
    loadSessions();
    // Subscribe to new sessions
    const ch = supabase
      .channel('admin-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, loadSessions)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    // Subscribe to new messages in selected session
    const ch = supabase
      .channel(`admin-msgs-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `session_id=eq.${selected.id}`,
      }, payload => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selected?.id]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  async function loadSessions() {
    const res = await fetch('/api/admin/chats', { credentials: 'include' });
    const data = await res.json();
    setSessions(data.sessions || []);
  }

  async function loadMessages(sessionId) {
    const res = await fetch(`/api/admin/chats?session_id=${sessionId}`, { credentials: 'include' });
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function sendReply() {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply('');
    try {
      await fetch('/api/admin/chats', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selected.id, text }),
      });
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSendImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selected) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Ukuran gambar maksimal 8MB'); return; }
    setUploadingImg(true);
    try {
      const base64 = await fileToBase64(file);
      const upRes = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_base64: base64, file_name: file.name, kind: 'image' }),
      });
      const upData = await upRes.json();
      if (!upData.success) throw new Error(upData.message);

      await fetch('/api/admin/chats', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selected.id, message_type: 'image', media_url: upData.url }),
      });
    } catch (e) {
      toast.error('Gagal mengirim gambar');
    } finally {
      setUploadingImg(false);
    }
  }

  async function resolveChat(sessionId) {
    await fetch('/api/admin/chats', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, status: 'resolved' }),
    });
    toast.success('Chat diselesaikan');
    loadSessions();
    if (selected?.id === sessionId) setSelected(null);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Live Chat</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)] md:h-[600px]">
        {/* Session list — disembunyikan di mobile kalau ada sesi yang lagi dibuka */}
        <div className={`card overflow-hidden ${selected ? 'hidden md:flex' : 'flex'} flex-col`}>
          <div className="p-3 border-b border-border text-sm font-semibold flex items-center justify-between">
            <span>Sesi ({sessions.length})</span>
            <button onClick={loadSessions} className="text-muted hover:text-white"><RefreshCw size={14} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">Belum ada chat</div>
            ) : sessions.map(s => (
              <div
                key={s.id}
                onClick={() => { setSelected(s); loadMessages(s.id); }}
                className={`p-3 border-b border-border cursor-pointer hover:bg-card-hover transition-colors ${selected?.id === s.id ? 'bg-primary/10 border-primary/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{s.user_name || 'Guest'}</span>
                  <span className={`badge ${STATUS_BADGE[s.status] || 'badge-purple'} text-[10px]`}>{s.status}</span>
                </div>
                <p className="text-muted text-xs truncate">{s.last_message || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window — di mobile cuma nongol kalau ada sesi yang dipilih */}
        <div className={`md:col-span-2 card overflow-hidden ${selected ? 'flex' : 'hidden md:flex'} flex-col`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p>Pilih sesi untuk membalas</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setSelected(null)} className="md:hidden text-muted hover:text-white flex-shrink-0 p-1 -ml-1">
                    <ArrowLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{selected.user_name || 'Guest'}</div>
                    <div className="text-muted text-xs font-mono truncate">{selected.id}</div>
                  </div>
                </div>
                <button onClick={() => resolveChat(selected.id)}
                  className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0">
                  <CheckCircle size={13} /> Selesaikan
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-2.5">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={msg.sender === 'admin' ? 'bubble-user' : 'bubble-admin'}>
                      {msg.message_type === 'image' && msg.media_url ? (
                        <img
                          src={msg.media_url}
                          alt="Gambar"
                          className="max-w-[200px] rounded-lg cursor-pointer"
                          onClick={() => window.open(msg.media_url, '_blank')}
                        />
                      ) : msg.message_type === 'audio' && msg.media_url ? (
                        <VoiceNotePlayer src={msg.media_url} />
                      ) : (
                        <div>{msg.text}</div>
                      )}
                      <div className="text-[10px] opacity-50 mt-1 text-right">
                        {msg.sender === 'admin' ? 'Admin' : selected.user_name} · {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSendImage} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImg}
                  className="w-10 h-10 bg-card-hover rounded-xl flex items-center justify-center text-muted hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                  title="Kirim gambar"
                >
                  {uploadingImg ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={16} />}
                </button>
                <input
                  type="text"
                  placeholder="Tulis balasan..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()}
                  className="input-field flex-1 py-2"
                />
                <button onClick={sendReply} disabled={!reply.trim() || sending}
                  className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary-light transition-colors flex-shrink-0">
                  {sending ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS TAB — Maintenance Mode
// ============================================================
function SettingsTab() {
  const [settings, setSettings] = useState({ enabled: false, message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSettings({ enabled: !!data.enabled, message: data.message || '' });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function toggle() {
    setSaving(true);
    const next = !settings.enabled;
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next, message: settings.message }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings({ enabled: data.enabled, message: data.message });
        toast.success(next ? 'Maintenance mode diaktifkan' : 'Maintenance mode dimatikan');
      } else toast.error(data.message || 'Gagal mengubah status');
    } catch (e) { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  }

  async function saveMessage() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: settings.message }),
      });
      const data = await res.json();
      if (data.success) toast.success('Pesan maintenance disimpan');
      else toast.error(data.message || 'Gagal menyimpan');
    } catch (e) { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Pengaturan</h1>

      <div className="card p-5 max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold flex items-center gap-2">
              Mode Maintenance
              {settings.enabled && <span className="badge badge-danger">Aktif</span>}
            </div>
            <p className="text-muted text-sm mt-1">
              Saat aktif, pengunjung akan melihat halaman maintenance. Admin tetap bisa akses dashboard ini seperti biasa.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={toggle}
            className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.enabled ? 'bg-primary' : 'bg-border'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium mb-1.5">Pesan untuk Pengunjung</label>
          <textarea
            value={settings.message}
            onChange={e => setSettings(s => ({ ...s, message: e.target.value }))}
            className="input-field h-24 resize-none"
            placeholder="Website sedang dalam maintenance. Mohon kembali lagi nanti."
          />
          <button onClick={saveMessage} disabled={saving} className="btn-primary text-sm mt-3">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : <><Check size={15} /> Simpan Pesan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ZYSALE TAB — Flash Sale management
// ============================================================
function ZySaleTab() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | sale object

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [sRes, pRes] = await Promise.all([
      fetch('/api/admin/flash-sales', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/products', { credentials: 'include' }).then(r => r.json()),
    ]);
    setSales(sRes.flash_sales || []);
    setProducts(pRes.products || []);
    setLoading(false);
  }

  async function deleteSale(id) {
    if (!confirm('Hapus flash sale ini?')) return;
    await fetch(`/api/admin/flash-sales?id=${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success('Flash sale dihapus');
    loadData();
  }

  async function toggleActive(sale) {
    await fetch('/api/admin/flash-sales', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sale.id, product_id: sale.product_id, sale_price: sale.sale_price,
        starts_at: sale.starts_at, ends_at: sale.ends_at, is_active: !sale.is_active }),
    });
    loadData();
  }

  function statusOf(sale) {
    const now = new Date();
    const start = new Date(sale.starts_at);
    const end = new Date(sale.ends_at);
    if (!sale.is_active) return { label: 'Nonaktif', cls: 'badge-danger' };
    if (now < start) return { label: 'Terjadwal', cls: 'badge-purple' };
    if (now > end) return { label: 'Berakhir', cls: 'badge-danger' };
    return { label: 'Berlangsung', cls: 'badge-success' };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">ZySale — Flash Sale</h1>
        <button onClick={() => setModal('add')} className="btn-primary text-sm">
          <Plus size={16} /> Tambah Flash Sale
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sales.map(s => {
            const st = statusOf(s);
            const p = s.products;
            return (
              <div key={s.id} className="card p-4">
                <div className="flex gap-3">
                  <div className="w-14 h-14 bg-card-hover rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {s.image_url
                      ? <img src={s.image_url} alt={p?.name} className="w-full h-full object-cover" />
                      : <ImageIcon size={20} className="text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{p?.name || 'Produk dihapus'}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-primary-glow font-bold text-sm">Rp {s.sale_price.toLocaleString('id-ID')}</span>
                      {p && <span className="text-muted/60 text-xs line-through">Rp {p.price.toLocaleString('id-ID')}</span>}
                    </div>
                    <span className={st.cls + ' badge mt-1.5 inline-block'}>{st.label}</span>
                  </div>
                </div>
                <div className="text-muted text-xs mt-3 flex items-center gap-1.5">
                  <CalendarClock size={12} />
                  {new Date(s.starts_at).toLocaleString('id-ID')} — {new Date(s.ends_at).toLocaleString('id-ID')}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => toggleActive(s)} className="btn-secondary flex-1 text-xs py-2">
                    {s.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button onClick={() => setModal(s)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-primary/20 hover:text-primary-glow transition-colors flex-shrink-0">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteSale(s.id)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {sales.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted">
              <Flame size={40} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada flash sale</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <FlashSaleModal
          sale={modal === 'add' ? null : modal}
          products={products}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
        />
      )}
    </div>
  );
}

function toLocalInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FlashSaleModal({ sale, products, onClose, onSaved }) {
  const isEdit = !!sale;
  const [form, setForm] = useState({
    product_id: sale?.product_id || '',
    sale_price: sale?.sale_price || '',
    starts_at: toLocalInputValue(sale?.starts_at) || toLocalInputValue(new Date().toISOString()),
    ends_at: toLocalInputValue(sale?.ends_at) || '',
    is_active: sale?.is_active !== false,
    image_url: sale?.image_url || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(sale?.image_url || '');
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find(p => p.id === form.product_id);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.product_id || !form.sale_price || !form.starts_at || !form.ends_at) {
      toast.error('Lengkapi semua field'); return;
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast.error('Waktu selesai harus setelah waktu mulai'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      };
      if (imageFile) {
        payload.image_base64 = await fileToBase64(imageFile);
        payload.image_name = imageFile.name;
      }
      const res = await fetch('/api/admin/flash-sales', {
        method: isEdit ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...payload, id: sale.id } : payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? 'Flash sale diperbarui' : 'Flash sale ditambahkan'); onSaved(); }
      else toast.error(data.message || 'Gagal menyimpan');
    } catch (e) { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-bold text-lg">{isEdit ? 'Edit Flash Sale' : 'Tambah Flash Sale'}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Foto Flash Sale</label>
            <label className="block aspect-video bg-card-hover rounded-xl overflow-hidden cursor-pointer flex items-center justify-center border border-dashed border-border hover:border-primary/50 transition-colors">
              {preview
                ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                : <div className="text-muted text-xs flex flex-col items-center gap-1"><Upload size={20} /> Upload foto khusus flash sale</div>}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <p className="text-muted text-xs mt-1">Foto ini terpisah dari foto produk aslinya</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Produk</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="input-field" required>
              <option value="">Pilih produk</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — Rp {p.price.toLocaleString('id-ID')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Harga Flash Sale (Rp)</label>
            <input
              type="number" value={form.sale_price}
              onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
              className="input-field" required
            />
            {selectedProduct && form.sale_price && (
              <p className="text-muted text-xs mt-1">
                Harga normal Rp {selectedProduct.price.toLocaleString('id-ID')}
                {Number(form.sale_price) < selectedProduct.price &&
                  ` · Diskon ${Math.round((1 - form.sale_price / selectedProduct.price) * 100)}%`}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Mulai</label>
              <input type="datetime-local" value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selesai</label>
              <input type="datetime-local" value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="input-field text-sm" required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm">Aktif</span>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Check size={16} /> Simpan</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// NOTIFIKASI TAB — Broadcast notifications management
// ============================================================
function NotifTab() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/notifications', { credentials: 'include' }).then(r => r.json());
    setNotifs(res.notifications || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Judul wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Notifikasi dikirim ke semua pengunjung');
        setForm({ title: '', message: '', type: 'info' });
        setModal(false);
        load();
      } else toast.error(data.message || 'Gagal mengirim');
    } catch (e) { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  }

  async function toggleActive(n) {
    await fetch('/api/admin/notifications', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id, is_active: !n.is_active }),
    });
    load();
  }

  async function deleteNotif(id) {
    if (!confirm('Hapus notifikasi ini untuk semua pengunjung?')) return;
    await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success('Notifikasi dihapus');
    load();
  }

  const typeBadge = { info: 'badge-purple', promo: 'badge-success', system: 'badge-warning' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Notifikasi</h1>
        <button onClick={() => setModal(true)} className="btn-primary text-sm">
          <Plus size={16} /> Kirim Notifikasi
        </button>
      </div>
      <p className="text-muted text-sm mb-6 -mt-4">
        Notifikasi ini tampil di ikon lonceng semua pengunjung situs.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.id} className="card p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-card-hover rounded-lg flex items-center justify-center flex-shrink-0">
                <Megaphone size={16} className="text-primary-glow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <span className={typeBadge[n.type] || 'badge-purple'}>{n.type}</span>
                  {!n.is_active && <span className="badge badge-danger">Nonaktif</span>}
                </div>
                {n.message && <p className="text-muted text-sm mt-1">{n.message}</p>}
                <p className="text-muted/60 text-xs mt-1.5">{new Date(n.created_at).toLocaleString('id-ID')}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => toggleActive(n)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-primary/20 hover:text-primary-glow transition-colors" title={n.is_active ? 'Sembunyikan' : 'Tampilkan'}>
                  {n.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => deleteNotif(n.id)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Hapus">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {notifs.length === 0 && (
            <div className="text-center py-12 text-muted">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada notifikasi terkirim</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display font-bold text-lg">Kirim Notifikasi Baru</h3>
              <button type="button" onClick={() => setModal(false)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Promo spesial hari ini!" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pesan</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="input-field h-20 resize-none" placeholder="Detail pesan (opsional)" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipe</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                  <option value="info">Info</option>
                  <option value="promo">Promo</option>
                  <option value="system">Sistem</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : <><Bell size={16} /> Kirim</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BANNER TAB — Homepage carousel management
// ============================================================
function BannerTab() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | banner object

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/banners', { credentials: 'include' }).then(r => r.json());
    setBanners(res.banners || []);
    setLoading(false);
  }

  async function deleteBanner(id) {
    if (!confirm('Hapus banner ini?')) return;
    await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success('Banner dihapus');
    load();
  }

  async function toggleActive(b) {
    await fetch('/api/admin/banners', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, title: b.title, subtitle: b.subtitle, link_url: b.link_url,
        button_label: b.button_label, sort_order: b.sort_order, image_url: b.image_url, is_active: !b.is_active }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Banner Beranda</h1>
        <button onClick={() => setModal('add')} className="btn-primary text-sm">
          <Plus size={16} /> Tambah Banner
        </button>
      </div>
      <p className="text-muted text-sm mb-6 -mt-4">
        Kalau tidak ada banner aktif, halaman utama otomatis menampilkan game trending sebagai carousel.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {banners.map(b => (
            <div key={b.id} className="card overflow-hidden">
              <div className="aspect-video bg-card-hover flex items-center justify-center">
                {b.image_url
                  ? <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  : <ImageIcon size={24} className="text-muted" />}
              </div>
              <div className="p-4">
                <div className="font-semibold text-sm truncate">{b.title || '(Tanpa judul)'}</div>
                {b.subtitle && <div className="text-muted text-xs mt-0.5 truncate">{b.subtitle}</div>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={b.is_active ? 'badge-success badge' : 'badge-danger badge'}>{b.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  <span className="text-muted text-xs">Urutan: {b.sort_order}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => toggleActive(b)} className="btn-secondary flex-1 text-xs py-2">
                    {b.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button onClick={() => setModal(b)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-primary/20 hover:text-primary-glow transition-colors flex-shrink-0">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteBanner(b.id)} className="w-8 h-8 bg-card-hover rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted">
              <Images size={40} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada banner ditambahkan</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <BannerModal
          banner={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

function BannerModal({ banner, onClose, onSaved }) {
  const isEdit = !!banner;
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    link_url: banner?.link_url || '',
    button_label: banner?.button_label || 'MULAI',
    sort_order: banner?.sort_order || 0,
    is_active: banner?.is_active !== false,
    image_url: banner?.image_url || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(banner?.image_url || '');
  const [saving, setSaving] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEdit && !imageFile) { toast.error('Upload gambar banner dulu'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (imageFile) {
        payload.image_base64 = await fileToBase64(imageFile);
        payload.image_name = imageFile.name;
      }
      const res = await fetch('/api/admin/banners', {
        method: isEdit ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...payload, id: banner.id } : payload),
      });
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? 'Banner diperbarui' : 'Banner ditambahkan'); onSaved(); }
      else toast.error(data.message || 'Gagal menyimpan');
    } catch (e) { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-bold text-lg">{isEdit ? 'Edit Banner' : 'Tambah Banner'}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gambar Banner</label>
            <label className="block aspect-video bg-card-hover rounded-xl overflow-hidden cursor-pointer flex items-center justify-center border border-dashed border-border hover:border-primary/50 transition-colors">
              {preview
                ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                : <div className="text-muted text-xs flex flex-col items-center gap-1"><Upload size={20} /> Upload gambar</div>}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <p className="text-muted text-xs mt-1">Rasio 16:9 disarankan (mis. 1280x720px)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Judul (opsional)</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Promo Spesial" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subjudul (opsional)</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="input-field" placeholder="Diskon hingga 50%" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Link Tujuan (opsional)</label>
              <input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} className="input-field text-sm" placeholder="/topup/mlbb" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teks Tombol</label>
              <input value={form.button_label} onChange={e => setForm(f => ({ ...f, button_label: e.target.value }))} className="input-field text-sm" placeholder="MULAI" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Urutan Tampil</label>
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm">Aktif</span>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Check size={16} /> Simpan</>}
          </button>
        </div>
      </form>
    </div>
  );
}
