import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Notifications from './Notifications';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, ClipboardCheck,
  FileText, BarChart3, MessageCircle, Award, Settings, LogOut, Menu,
  Plus, Search, Bell, ShieldCheck, CalendarCheck, CheckCircle2, X, Upload, Download, Trash2, UserRound, KeyRound, ChevronDown
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const menu = [
  ['Dashboard', LayoutDashboard], ['Pengguna', Users], ['Kelas & Materi', BookOpen],
  ['Tugas & Kuis', ClipboardCheck], ['Absensi', CalendarCheck], ['Forum Diskusi', MessageCircle],
  ['Laporan Akademik', BarChart3], ['Sertifikat', Award], ['Pengaturan', Settings]
];

function Brand() {
  return <div className="brand"><div className="brand-icon"><GraduationCap size={25}/></div><div><b>Belajar Bersama</b><small>LEARNING MANAGEMENT SYSTEM</small></div></div>;
}

function SetupNotice() {
  return <div className="setup"><ShieldCheck size={26}/><h2>Hubungkan database Supabase</h2>
    <p>Antarmuka LMS siap digunakan setelah konfigurasi database. Ikuti <b>README.md</b> di paket proyek untuk membuat proyek Supabase, menjalankan SQL, lalu mengisi variabel lingkungan.</p>
    <code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code>
  </div>;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (!supabase) throw new Error('Database belum dikonfigurasi. Isi file .env.local sesuai README.md.');
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } }
        });
        if (err) throw err;
        setError('Pendaftaran dikirim. Periksa email untuk verifikasi jika diaktifkan. Admin harus menetapkan peran akun dari Supabase.');
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onLogin(data.session);
      }
    } catch (e) { setError(e.message || 'Terjadi kesalahan.'); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><div className="auth-art"><Brand/><div className="art-copy"><span className="eyebrow">RUANG BELAJAR DIGITAL</span><h1>Belajar bersama,<br/>tumbuh bersama.</h1><p>Materi, kelas, tugas, dan perkembangan belajar dalam satu tempat.</p><div className="art-stats"><span><BookOpen/>Materi terpusat</span><span><Users/>Kelas kolaboratif</span><span><Award/>Progres belajar</span></div></div><div className="art-footer">Platform pembelajaran • Belajar Bersama</div></div>
    <div className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><div className="mobile-brand"><Brand/></div><span className="eyebrow">{mode === 'login' ? 'SELAMAT DATANG KEMBALI' : 'BUAT AKUN BARU'}</span><h2>{mode === 'login' ? 'Masuk ke LMS' : 'Daftar akun'}</h2><p className="muted">{mode === 'login' ? 'Masuk untuk melanjutkan kegiatan belajar.' : 'Akun baru tidak otomatis menjadi Admin atau Guru.'}</p>
      {mode === 'signup' && <label>Nama lengkap<input value={fullName} onChange={e=>setFullName(e.target.value)} required placeholder="Nama lengkap"/></label>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="nama@email.com" autoComplete="email"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="Minimal 8 karakter" autoComplete={mode==='login'?'current-password':'new-password'}/></label>
      {error && <div className="notice">{error}</div>}
      <button className="primary full" disabled={busy}>{busy?'Memproses…':mode==='login'?'Masuk':'Daftar'}</button>
      <p className="switch">{mode==='login'?'Belum punya akun?':'Sudah punya akun?'} <button type="button" className="link" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('')}}>{mode==='login'?'Daftar':'Masuk'}</button></p>
      <p className="security"><ShieldCheck size={15}/> Login memakai Supabase Auth. Jangan bagikan password.</p>
    </form></div></div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('Dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ users: 0, classes: 0, assignments: 0, attendance: 0 });
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [posts, setPosts] = useState([]);
  const [grades, setGrades] = useState([]);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileDialog, setProfileDialog] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) { setProfile(null); return; }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (alive) {
        if (error) setMessage(error.message);
        setProfile(data);
        await loadData();
      }
    })();
    return () => { alive = false; };
  }, [session]);

  async function loadData() {
    if (!supabase) return;
    const [u,c,co,a,at,p,g,sub] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,role,created_at').order('created_at',{ascending:false}).limit(100),
      supabase.from('classes').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('courses').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('assignments').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('attendance').select('*').order('date',{ascending:false}).limit(100),
      supabase.from('forum_posts').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('grades').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('submissions').select('*').order('submitted_at',{ascending:false}).limit(200)
    ]);
    setUsers(u.data||[]); setClasses(c.data||[]); setCourses(co.data||[]); setAssignments(a.data||[]);
    setAttendance(at.data||[]); setPosts(p.data||[]); setGrades(g.data||[]); setSubmissions(sub.data||[]);
    setSummary({users:u.data?.length||0,classes:c.data?.length||0,assignments:a.data?.length||0,attendance:at.data?.length||0});
  }

  async function logout() { await supabase?.auth.signOut(); setSession(null); setProfile(null); }
 
  async function createCourse(e) {
    e.preventDefault();
    if (!canManage || uploading) return;

    const fd = new FormData(e.currentTarget);
    const file = fd.get('attachment');
    setUploading(true);

    try {
      if (file instanceof File && file.size > MAX_FILE_BYTES) {
        throw new Error('Ukuran file maksimal 20 MB.');
      }

      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: fd.get('title'),
          description: fd.get('description'),
          created_by: session.user.id
        })
        .select('id')
        .single();

      if (error) throw error;

      if (file instanceof File && file.size > 0) {
        const path = await uploadLmsFile(
          file, 'courses', data.id
        );

        const { error: saveError } = await supabase
          .from('courses')
          .update({ attachment_path: path })
          .eq('id', data.id);

        if (saveError) throw saveError;
      }

      setMessage('Materi berhasil ditambahkan.');
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setMessage(`Gagal menyimpan materi: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  async function uploadLmsFile(file, kind, assignmentId) {
    if (!file) return null;
    if (file.size > MAX_FILE_BYTES) throw new Error('Ukuran file maksimal 20 MB.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const path = `${session.user.id}/${kind}/${assignmentId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from('lms-files').upload(path, file, {
      upsert: false, contentType: file.type || 'application/octet-stream'
    });
    if (error) throw error;
    return path;
  }
  async function downloadLmsFile(path) {
    if (!path) return;
    const { data, error } = await supabase.storage.from('lms-files').createSignedUrl(path, 60);
    if (error) { setMessage(`Gagal mengunduh: ${error.message}`); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }
  
async function deleteCourse(course) {
  if (!isAdmin || uploading) return;

  const confirmed = window.confirm(
    `Yakin ingin menghapus materi "${course.title}"?`
  );

  if (!confirmed) return;

  setUploading(true);

  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', course.id)
      .select('id')
      .single();

    if (error) throw error;

    setMessage('Materi berhasil dihapus.');
    await loadData();
  } catch (err) {
    setMessage(`Gagal menghapus materi: ${err.message}`);
  } finally {
    setUploading(false);
  }
}

  async function saveAttendance(e) {
    e.preventDefault();
    if (!isAdmin || uploading) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const studentId = String(fd.get('student_id') || '');
    const student = users.find(u => u.id === studentId && u.role === 'murid');
    const nisn = String(fd.get('nisn') || '').trim();
    if (!student) { setMessage('Pilih murid yang terdaftar.'); return; }
    if (!/^\d{10}$/.test(nisn)) { setMessage('NISN harus terdiri dari 10 angka.'); return; }
    const payload = {
      date: fd.get('date'),
      student_id: studentId,
      student_name: student.full_name || student.email || '',
      nisn,
      class_id: fd.get('class_id') || null,
      status: String(fd.get('status') || '').toLowerCase(),
      note: String(fd.get('note') || '').trim() || null
    };
    setUploading(true);
    try {
      const result = editingAttendance
        ? await supabase.from('attendance').update(payload).eq('id', editingAttendance.id).select('id')
        : await supabase.from('attendance').insert({ ...payload, recorded_by: session.user.id }).select('id');
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error('Tidak ada data berubah. Periksa izin update/insert di Supabase.');
      setMessage(editingAttendance ? 'Absensi berhasil diperbarui.' : 'Absensi berhasil disimpan.');
      setEditingAttendance(null);
      form.reset();
      await loadData();
    } catch (err) {
      setMessage(`Gagal menyimpan absensi: ${err.message}`);
    } finally { setUploading(false); }
  }

  async function deleteAttendance(item) {
    if (!isAdmin || uploading) return;
    if (!window.confirm(`Hapus absensi ${item.student_name || 'murid'} pada ${item.date}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setUploading(true);
    try {
      const { data, error } = await supabase.from('attendance').delete().eq('id', item.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Data tidak terhapus. Periksa izin delete di Supabase.');
      if (editingAttendance?.id === item.id) setEditingAttendance(null);
      setMessage('Absensi berhasil dihapus.');
      await loadData();
    } catch (err) { setMessage(`Gagal menghapus absensi: ${err.message}`); }
    finally { setUploading(false); }
  }

  async function createAssignment(e) {
    e.preventDefault();
    if (!canManage || uploading) return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get('attachment');
    setUploading(true);
    try {
      const { data, error } = await supabase.from('assignments').insert({
        title: fd.get('title'), description: fd.get('description'),
        due_at: fd.get('due_at') || null, created_by: session.user.id
      }).select('id').single();
      if (error) throw error;
      if (file instanceof File && file.size > 0) {
        const path = await uploadLmsFile(file, 'assignments', data.id);
        const { error: saveError } = await supabase.from('assignments')
          .update({ attachment_path: path }).eq('id', data.id);
        if (saveError) throw saveError;
      }
      setMessage('Tugas berhasil dibuat.'); setShowCreate(false); await loadData();
    } catch (err) { setMessage(`Gagal menyelesaikan pembuatan tugas: ${err.message}. Periksa apakah tugas sudah tersimpan sebelum mencoba lagi.`); }
    finally { setUploading(false); }
  }
  async function deleteAssignment(assignment) {
    if (!isAdmin || uploading) return;
    const confirmed = window.confirm(`Hapus tugas "${assignment.title}"?\n\nTindakan ini tidak dapat dibatalkan. Pastikan jawaban murid sudah dicadangkan.`);
    if (!confirmed) return;
    setUploading(true);
    try {
      const { error } = await supabase.from('assignments')
        .delete().eq('id', assignment.id).select('id').single();
      if (error) throw error;
      setMessage('Tugas berhasil dihapus dari database. File lampiran yang tersimpan perlu dibersihkan secara terpisah.');
      await loadData();
    } catch (err) {
      setMessage(`Gagal menghapus tugas: ${err.message}. Jika sudah ada pengumpulan murid, jangan hapus datanya sebelum dicadangkan.`);
    } finally {
      setUploading(false);
    }
  }

  async function submitAssignment(e, assignmentId) {
    e.preventDefault();
    if (uploading || canManage) return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get('answer_file');
    const answer = String(fd.get('answer_text') || '').trim();
    if ((!file || !file.size) && !answer) { setMessage('Isi jawaban atau pilih file dahulu.'); return; }
    setUploading(true);
    try {
      const existing = submissions.find(s => s.assignment_id === assignmentId && s.student_id === session.user.id);
      let path = existing?.file_url || null;
      if (file instanceof File && file.size > 0) path = await uploadLmsFile(file, 'submissions', assignmentId);
      const payload = { answer_text: answer, file_url: path, submitted_at: new Date().toISOString() };
      const result = existing
        ? await supabase.from('submissions').update(payload).eq('id', existing.id)
        : await supabase.from('submissions').insert({ ...payload, assignment_id: assignmentId, student_id: session.user.id });
      if (result.error) throw result.error;
      setMessage('Jawaban berhasil dikumpulkan.'); await loadData();
    } catch (err) { setMessage(`Gagal mengumpulkan jawaban: ${err.message}`); }
    finally { setUploading(false); }
  }
  async function createPost(e) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from('forum_posts').insert({ title: fd.get('title'), body: fd.get('body'), author_id: session.user.id });
    if (error) setMessage(error.message); else { setMessage('Diskusi berhasil dipublikasikan.'); setShowCreate(false); loadData(); }
  }
  async function changeRole(id, role) {
    const { error } = await supabase.from('profiles').update({role}).eq('id',id);
    setMessage(error ? error.message : 'Peran pengguna diperbarui.'); if (!error) loadData();
  }

  async function saveMyProfile(e) {
    e.preventDefault();
    if (!session || profileBusy) return;
    const name = String(new FormData(e.currentTarget).get('full_name') || '').trim();
    if (!name || name.length > 120) { setProfileFeedback('Nama harus diisi (maksimal 120 karakter).'); return; }
    setProfileBusy(true); setProfileFeedback('');
    try {
      const { data, error } = await supabase.from('profiles').update({ full_name: name }).eq('id', session.user.id).select('id,full_name').single();
      if (error) throw error;
      setProfile(prev => ({ ...prev, full_name: data.full_name }));
      setUsers(prev => prev.map(u => u.id === session.user.id ? { ...u, full_name: data.full_name } : u));
      setProfileDialog(null); setMessage('Nama profil berhasil diperbarui.');
    } catch (err) { setProfileFeedback('Gagal memperbarui profil: ' + err.message); }
    finally { setProfileBusy(false); }
  }

  async function saveMyPassword(e) {
    e.preventDefault();
    if (profileBusy) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') || '');
    const confirm = String(fd.get('confirm_password') || '');
    if (password.length < 8) { setProfileFeedback('Password minimal 8 karakter.'); return; }
    if (password !== confirm) { setProfileFeedback('Konfirmasi password tidak sama.'); return; }
    setProfileBusy(true); setProfileFeedback('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setProfileDialog(null); setMessage('Password berhasil diperbarui.');
    } catch (err) { setProfileFeedback('Gagal mengubah password: ' + err.message + '. Jika diminta verifikasi ulang, ikuti instruksi email dari Supabase.'); }
    finally { setProfileBusy(false); }
  }

  function openProfileDialog(kind) {
    setProfileMenuOpen(false);
    setProfileFeedback('');
    setProfileDialog(kind);
  }

  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'guru';
  const canManage = isAdmin || isTeacher;
  const filteredUsers = useMemo(()=>users.filter(u=>(u.full_name||'').toLowerCase().includes(search.toLowerCase())||(u.email||'').toLowerCase().includes(search.toLowerCase())),[users,search]);

  if (loading) return <div className="loading"><div className="spinner"/>Memuat Belajar Bersama…</div>;
  if (!supabase) return <SetupNotice/>;
  if (!session) return <Auth onLogin={setSession}/>;
  if (!profile) return <div className="loading"><div className="spinner"/><div><b>Akun belum memiliki profil LMS.</b><p>Pastikan SQL setup sudah dijalankan. Jika baru mendaftar, minta Admin menetapkan peran.</p><button className="secondary" onClick={logout}>Keluar</button>{message && <p>{message}</p>}</div></div>;

  const pageTitle = active;
  const openCreate = () => setShowCreate(true);
  const iconFor = (name) => { const I = ({Dashboard:LayoutDashboard,Pengguna:Users,'Kelas & Materi':BookOpen,'Tugas & Kuis':ClipboardCheck,Absensi:CalendarCheck,'Forum Diskusi':MessageCircle,'Laporan Akademik':BarChart3,Sertifikat:Award,Pengaturan:Settings})[name]||LayoutDashboard; return <I size={19}/>; };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}><Brand/><div className="workspace"><div className="workspace-dot"/><div><b>Belajar Bersama</b><small>{isAdmin?'Administrator':isTeacher?'Panel Guru':'Area Murid'}</small></div></div>
      <button type="button" onClick={()=>setSidebarMenuOpen(open=>!open)} aria-expanded={sidebarMenuOpen} aria-controls="sidebar-menu-list" title={sidebarMenuOpen?'Tutup Menu Utama':'Buka Menu Utama'} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px 9px 18px',border:0,background:'transparent',cursor:'pointer',color:'#8493aa',fontWeight:800,fontSize:11,letterSpacing:'1.5px',textAlign:'left'}}><span>MENU UTAMA</span><ChevronDown size={17} style={{transform:sidebarMenuOpen?'rotate(0deg)':'rotate(-90deg)',transition:'transform .2s ease'}}/></button>
      <nav id="sidebar-menu-list" hidden={!sidebarMenuOpen} style={{display:sidebarMenuOpen?undefined:'none'}}>{menu.filter(([n])=>isAdmin || (isTeacher ? !['Pengguna','Pengaturan'].includes(n) : ['Dashboard','Kelas & Materi','Tugas & Kuis','Absensi','Forum Diskusi','Sertifikat'].includes(n))).map(([n,I])=><button key={n} className={`nav-item ${active===n?'selected':''}`} onClick={()=>{setActive(n);setMobileNav(false)}}><I size={18}/><span>{n}</span>{n==='Pengguna'&&isAdmin&&<em>{summary.users}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><button type="button" className="mini-profile" onClick={()=>setSidebarMenuOpen(open=>!open)} aria-expanded={sidebarMenuOpen} aria-controls="sidebar-menu-list" title={sidebarMenuOpen?'Tutup Menu Utama':'Buka Menu Utama'} style={{width:'100%',border:0,background:'transparent',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:10,padding:0,color:'inherit'}}><div className="avatar">{(profile.full_name||session.user.email||'U').slice(0,1).toUpperCase()}</div><div className="profile-text" style={{flex:1,minWidth:0}}><b>{profile.full_name||'Pengguna'}</b><small>{profile.role}</small></div><ChevronDown size={17} style={{flexShrink:0,transform:sidebarMenuOpen?'rotate(0deg)':'rotate(-90deg)',transition:'transform .2s ease'}}/></button></div>
    </aside>
    {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main"><header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(!mobileNav)}><Menu/></button><div className="breadcrumb">Belajar Bersama <span>/</span> <b>{pageTitle}</b></div><div className="top-actions"><Notifications supabase={supabase} userId={session.user.id} role={profile.role} onNavigate={(page)=>{setActive(page);setProfileMenuOpen(false);}}/><div style={{position:'relative'}}>
      <button type="button" onClick={()=>setProfileMenuOpen(v=>!v)} aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-label="Buka menu profil" style={{display:'flex',alignItems:'center',gap:10,background:'transparent',border:'1px solid #e2e8f0',borderRadius:24,padding:'5px 10px 5px 5px',cursor:'pointer',color:'#24364f'}}>
        <div className="avatar small">{(profile.full_name||'U').slice(0,1).toUpperCase()}</div><span style={{fontSize:13,fontWeight:600,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile.full_name||'Profil Saya'}</span><ChevronDown size={15}/>
      </button>
      {profileMenuOpen && <><button type="button" aria-label="Tutup menu profil" onClick={()=>setProfileMenuOpen(false)} style={{position:'fixed',inset:0,border:0,background:'transparent',zIndex:1000,cursor:'default'}}/><div role="menu" style={{position:'absolute',right:0,top:'calc(100% + 10px)',width:270,zIndex:1001,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,boxShadow:'0 14px 40px rgba(18,35,61,.16)',padding:10}}>
        <div style={{padding:'10px 12px',borderBottom:'1px solid #edf1f7',marginBottom:6}}><b style={{display:'block',fontSize:14}}>{profile.full_name||'Pengguna'}</b><small style={{display:'block',color:'#64748b',overflowWrap:'anywhere'}}>{session.user.email}</small><small style={{color:'#64748b',textTransform:'capitalize'}}>{profile.role}</small></div>
        <button type="button" role="menuitem" onClick={()=>openProfileDialog('edit')} style={{display:'flex',alignItems:'center',gap:12,width:'100%',border:0,background:'transparent',padding:12,textAlign:'left',cursor:'pointer',color:'#253653',borderRadius:8}}><UserRound size={18}/> Edit Profil</button>
        <button type="button" role="menuitem" onClick={()=>openProfileDialog('password')} style={{display:'flex',alignItems:'center',gap:12,width:'100%',border:0,background:'transparent',padding:12,textAlign:'left',cursor:'pointer',color:'#253653',borderRadius:8}}><KeyRound size={18}/> Ubah Password</button>
        <button type="button" role="menuitem" onClick={()=>{setProfileMenuOpen(false);logout()}} style={{display:'flex',alignItems:'center',gap:12,width:'100%',border:0,background:'transparent',padding:12,textAlign:'left',cursor:'pointer',color:'#b42318',borderTop:'1px solid #edf1f7',marginTop:5}}><LogOut size={18}/> Log Out</button>
      </div></>}
    </div></div></header>
      <div className="content"><div className="page-heading"><div><div className="eyebrow">RUANG KERJA {isAdmin?'ADMIN':isTeacher?'GURU':'MURID'}</div><h1>{active==='Dashboard'?`Selamat datang, ${(profile.full_name||'Pengguna').split(' ')[0]}!`:active}</h1><p>{active==='Dashboard'?'Pantau aktivitas dan kelola pembelajaran hari ini.':`Kelola ${active.toLowerCase()} Belajar Bersama.`}</p></div>{canManage&&['Kelas & Materi','Tugas & Kuis','Forum Diskusi'].includes(active)&&<button className="primary" onClick={openCreate}><Plus size={17}/> Tambah {active==='Kelas & Materi'?'Materi':active==='Tugas & Kuis'?'Tugas':'Diskusi'}</button>}</div>
      {message&&<div className="toast"><CheckCircle2 size={17}/>{message}<button onClick={()=>setMessage('')}><X size={16}/></button></div>}
      {active==='Dashboard'&&<><div className="welcome-card"><div><span className="eyebrow light">PUSAT PEMBELAJARAN</span><h2>Langkah kecil hari ini,<br/>kemajuan besar esok hari.</h2><p>Semua aktivitas belajar dimulai dari sini.</p></div><div className="welcome-art"><GraduationCap size={88}/></div></div><div className="section-head"><h3>Ringkasan LMS</h3><span>Data yang dapat kamu akses</span></div><div className="stat-grid">{(isAdmin?[['Total pengguna',summary.users,Users],['Kelas tersedia',summary.classes,BookOpen],['Tugas dibuat',summary.assignments,FileText],['Catatan absensi',summary.attendance,CalendarCheck]]: [['Kelas tersedia',summary.classes,BookOpen],['Tugas tersedia',summary.assignments,FileText],['Catatan absensi',summary.attendance,CalendarCheck],['Nilai tercatat',grades.length,BarChart3]]).map(([label,value,I],i)=><div className="stat-card" key={label}><div className={`stat-icon tone-${i}`}><I size={20}/></div><div><span>{label}</span><strong>{value}</strong></div></div>)}</div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h3>Materi terbaru</h3><p>Materi yang tersedia di LMS</p></div><button className="text-button" onClick={()=>setActive('Kelas & Materi')}>Lihat semua</button></div>{courses.slice(0,4).length?courses.slice(0,4).map(c=><div className="list-row" key={c.id}><div className="row-icon"><BookOpen size={18}/></div><div className="row-copy"><b>{c.title}</b><small>{c.description||'Materi pembelajaran'}</small></div><span className="pill">Materi</span></div>):<div className="empty">Belum ada materi yang ditambahkan.</div>}</section><section className="panel"><div className="panel-head"><div><h3>Aktivitas terbaru</h3><p>Ringkasan kegiatan</p></div></div>{assignments.slice(0,3).map(a=><div className="activity" key={a.id}><span className="activity-dot"/><div><b>{a.title}</b><small>Tugas baru · {a.due_at?new Date(a.due_at).toLocaleDateString('id-ID'):'Tanpa tenggat'}</small></div></div>)}{!assignments.length&&<div className="empty">Aktivitas akan muncul di sini.</div>}</section></div></>}
      {active==='Pengguna'&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>Manajemen pengguna</h3><p>Atur peran pengguna yang sudah terdaftar</p></div><div className="searchbox"><Search size={16}/><input placeholder="Cari nama atau email…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="table-wrap"><table><thead><tr><th>Pengguna</th><th>Email</th><th>Peran</th><th>Terdaftar</th></tr></thead><tbody>{filteredUsers.map(u=><tr key={u.id}><td><b>{u.full_name||'—'}</b></td><td>{u.email||'—'}</td><td><select value={u.role} disabled={u.id===session.user.id} onChange={e=>changeRole(u.id,e.target.value)}><option value="murid">Murid</option><option value="guru">Guru</option><option value="admin">Admin</option></select></td><td>{u.created_at?new Date(u.created_at).toLocaleDateString('id-ID'):'—'}</td></tr>)}</tbody></table></div><p className="hint">Perubahan peran dibatasi oleh kebijakan database. Akun Admin utama sebaiknya tidak diturunkan perannya.</p></section>}
      {active==='Kelas & Materi'&&<><div className="section-head"><h3>Materi pembelajaran</h3><span>{courses.length} materi</span></div><div className="cards-grid">{courses.map(c=><article className="course-card" key={c.id}><div className="course-cover"><BookOpen size={28}/><span>MODUL PEMBELAJARAN</span></div><div className="course-body"><h3>{c.title}</h3><p>{c.description||'Belum ada deskripsi.'}</p>
        {c.attachment_path && (
  <button
    type="button"
    className="secondary"
    style={{ marginTop: 10 }}
    onClick={() => downloadLmsFile(c.attachment_path)}
  >
    <Download size={15} />
    Unduh Materi
  </button>
)}
        
{isAdmin && (
  <button
    type="button"
    className="secondary"
    disabled={uploading}
    onClick={() => deleteCourse(c)}
    style={{
      marginTop: 10,
      color: '#b42318',
      borderColor: '#fecdca'
    }}
  >
    <Trash2 size={15} />
    Hapus Materi
  </button>
)}


<small>Dibuat {new Date(c.created_at).toLocaleDateString('id-ID')}</small></div></article>)}</div>{!courses.length&&<div className="panel empty">Belum ada materi. {canManage?'Gunakan tombol Tambah Materi untuk memulai.':'Materi akan tampil setelah guru mengunggahnya.'}</div>}</>}
             {active==='Tugas & Kuis'&&<section className="panel"><div className="panel-head"><div><h3>Daftar tugas</h3><p>Tugas dan kuis pembelajaran</p></div></div>
         {assignments.map(a => {
           const mine = submissions.find(s => s.assignment_id === a.id && s.student_id === session.user.id);
           const related = submissions.filter(s => s.assignment_id === a.id);
           return <div className="list-row" key={a.id} style={{alignItems:'flex-start', flexWrap:'wrap', gap:12}}>
             <div className="row-icon"><ClipboardCheck size={18}/></div>
             <div className="row-copy" style={{minWidth:220, flex:'1 1 280px'}}>
               <b>{a.title}</b><small>{a.description||'Tidak ada instruksi tambahan'}</small>
               {a.attachment_path && <button type="button" className="secondary" style={{marginTop:10}} onClick={()=>downloadLmsFile(a.attachment_path)}><Download size={15}/> Unduh lampiran tugas</button>}
               {!canManage && <form onSubmit={e=>submitAssignment(e,a.id)} style={{marginTop:12,display:'grid',gap:8}}>
                 <label>Jawaban<textarea name="answer_text" rows="2" defaultValue={mine?.answer_text||''} placeholder="Tulis jawaban (opsional jika mengunggah file)"/></label>
                 <label>Upload jawaban (maks. 20 MB)<input name="answer_file" type="file" /></label>
                 {mine?.file_url && <button type="button" className="secondary" onClick={()=>downloadLmsFile(mine.file_url)}><Download size={15}/> Lihat file jawaban saya</button>}
                 <button className="primary" disabled={uploading}><Upload size={15}/>{uploading?'Mengunggah…':mine?'Perbarui jawaban':'Kumpulkan jawaban'}</button>
               </form>}
               {canManage && related.length>0 && <div style={{marginTop:12}}><b>Pengumpulan ({related.length})</b>{related.map(s=><div key={s.id} style={{marginTop:8}}><small>Murid: {users.find(u=>u.id===s.student_id)?.full_name || s.student_id}</small>{s.answer_text&&<small>{s.answer_text}</small>}{s.file_url&&<button type="button" className="secondary" onClick={()=>downloadLmsFile(s.file_url)}><Download size={15}/> Unduh jawaban</button>}</div>)}</div>}
             </div>
                           <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8}}>
                <span className="pill">{a.due_at?`Tenggat ${new Date(a.due_at).toLocaleDateString('id-ID')}`:'Tanpa tenggat'}</span>
                {isAdmin && <button type="button" className="secondary" disabled={uploading}
                  onClick={() => deleteAssignment(a)}
                  style={{color:'#b42318', borderColor:'#fecdca'}}>
                  <Trash2 size={15}/> Hapus tugas
                </button>}
              </div>
           </div>;
         })}
         {!assignments.length&&<div className="empty">Belum ada tugas atau kuis.</div>}
       </section>}
{active === 'Absensi' && (
  <section className="panel" style={{padding: 24}}>
    <div className="panel-head" style={{marginBottom: 22}}>
      <div><h3>Absensi Murid</h3><p>Catat, perbarui, dan kelola kehadiran murid.</p></div>
      <span className="pill">{attendance.length} catatan</span>
    </div>
    {isAdmin && (
      <form key={editingAttendance?.id || 'new'} onSubmit={saveAttendance}
        style={{background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:16, padding:20, marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:18,flexWrap:'wrap'}}>
          <h3 style={{margin:0}}>{editingAttendance ? 'Edit Absensi' : 'Tambah Absensi'}</h3>
          {editingAttendance && <button type="button" className="secondary" disabled={uploading}
            onClick={()=>setEditingAttendance(null)}>Batal Edit</button>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',gap:16}}>
          <label style={{display:'grid',gap:7}}>Tanggal
            <input style={{width:'100%',boxSizing:'border-box'}} name="date" type="date" required defaultValue={editingAttendance?.date || ''}/>
          </label>
          <label style={{display:'grid',gap:7}}>Nama Murid
            <select style={{width:'100%',boxSizing:'border-box'}} name="student_id" required defaultValue={editingAttendance?.student_id || ''}>
              <option value="">Pilih murid</option>
              {users.filter(u=>u.role==='murid').map(u=><option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </label>
          <label style={{display:'grid',gap:7}}>NISN
            <input style={{width:'100%',boxSizing:'border-box'}} name="nisn" type="text" inputMode="numeric" pattern="[0-9]{10}"
              maxLength={10} placeholder="10 digit NISN" required defaultValue={editingAttendance?.nisn || ''}/>
          </label>
          <label style={{display:'grid',gap:7}}>Kelas
            <select style={{width:'100%',boxSizing:'border-box'}} name="class_id" defaultValue={editingAttendance?.class_id || ''}>
              <option value="">Pilih kelas (opsional)</option>
              {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{display:'grid',gap:7}}>Status Kehadiran
            <select style={{width:'100%',boxSizing:'border-box'}} name="status" required defaultValue={editingAttendance?.status || 'hadir'}>
              <option value="hadir">Hadir</option><option value="izin">Izin</option>
              <option value="sakit">Sakit</option><option value="alpa">Alpa</option>
            </select>
          </label>
          <label style={{display:'grid',gap:7}}>Catatan
            <textarea style={{width:'100%',boxSizing:'border-box',minHeight:44}} name="note" rows="2"
              placeholder="Catatan tambahan (opsional)" defaultValue={editingAttendance?.note || ''}/>
          </label>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
          <button type="submit" className="primary" disabled={uploading} style={{minWidth:180,justifyContent:'center'}}>
            {uploading ? 'Memproses…' : editingAttendance ? 'Simpan Perubahan' : 'Simpan Absensi'}
          </button>
          {editingAttendance && <button type="button" className="secondary" disabled={uploading} onClick={()=>setEditingAttendance(null)}>Batal</button>}
        </div>
      </form>
    )}
    <div className="table-wrap" style={{border:'1px solid #e2e8f0',borderRadius:12,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
        <thead><tr><th>Tanggal</th><th>Nama Murid</th><th>NISN</th><th>Kelas</th><th>Status</th><th>Catatan</th>{isAdmin&&<th>Aksi</th>}</tr></thead>
        <tbody>{attendance.map(a=><tr key={a.id}>
          <td>{a.date ? new Date(`${a.date}T00:00:00`).toLocaleDateString('id-ID') : '-'}</td>
          <td><b>{a.student_name || users.find(u=>u.id===a.student_id)?.full_name || '-'}</b></td>
          <td>{a.nisn || '-'}</td>
          <td>{classes.find(c=>c.id===a.class_id)?.name || '-'}</td>
          <td><span className="pill">{({hadir:'Hadir',izin:'Izin',sakit:'Sakit',alpa:'Alpa'})[a.status] || a.status}</span></td>
          <td>{a.note || '-'}</td>
          {isAdmin&&<td><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button type="button" className="secondary" disabled={uploading} onClick={()=>{setEditingAttendance(a);setMessage('');window.scrollTo({top:0,behavior:'smooth'});}}>Edit</button>
            <button type="button" className="secondary" disabled={uploading} style={{color:'#b42318',borderColor:'#fecdca'}} onClick={()=>deleteAttendance(a)}><Trash2 size={14}/> Hapus</button>
          </div></td>}
        </tr>)}</tbody>
      </table>
    </div>
    {!attendance.length && <div className="empty">Belum ada catatan absensi.</div>}
  </section>
)}
      {active==='Forum Diskusi'&&<section className="panel"><div className="panel-head"><div><h3>Forum diskusi</h3><p>Berbagi pertanyaan dan berdiskusi</p></div></div>{posts.map(p=><article className="forum-post" key={p.id}><div className="row-icon"><MessageCircle size={18}/></div><div><h3>{p.title}</h3><p>{p.body}</p><small>{new Date(p.created_at).toLocaleString('id-ID')}</small></div></article>)}{!posts.length&&<div className="empty">Belum ada diskusi.</div>}</section>}
      {active==='Laporan Akademik'&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>Ringkasan akademik</h3><p>Data agregat dari tabel LMS</p></div></div><div className="report-grid"><div><span>Total pengguna</span><b>{summary.users}</b></div><div><span>Total kelas</span><b>{summary.classes}</b></div><div><span>Total tugas</span><b>{summary.assignments}</b></div><div><span>Catatan absensi</span><b>{summary.attendance}</b></div><div><span>Nilai tercatat</span><b>{grades.length}</b></div><div><span>Diskusi</span><b>{posts.length}</b></div></div><button className="secondary" onClick={()=>{const csv='nama,email,peran\\n'+users.map(u=>[u.full_name,u.email,u.role].map(x=>`"${String(x||'').replaceAll('"','""')}"`).join(',')).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='laporan-pengguna-belajar-bersama.csv';a.click();URL.revokeObjectURL(a.href)}}>Unduh laporan pengguna (CSV)</button></section>}
      {active==='Sertifikat'&&<section className="panel"><div className="panel-head"><div><h3>Sertifikat penyelesaian</h3><p>Sertifikat akan tercatat di sini setelah fitur penerbitan diaktifkan.</p></div></div><div className="empty"><Award size={28}/><b>Belum ada sertifikat</b><span>Admin dapat mengembangkan aturan penerbitan sertifikat berdasarkan penyelesaian kelas dan nilai minimum.</span></div></section>}
      {active==='Pengaturan'&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>Pengaturan sistem</h3><p>Informasi aplikasi dan keamanan</p></div></div><div className="settings-row"><div><b>Nama LMS</b><p>Belajar Bersama</p></div><span className="pill success">Aktif</span></div><div className="settings-row"><div><b>Akun aktif</b><p>{session.user.email}</p></div><span className="pill">{profile.role}</span></div><div className="settings-row"><div><b>Database</b><p>Supabase PostgreSQL dengan Row Level Security</p></div><ShieldCheck size={20}/></div><p className="hint">Jangan memasukkan service-role key ke frontend. Kelola rahasia dari dashboard Supabase dan environment variables hosting.</p></section>}
      </div>
    </main>
    {profileDialog && <div className="modal-backdrop" onClick={()=>!profileBusy&&setProfileDialog(null)}><div className="modal" role="dialog" aria-modal="true" aria-label={profileDialog==='edit'?'Edit Profil':'Ubah Password'} onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{profileDialog==='edit'?'Edit Profil':'Ubah Password'}</h2><button type="button" className="icon-button" disabled={profileBusy} onClick={()=>setProfileDialog(null)} aria-label="Tutup"><X/></button></div>
      {profileDialog==='edit' ? <form onSubmit={saveMyProfile}><label>Nama lengkap<input key={profile.full_name} name="full_name" defaultValue={profile.full_name||''} maxLength={120} required autoComplete="name"/></label><label>Email akun<input value={session.user.email||''} disabled readOnly/></label><p className="hint">Email dan peran akun tidak dapat diubah melalui menu ini.</p>{profileFeedback&&<div className="notice">{profileFeedback}</div>}<button className="primary full" disabled={profileBusy}>{profileBusy?'Menyimpan…':'Simpan Perubahan'}</button></form>
      : <form onSubmit={saveMyPassword}><label>Password baru<input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter"/></label><label>Konfirmasi password baru<input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required placeholder="Ulangi password baru"/></label><p className="hint">Supabase dapat meminta verifikasi ulang melalui email demi keamanan akun.</p>{profileFeedback&&<div className="notice">{profileFeedback}</div>}<button className="primary full" disabled={profileBusy}>{profileBusy?'Menyimpan…':'Ubah Password'}</button></form>}
    </div></div>}
    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{active==='Kelas & Materi'?'Tambah materi':active==='Tugas & Kuis'?'Buat tugas':'Buat diskusi'}</h2><button className="icon-button" onClick={()=>setShowCreate(false)}><X/></button></div><form onSubmit={active==='Kelas & Materi'?createCourse:active==='Tugas & Kuis'?createAssignment:createPost}><label>Judul<input name="title" required maxLength="160" placeholder="Masukkan judul"/></label>
{active==='Kelas & Materi' && (
  <label>
    Lampiran materi (opsional, maks. 20 MB)
    <input
      name="attachment"
      type="file"
      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png"
    />
  </label>
)}
{active==='Tugas & Kuis'&&<><label>Tenggat waktu<input name="due_at" type="datetime-local"/></label><label>Lampiran tugas (opsional, maks. 20 MB)<input name="attachment" type="file"/></label></>}<label>{active==='Forum Diskusi'?'Isi diskusi':'Deskripsi / instruksi'}<textarea name={active==='Forum Diskusi'?'body':'description'} rows="4" placeholder="Tulis keterangan…" /></label><button className="primary full" disabled={uploading}><Plus size={16}/>{uploading?'Mengunggah…':'Simpan'}</button></form></div></div>}
  </div>;
}

export default App;
