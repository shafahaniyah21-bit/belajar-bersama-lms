import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, ClipboardCheck,
  FileText, BarChart3, MessageCircle, Award, Settings, LogOut, Menu,
  Plus, Search, Bell, ShieldCheck, CalendarCheck, CheckCircle2, X, Upload, Download, Trash2
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
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ users: 0, classes: 0, assignments: 0, attendance: 0 });
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [posts, setPosts] = useState([]);
  const [grades, setGrades] = useState([]);
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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

  const fd = new FormData(e.currentTarget);

  const studentId = fd.get('student_id');
  const student = users.find(u => u.id === studentId);

  if (!student) {
    setMessage('Pilih murid yang terdaftar terlebih dahulu.');
    return;
  }

  const studentName = student.full_name || '';
  const nisn = String(fd.get('nisn') || '').trim();
  const classId = fd.get('class_id') || null;

  if (!nisn) {
    setMessage('NISN wajib diisi.');
    return;
  }

  setUploading(true);

  try {
    const { error } = await supabase
      .from('attendance')
      .insert({
        date: fd.get('date'),
        student_id: studentId,
        student_name: studentName,
        nisn: nisn,
        class_id: classId,
        status: fd.get('status'),
        note: fd.get('note') || null,
        recorded_by: session.user.id
      });

    if (error) throw error;

    setMessage('Absensi berhasil disimpan.');
    await loadData();

    e.target.reset();

  } catch (err) {
    setMessage(`Gagal menyimpan absensi: ${err.message}`);
  } finally {
    setUploading(false);
  }
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
      <div className="nav-label">MENU UTAMA</div><nav>{menu.filter(([n])=>isAdmin || (isTeacher ? !['Pengguna','Pengaturan'].includes(n) : ['Dashboard','Kelas & Materi','Tugas & Kuis','Absensi','Forum Diskusi','Sertifikat'].includes(n))).map(([n,I])=><button key={n} className={`nav-item ${active===n?'selected':''}`} onClick={()=>{setActive(n);setMobileNav(false)}}><I size={18}/><span>{n}</span>{n==='Pengguna'&&isAdmin&&<em>{summary.users}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="mini-profile"><div className="avatar">{(profile.full_name||session.user.email||'U').slice(0,1).toUpperCase()}</div><div className="profile-text"><b>{profile.full_name||'Pengguna'}</b><small>{profile.role}</small></div><button className="icon-button" title="Keluar" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main"><header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(!mobileNav)}><Menu/></button><div className="breadcrumb">Belajar Bersama <span>/</span> <b>{pageTitle}</b></div><div className="top-actions"><span className="date-label">Portal Pembelajaran</span><button className="icon-button" title="Notifikasi"><Bell size={19}/></button><div className="avatar small">{(profile.full_name||'U').slice(0,1).toUpperCase()}</div></div></header>
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
  <section className="panel">
    <div className="panel-head">
      <div>
        <h3>Absensi Murid</h3>
        <p>Kelola dan catat kehadiran murid.</p>
      </div>
    </div>

    {isAdmin && (
      <form
        onSubmit={saveAttendance}
        style={{ display: 'grid', gap: 12, marginBottom: 24 }}
      >
        <h3>Tambah Absensi</h3>

        <label>
          Tanggal
          <input name="date" type="date" required />
        </label>

        <label>
          Nama Murid
          <select name="student_id" required defaultValue="">
            <option value="">Pilih murid</option>
            {users.filter(u => u.role === 'murid').map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </label>

        <label>
          NISN
          <input
            name="nisn"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="10 digit NISN"
            required
          />
        </label>

        <label>
          Kelas
          <select name="class_id" defaultValue="">
            <option value="">Pilih kelas (opsional)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status Kehadiran
          <select name="status" required defaultValue="Hadir">
            <option value="Hadir">Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
            <option value="Alpa">Alpa</option>
          </select>
        </label>

        <label>
          Catatan
          <textarea
            name="note"
            rows="2"
            placeholder="Catatan tambahan (opsional)"
          />
        </label>

        <button
          type="submit"
          className="primary"
          disabled={uploading}
        >
          {uploading ? 'Menyimpan...' : 'Simpan Absensi'}
        </button>
      </form>
    )}

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Nama Murid</th>
            <th>NISN</th>
            <th>Kelas</th>
            <th>Status Kehadiran</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map(a => (
            <tr key={a.id}>
              <td>{a.date}</td>
              <td>{a.student_name || '-'}</td>
              <td>{a.nisn || '-'}</td>
              <td>
                {classes.find(c => c.id === a.class_id)?.name || '-'}
              </td>
              <td><span className="pill">{a.status}</span></td>
              <td>{a.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {!attendance.length && (
      <div className="empty">Belum ada catatan absensi.</div>
    )}
  </section>
)}
      {active==='Forum Diskusi'&&<section className="panel"><div className="panel-head"><div><h3>Forum diskusi</h3><p>Berbagi pertanyaan dan berdiskusi</p></div></div>{posts.map(p=><article className="forum-post" key={p.id}><div className="row-icon"><MessageCircle size={18}/></div><div><h3>{p.title}</h3><p>{p.body}</p><small>{new Date(p.created_at).toLocaleString('id-ID')}</small></div></article>)}{!posts.length&&<div className="empty">Belum ada diskusi.</div>}</section>}
      {active==='Laporan Akademik'&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>Ringkasan akademik</h3><p>Data agregat dari tabel LMS</p></div></div><div className="report-grid"><div><span>Total pengguna</span><b>{summary.users}</b></div><div><span>Total kelas</span><b>{summary.classes}</b></div><div><span>Total tugas</span><b>{summary.assignments}</b></div><div><span>Catatan absensi</span><b>{summary.attendance}</b></div><div><span>Nilai tercatat</span><b>{grades.length}</b></div><div><span>Diskusi</span><b>{posts.length}</b></div></div><button className="secondary" onClick={()=>{const csv='nama,email,peran\\n'+users.map(u=>[u.full_name,u.email,u.role].map(x=>`"${String(x||'').replaceAll('"','""')}"`).join(',')).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='laporan-pengguna-belajar-bersama.csv';a.click();URL.revokeObjectURL(a.href)}}>Unduh laporan pengguna (CSV)</button></section>}
      {active==='Sertifikat'&&<section className="panel"><div className="panel-head"><div><h3>Sertifikat penyelesaian</h3><p>Sertifikat akan tercatat di sini setelah fitur penerbitan diaktifkan.</p></div></div><div className="empty"><Award size={28}/><b>Belum ada sertifikat</b><span>Admin dapat mengembangkan aturan penerbitan sertifikat berdasarkan penyelesaian kelas dan nilai minimum.</span></div></section>}
      {active==='Pengaturan'&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>Pengaturan sistem</h3><p>Informasi aplikasi dan keamanan</p></div></div><div className="settings-row"><div><b>Nama LMS</b><p>Belajar Bersama</p></div><span className="pill success">Aktif</span></div><div className="settings-row"><div><b>Akun aktif</b><p>{session.user.email}</p></div><span className="pill">{profile.role}</span></div><div className="settings-row"><div><b>Database</b><p>Supabase PostgreSQL dengan Row Level Security</p></div><ShieldCheck size={20}/></div><p className="hint">Jangan memasukkan service-role key ke frontend. Kelola rahasia dari dashboard Supabase dan environment variables hosting.</p></section>}
      </div>
    </main>
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
