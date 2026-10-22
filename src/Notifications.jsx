import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';

const routes = {
  assignments: 'Tugas & Kuis',
  submissions: 'Tugas & Kuis',
  grades: 'Tugas & Kuis',
  profiles: 'Pengguna',
  forum_posts: 'Forum Diskusi',
  courses: 'Kelas & Materi',
};
const dateLabel = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Notifications({ supabase, userId, role, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const storageKey = 'belajar-bersama-notifications-read:' + userId;
  const [readIds, setReadIds] = useState([]);
  useEffect(() => {
    try { setReadIds(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { setReadIds([]); }
  }, [storageKey]);

  useEffect(() => {
    if (!supabase || !userId || !role) return;
    let alive = true;
    const poll = async () => {
      const types = role === 'admin'
        ? ['submissions', 'profiles', 'forum_posts']
        : role === 'guru'
          ? ['submissions', 'forum_posts']
          : ['assignments', 'courses', 'grades', 'forum_posts'];
      const results = await Promise.all(types.map(async (type) => {
        let q = supabase.from(type).select('*').limit(25);
        if (type === 'grades') q = q.eq('student_id', userId);
        if (type === 'submissions') q = q.neq('student_id', userId);
        if (type === 'profiles') q = q.neq('id', userId);
        if (type === 'forum_posts') q = q.neq('author_id', userId);
        const { data, error: queryError } = await q;
        return { type, data: data || [], error: queryError };
      }));
      if (!alive) return;
      const failed = results.filter(r => r.error);
      setError(failed.length ? 'Sebagian aktivitas belum bisa dimuat. Periksa izin akses Supabase.' : '');
      const next = results.flatMap(({ type, data }) => data.map(item => {
        const time = item.submitted_at || item.created_at || '';
        const title = {
          submissions: 'Jawaban tugas dikumpulkan',
          profiles: 'Pengguna baru terdaftar',
          forum_posts: 'Diskusi baru',
          assignments: 'Tugas baru tersedia',
          courses: 'Materi baru tersedia',
          grades: 'Nilai baru tersedia',
        }[type];
        const detail = type === 'profiles' ? (item.full_name || 'Pengguna baru')
          : type === 'grades' ? 'Nilai: ' + (item.score ?? '-')
          : (item.title || 'Lihat aktivitas selengkapnya');
        return { id: type + ':' + item.id, title, detail, time, route: routes[type] };
      })).sort((a,b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0,35);
      setItems(next);
    };
    poll();
    const interval = setInterval(poll, 45000);
    return () => { alive = false; clearInterval(interval); };
  }, [supabase, userId, role]);

  const unread = useMemo(() => items.filter(n => !readIds.includes(n.id)).length, [items, readIds]);
  const mark = (ids) => {
    setReadIds(old => {
      const next = [...new Set([...old, ...ids])].slice(-500);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return <div style={{position:'relative'}}>
    <button type="button" className="icon-button" title="Notifikasi" aria-label={`Notifikasi, ${unread} belum dibaca`} aria-expanded={open} onClick={() => setOpen(v => !v)} style={{position:'relative'}}>
      <Bell size={19}/>
      {unread > 0 && <span style={{position:'absolute',top:0,right:0,background:'#dc2626',color:'#fff',borderRadius:12,fontSize:10,padding:'1px 4px',minWidth:16,textAlign:'center'}}>{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <>
      <button type="button" aria-label="Tutup notifikasi" onClick={() => setOpen(false)} style={{position:'fixed',inset:0,border:0,background:'transparent',zIndex:1100,cursor:'default'}}/>
      <div role="region" aria-label="Pusat Notifikasi" style={{position:'absolute',right:0,top:'calc(100% + 12px)',zIndex:1101,width:'min(360px, calc(100vw - 32px))',maxHeight:'min(520px, 75vh)',overflowY:'auto',background:'#fff',border:'1px solid #e2e8f0',borderRadius:15,boxShadow:'0 16px 40px rgba(18,35,61,.16)',padding:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12}}>
          <strong>Pusat Notifikasi {unread > 0 ? `(${unread})` : ''}</strong>
          <button type="button" onClick={() => setOpen(false)} aria-label="Tutup"><X size={16}/></button>
        </div>
        <button type="button" disabled={!unread} onClick={() => mark(items.map(n=>n.id))} style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,border:0,background:'transparent',color:'#2563a6',cursor:'pointer',fontSize:12}}><CheckCheck size={15}/> Tandai semua dibaca</button>
        {error && <p style={{color:'#b45309',fontSize:12}}>{error}</p>}
        {!items.length && <p style={{color:'#64748b',fontSize:13}}>Belum ada aktivitas untuk ditampilkan.</p>}
        {items.map(n => <button key={n.id} type="button" onClick={() => { mark([n.id]); setOpen(false); onNavigate(n.route); }} style={{display:'block',width:'100%',textAlign:'left',padding:'12px 10px',border:'0',borderBottom:'1px solid #eef2f7',borderRadius:8,background:readIds.includes(n.id)?'#fff':'#eff6ff',cursor:'pointer',marginBottom:4}}>
          <div style={{fontWeight:700,fontSize:13,color:'#203657'}}>{!readIds.includes(n.id) && <span style={{color:'#2563eb',marginRight:5}}>●</span>}{n.title}</div>
          <div style={{fontSize:12,color:'#64748b',marginTop:4,overflowWrap:'anywhere'}}>{n.detail}</div>
          <small style={{color:'#94a3b8'}}>{dateLabel(n.time)}</small>
        </button>)}
        <p style={{fontSize:11,color:'#94a3b8',marginTop:10}}>Aktivitas diperbarui sekitar setiap 45 detik. Status dibaca tersimpan di browser ini.</p>
      </div>
    </>}
  </div>;
}
