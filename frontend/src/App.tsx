import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check, CheckCircle2, ChevronDown,
  Clock3, Compass, FilePlus2, FileText, Filter, LogOut, MapPin, RefreshCw, Search, Sparkles,
  UserRound, Users, X,
} from "lucide-react";
import ProfilePage from "./pages/ProfilePage";

type Role = "JOB_SEEKER" | "COMPANY";
type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
type Status = "APPLIED" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "ACCEPTED";
type User = { id: string; name: string; email: string; role: Role; companyName: string | null };
type Job = {
  id: string; title: string; description: string; location: string; salaryMin: number | null; salaryMax: number | null;
  type: JobType; createdAt: string; company: { id: string; companyName: string | null; name: string }; _count?: { applications: number };
};
type HistoryItem = { id: string; fromStatus: Status | null; toStatus: Status; note: string | null; createdAt: string; changedBy?: { name: string; companyName?: string | null } };
type Application = { id: string; status: Status; coverLetter?: string | null; createdAt: string; job: Job; candidate?: { id: string; name: string; email: string }; history: HistoryItem[] };
type Page = "jobs" | "applications" | "company" | "companyCandidates" | "create" | "profile";
type ApiError = Error & { status?: number };

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const typeLabels: Record<JobType, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Kontrak", INTERNSHIP: "Magang", FREELANCE: "Freelance" };
const statusLabels: Record<Status, string> = { APPLIED: "Terkirim", REVIEWING: "Ditinjau", SHORTLISTED: "Shortlisted", REJECTED: "Ditolak", ACCEPTED: "Diterima" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Permintaan gagal. Coba lagi.") as ApiError;
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function salaryLabel(job: Pick<Job, "salaryMin" | "salaryMax">) {
  if (job.salaryMin == null && job.salaryMax == null) return "Gaji kompetitif";
  const format = (amount: number) => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(amount / 1000000)} jt`;
  if (job.salaryMin != null && job.salaryMax != null) return `${format(job.salaryMin)} – ${format(job.salaryMax)} / bln`;
  return `${format((job.salaryMin ?? job.salaryMax)!)} / bln`;
}
function companyOf(job: Job) { return job.company.companyName || job.company.name; }

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<Page>("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [companyJobs, setCompanyJobs] = useState<Job[]>([]);
  const [companyApplications, setCompanyApplications] = useState<Application[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [candidateJobFilter, setCandidateJobFilter] = useState<string | null>(null);
  const [companyApplicationsError, setCompanyApplicationsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState({ q: "", location: "", type: "" });
  const [filterOpen, setFilterOpen] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };
  const signOut = async () => {
    try { await request("/auth/logout", { method: "POST" }); } catch { /* Clear the UI even if the API is unreachable. */ }
    setUser(null); setSelectedJob(null); setPage("jobs");
  };
  const signIn = (newUser: User) => {
    setUser(newUser);
    setPage(newUser.role === "COMPANY" ? "company" : "jobs");
  };

  useEffect(() => {
    localStorage.removeItem("indokerja_token");
    request<{ user: User }>("/auth/me")
      .then(({ user: current }) => { setUser(current); setPage(current.role === "COMPANY" ? "company" : "jobs"); })
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.location.trim()) params.set("location", filters.location.trim());
    if (filters.type) params.set("type", filters.type);
    const query = params.toString();
    const data = await request<{ jobs: Job[] }>(`/jobs${query ? `?${query}` : ""}`);
    setJobs(data.jobs);
  }, [filters]);
  const loadApplications = useCallback(async () => {
    if (!user || user.role !== "JOB_SEEKER") return;
    const data = await request<{ applications: Application[] }>("/applications/mine");
    setApplications(data.applications);
  }, [user]);
  const loadCompanyJobs = useCallback(async () => {
    if (!user || user.role !== "COMPANY") return;
    const data = await request<{ jobs: Job[] }>("/jobs/company/mine");
    setCompanyJobs(data.jobs);
  }, [user]);
  const loadCompanyApplications = useCallback(async () => {
    if (!user || user.role !== "COMPANY") return;
    setCompanyApplicationsError("");
    try {
      const data = await request<{ applications: Application[] }>("/applications/company");
      setCompanyApplications(data.applications);
    } catch (error) {
      setCompanyApplicationsError((error as Error).message);
      throw error;
    }
  }, [user]);
  const refreshCompanyApplications = async () => {
    if (loading) return;
    setLoading(true);
    try { await loadCompanyApplications(); }
    catch (error) { notify((error as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.role === "JOB_SEEKER") loadApplications().catch((error: Error) => notify(error.message));
  }, [user, loadApplications]);

  useEffect(() => {
    if (!user || user.role !== "JOB_SEEKER" || page !== "jobs") return;
    setLoading(true); loadJobs().catch((error: Error) => notify(error.message)).finally(() => setLoading(false));
  }, [user, page, loadJobs]);
  useEffect(() => {
    if (!user || user.role !== "JOB_SEEKER" || page !== "applications") return;
    setLoading(true); loadApplications().catch((error: Error) => notify(error.message)).finally(() => setLoading(false));
  }, [user, page, loadApplications]);
  useEffect(() => {
    if (!user || user.role !== "COMPANY" || page !== "company") return;
    setLoading(true); loadCompanyJobs().catch((error: Error) => notify(error.message)).finally(() => setLoading(false));
  }, [user, page, loadCompanyJobs]);

  useEffect(() => {
    if (!user || user.role !== "COMPANY" || page !== "companyCandidates") return;
    setLoading(true); loadCompanyApplications().catch((error: Error) => notify(error.message)).finally(() => setLoading(false));
  }, [user, page, loadCompanyApplications]);

  const openCandidates = (job: Job) => {
    setCandidateJobFilter(job.id);
    setPage("companyCandidates");
  };
  const openAllCandidates = () => {
    setCandidateJobFilter(null);
    setPage("companyCandidates");
  };
  const updateStatus = async (applicationId: string, status: Status) => {
    try {
      await request(`/applications/${applicationId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadCompanyApplications();
      notify("Status kandidat berhasil diperbarui.");
    } catch (error) { notify((error as Error).message); }
  };

  if (booting) return <div className="boot-screen"><div className="brand-mark">i</div><span>Menyiapkan ruang kerjamu...</span></div>;
  if (!user) return <Login onLogin={signIn} />;

  const isSeeker = user.role === "JOB_SEEKER";
  const nav = isSeeker
    ? [{ id: "jobs" as Page, label: "Cari pekerjaan", icon: Compass }, { id: "applications" as Page, label: "Lamaran saya", icon: FileText }]
    : [{ id: "company" as Page, label: "Dashboard", icon: BriefcaseBusiness }, { id: "companyCandidates" as Page, label: "Daftar kandidat", icon: Users }];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setPage(isSeeker ? "jobs" : "company"); setSelectedJob(null); }}>
          <span className="brand-mark">i</span><span>indokerja<span className="brand-dot">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switch"><div className="workspace-avatar">{isSeeker ? user.name.charAt(0) : (user.companyName || user.name).charAt(0)}</div><div className="workspace-copy"><strong>{isSeeker ? "Job seeker" : user.companyName || "Company"}</strong><span>{isSeeker ? "Mode pencari kerja" : "Recruitment workspace"}</span></div><ChevronDown size={15} /></div>
        <nav className="side-nav">
          <span className="nav-caption">MENU UTAMA</span>
          {nav.map((item) => <button key={item.id} title={item.label} aria-label={item.label} className={`nav-item ${page === item.id || (item.id === "jobs" && selectedJob) ? "active" : ""}`} onClick={() => { setPage(item.id); setSelectedJob(null); if (item.id === "companyCandidates") setCandidateJobFilter(null); }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "applications" && applications.length > 0 && <span className="nav-count">{applications.length}</span>}{item.id === "companyCandidates" && companyJobs.length > 0 && <span className="nav-count">{companyJobs.reduce((sum, job) => sum + (job._count?.applications ?? 0), 0)}</span>}</button>)}
          {!isSeeker && <button title="Buat lowongan" aria-label="Buat lowongan" className={`nav-item ${page === "create" ? "active" : ""}`} onClick={() => setPage("create")}><FilePlus2 size={18} strokeWidth={1.8} /><span>Buat lowongan</span></button>}
          <button title="Profil" aria-label="Profil" className={`nav-item ${page === "profile" ? "active" : ""}`} onClick={() => { setPage("profile"); setSelectedJob(null); }}><UserRound size={18} strokeWidth={1.8} /><span>Profil</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><Sparkles size={16} /></span><strong>Langkah berikutnya?</strong><p>{isSeeker ? "Pastikan informasi akunmu selalu terbaru." : "Pastikan identitas perusahaanmu selalu terbaru."}</p><button onClick={() => { setPage("profile"); setSelectedJob(null); }}>Perbarui profil <ArrowRight size={13} /></button></div>
          <div className="user-card"><div className="avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="user-meta"><strong>{user.name}</strong><span>{user.email}</span></div><button className="icon-button logout-button" title="Keluar" onClick={signOut}><LogOut size={17} /></button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{selectedJob ? "Detail lowongan" : pageTitle(page)}</strong></div><div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><div className="avatar small-avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div></div></header>
        <div className="content-area">
          {isSeeker && page === "jobs" && (selectedJob
            ? <JobDetail job={selectedJob} applied={applications.some((application) => application.job.id === selectedJob.id)} onBack={() => setSelectedJob(null)} onApplied={async () => { await loadApplications(); setPage("applications"); setSelectedJob(null); notify("Lamaran berhasil dikirim. Semoga sukses!"); }} onError={(message) => notify(message)} />
            : <JobBoard jobs={jobs} filters={filters} setFilters={setFilters} filterOpen={filterOpen} setFilterOpen={setFilterOpen} loading={loading} onSearch={loadJobs} onOpen={setSelectedJob} />)}
          {isSeeker && page === "applications" && <ApplicationsPage applications={applications} loading={loading} />}
          {!isSeeker && page === "company" && <CompanyDashboard user={user} jobs={companyJobs} loading={loading} onCreate={() => setPage("create")} onCandidates={openCandidates} onAllCandidates={openAllCandidates} />}
          {!isSeeker && page === "companyCandidates" && <CompanyApplicationsPage applications={companyApplications} jobs={companyJobs} jobFilterId={candidateJobFilter} error={companyApplicationsError} loading={loading} onClearJobFilter={() => setCandidateJobFilter(null)} onRefresh={refreshCompanyApplications} onStatus={updateStatus} />}
          {!isSeeker && page === "create" && <CreateJob onCancel={() => setPage("company")} onCreated={async () => { await loadCompanyJobs(); setPage("company"); notify("Lowongan baru berhasil diterbitkan."); }} onError={(message) => notify(message)} />}
          {page === "profile" && <ProfilePage user={user} onSave={async (profile) => {
            const response = await request<{ user: User }>("/auth/me", { method: "PATCH", body: JSON.stringify(profile) });
            setUser(response.user); notify("Profil berhasil diperbarui.");
          }} onError={(message) => notify(message)} />}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast("")}><X size={15} /></button></div>}
    </div>
  );
}

function pageTitle(page: Page) {
  return ({ jobs: "Cari pekerjaan", applications: "Lamaran saya", company: "Dashboard", companyCandidates: "Daftar kandidat", create: "Buat lowongan", profile: "Profil" } as const)[page];
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [role, setRole] = useState<Role>("JOB_SEEKER");
  const [email, setEmail] = useState("seeker@indokerja.id");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setAccount = (nextRole: Role) => {
    setRole(nextRole);
    setEmail(nextRole === "JOB_SEEKER" ? "seeker@indokerja.id" : "company@indokerja.id");
    setError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password, rememberMe }) });
      if (response.user.role !== role) {
        await request("/auth/logout", { method: "POST" });
        throw new Error("Pilih tipe akun yang sesuai dengan email ini.");
      }
      onLogin(response.user);
    } catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  };
  return <div className="login-page"><div className="login-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-orbit orbit-three"/><div className="art-top"><a className="brand light-brand"><span className="brand-mark">i</span><span>indokerja<span className="brand-dot">.</span></span></a><span className="art-tag">KARIER DIMULAI DI SINI</span></div><div className="art-content"><span className="eyebrow"><span/>Peluang baru menanti</span><h1>Temukan pekerjaan<br/>yang <em>berarti.</em></h1><p>Ruang untuk langkah berikutnya dalam perjalanan kariermu. Dibangun untuk talenta dan perusahaan Indonesia.</p><div className="art-stat-row"><div><strong>2</strong><small>Jenis akun</small></div><div className="stat-divider"/><div><strong>5</strong><small>Status seleksi</small></div></div></div><div className="art-note"><span className="note-check"><Check size={14}/></span><span>Langkah kecil hari ini,<br/><strong>karier besar esok hari.</strong></span><span className="note-spark">✳</span></div><div className="art-footer">© {new Date().getFullYear()} IndoKerja Indonesia</div></div>
    <div className="login-panel"><div className="login-mobile-brand"><span className="brand-mark">i</span><strong>indokerja<span className="brand-dot">.</span></strong></div><div className="login-form-wrap"><div className="welcome-copy"><span className="form-kicker">SELAMAT DATANG</span><h2>Masuk ke akunmu</h2><p>Belum punya akun? <button className="text-link" type="button" onClick={() => setError("Gunakan akun demo untuk mencoba aplikasi ini.")}>Lihat akun demo</button></p></div><div className="role-switch"><button className={role === "JOB_SEEKER" ? "selected" : ""} onClick={() => setAccount("JOB_SEEKER")} type="button"><BriefcaseBusiness size={16}/>Job seeker</button><button className={role === "COMPANY" ? "selected" : ""} onClick={() => setAccount("COMPANY")} type="button"><Building2 size={16}/>Company</button></div><form onSubmit={submit} className="login-form"><label>Email address<span className="required-dot">*</span><input value={email} type="email" onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Password<span className="required-dot">*</span><input value={password} type="password" onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={1}/></label><div className="form-options"><label className="remember-option"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}/>Ingat saya</label><button className="text-link" type="button" onClick={() => setError("Hubungi admin IndoKerja untuk mengatur ulang kata sandi.")}>Lupa password?</button></div>{error && <div className="form-error">{error}</div>}<button className="primary-button login-submit" disabled={loading}>{loading ? "Sedang masuk..." : "Masuk ke akun"}<ArrowRight size={17}/></button></form><div className="demo-hint"><span className="hint-icon"><Sparkles size={15}/></span><span><strong>Akun demo siap digunakan</strong><br/>Password untuk semua akun: <code>password123</code></span></div><div className="login-terms">Dengan masuk, kamu menyetujui <a href="#terms">Syarat Penggunaan</a> dan <a href="#privacy">Kebijakan Privasi</a>.</div></div></div></div>;
}

function JobBoard({ jobs, filters, setFilters, filterOpen, setFilterOpen, loading, onSearch, onOpen }: {
  jobs: Job[]; filters: { q: string; location: string; type: string }; setFilters: (value: { q: string; location: string; type: string }) => void;
  filterOpen: boolean; setFilterOpen: (value: boolean) => void; loading: boolean; onSearch: () => void; onOpen: (job: Job) => void;
}) {
  const [query, setQuery] = useState(filters.q);
  useEffect(() => setQuery(filters.q), [filters.q]);
  const submit = (event: FormEvent) => { event.preventDefault(); setFilters({ ...filters, q: query }); if (filters.q === query) void onSearch(); };
  return <>
    <section className="page-heading jobs-heading"><div><span className="section-kicker">TEMUKAN PELUANGMU</span><h1>Langkah karier dimulai <span>di sini.</span></h1><p>Temukan pekerjaan yang cocok dengan ambisi dan ceritamu.</p></div><div className="heading-illustration"><div className="illus-circle"><Compass size={29}/></div><span className="illus-star">✳</span><span className="illus-dot"/></div></section>
    <form className="search-panel" onSubmit={submit}><div className="search-field"><Search size={19}/><input placeholder="Posisi atau nama perusahaan" value={query} onChange={(event) => setQuery(event.target.value)}/></div><div className="search-divider"/><div className="search-field location-field"><MapPin size={18}/><input placeholder="Kota atau lokasi" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })}/></div><button className="filter-button" type="button" onClick={() => setFilterOpen(!filterOpen)}><Filter size={17}/><span>Filter</span>{filters.type && <i/>}</button><button className="primary-button search-button" type="submit">Cari pekerjaan <ArrowRight size={16}/></button>{filterOpen && <div className="filter-popover"><label>Jenis pekerjaan<select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">Semua jenis</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="filter-apply" type="button" onClick={() => { setFilterOpen(false); void onSearch(); }}>Terapkan filter</button></div>}</form>
    <div className="results-header"><div><h2>Lowongan untukmu <span className="result-count">{jobs.length}</span></h2><p>Kesempatan terbaru dari perusahaan pilihan</p></div><button className="sort-button" onClick={() => setFilters({ ...filters })}>Terbaru <ChevronDown size={15}/></button></div>
    {loading ? <div className="loading-state"><span className="loader"/>Memuat lowongan...</div> : jobs.length ? <div className="job-grid">{jobs.map((job, index) => <JobCard key={job.id} job={job} onClick={() => onOpen(job)} index={index}/>)}</div> : <EmptyState icon={<Search size={23}/>} title="Belum ada lowongan yang cocok" body="Coba kata kunci atau filter lokasi yang berbeda."/>}
    <div className="bottom-note"><span className="note-line"/><span>Kami menambahkan peluang baru setiap minggu</span><Sparkles size={14}/><span className="note-line"/></div>
  </>;
}

function JobCard({ job, onClick, index = 0 }: { job: Job; onClick: () => void; index?: number }) {
  const palette = ["mint", "peach", "lavender", "butter"];
  return <button className="job-card" onClick={onClick} style={{ animationDelay: `${index * 45}ms` }}><div className="job-card-top"><div className={`company-logo ${palette[index % palette.length]}`}>{companyOf(job).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><span className="job-posted">{dateLabel(job.createdAt)}</span></div><div className="job-title-wrap"><h3>{job.title}</h3><p>{companyOf(job)} <span className="verified-mark"><Check size={10}/></span></p></div><div className="job-badges"><span className="job-badge"><MapPin size={13}/>{job.location}</span><span className="job-badge type-badge">{typeLabels[job.type]}</span></div><div className="job-card-bottom"><span className="salary-label">{salaryLabel(job)}</span><span className="card-arrow"><ArrowRight size={17}/></span></div></button>;
}

function JobDetail({ job, applied, onBack, onApplied, onError }: { job: Job; applied: boolean; onBack: () => void; onApplied: () => void; onError: (message: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const apply = async () => {
    setSubmitting(true);
    try { await request("/applications", { method: "POST", body: JSON.stringify({ jobId: job.id, ...(coverLetter.trim() ? { coverLetter: coverLetter.trim() } : {}) }) }); onApplied(); }
    catch (error) { onError((error as Error).message); }
    finally { setSubmitting(false); }
  };
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/>Kembali ke lowongan</button><div className="detail-layout"><article className="detail-main"><div className="detail-hero"><div className="company-logo mint large-logo">{companyOf(job).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><span className="job-badge type-badge">{typeLabels[job.type]}</span><h1>{job.title}</h1><div className="detail-company">{companyOf(job)} <span className="verified-mark"><Check size={10}/></span><span className="detail-dot">·</span><MapPin size={14}/>{job.location}</div><div className="detail-salary">{salaryLabel(job)}</div></div><section className="detail-section"><h2>Tentang pekerjaan</h2><p className="job-description">{job.description}</p></section><section className="detail-section"><h2>Ringkasan posisi</h2><div className="summary-grid"><SummaryItem label="Jenis pekerjaan" value={typeLabels[job.type]}/><SummaryItem label="Lokasi kerja" value={job.location}/><SummaryItem label="Kisaran gaji" value={salaryLabel(job)}/><SummaryItem label="Dipublikasikan" value={dateLabel(job.createdAt)}/></div></section><section className="detail-section cover-letter-section"><h2>Pesan untuk perusahaan <span>Opsional</span></h2><textarea value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} maxLength={3000} placeholder="Ceritakan secara singkat kenapa posisi ini menarik untukmu..."/><span className="char-count">{coverLetter.length}/3000</span></section></article><aside className="apply-card"><span className="apply-kicker">LANGKAH BERIKUTNYA</span><h3>Posisi ini terasa cocok?</h3><p>Kirim lamaranmu dan mulai percakapan dengan tim {companyOf(job)}.</p><button className={`primary-button apply-button ${applied ? "success-button" : ""}`} onClick={apply} disabled={applied || submitting}>{applied ? <><CheckCircle2 size={17}/> Sudah dilamar</> : submitting ? "Mengirim..." : <>Lamar pekerjaan <ArrowRight size={16}/></>}</button><div className="apply-divider"/><div className="apply-detail"><span className="apply-detail-icon"><Clock3 size={16}/></span><span><strong>Diposting</strong><small>{dateLabel(job.createdAt)}</small></span></div><div className="apply-detail"><span className="apply-detail-icon"><Users size={16}/></span><span><strong>{job._count?.applications ?? 0} pelamar</strong><small>Bergabung dengan kandidat lainnya</small></span></div><div className="apply-tip"><Sparkles size={15}/><span>Pastikan profilmu sudah diperbarui sebelum melamar.</span></div></aside></div></div>;
}
function SummaryItem({ label, value }: { label: string; value: string }) { return <div className="summary-item"><span>{label}</span><strong>{value}</strong></div>; }

function ApplicationsPage({ applications, loading }: { applications: Application[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <><section className="page-heading compact-heading"><div><span className="section-kicker">JEJAK LANGKAHMU</span><h1>Lamaran <span>saya.</span></h1><p>Pantau setiap proses dari lamaran yang kamu kirim.</p></div><div className="heading-illustration small-illustration"><div className="illus-circle"><FileText size={25}/></div><span className="illus-star">✳</span></div></section><div className="application-summary"><div className="summary-mark"><FileText size={19}/></div><div><strong>{applications.length} lamaran terkirim</strong><span>Semua perjalanan kariermu, tersimpan di satu tempat.</span></div><span className="summary-deco">✳</span></div><div className="section-title-row"><div><h2>Riwayat lamaran</h2><p>Perbarui harapanmu sambil menunggu kabar terbaik.</p></div></div>{loading ? <div className="loading-state"><span className="loader"/>Memuat lamaran...</div> : applications.length ? <div className="application-list">{applications.map((application) => <article className="application-card" key={application.id}><div className={`company-logo small-company-logo ${application.status === "ACCEPTED" ? "mint" : "lavender"}`}>{companyOf(application.job).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div className="application-info"><h3>{application.job.title}</h3><p>{companyOf(application.job)} <span>·</span> {application.job.location}</p><div className="application-meta"><span><Clock3 size={13}/>Dilamar {dateLabel(application.createdAt)}</span><span className="meta-dot">·</span><span>{typeLabels[application.job.type]}</span></div>{expanded === application.id && <HistoryTimeline history={application.history}/>}</div><div className="application-status-side"><StatusBadge status={application.status}/><button className="history-toggle" onClick={() => setExpanded(expanded === application.id ? null : application.id)}>{expanded === application.id ? "Tutup riwayat" : "Lihat riwayat"}<ChevronDown size={14} className={expanded === application.id ? "rotate" : ""}/></button></div></article>)}</div> : <EmptyState icon={<FileText size={23}/>} title="Belum ada lamaran" body="Lowongan menarik sudah menanti. Mulai pencarian pertamamu hari ini."/>}<div className="bottom-note"><span className="note-line"/><span>Semoga langkah berikutnya membawa kabar baik</span><Sparkles size={14}/><span className="note-line"/></div></>;
}

function HistoryTimeline({ history }: { history: HistoryItem[] }) {
  return <div className="timeline">{history.length ? history.map((item, index) => <div className="timeline-item" key={item.id}><span className={`timeline-dot ${index === 0 ? "current" : ""}`}/><div><strong>{statusLabels[item.toStatus]}</strong><span>{item.note || (item.fromStatus ? `Status diperbarui dari ${statusLabels[item.fromStatus]}.` : "Lamaran berhasil dikirim.")}</span></div><time>{dateLabel(item.createdAt)}</time></div>) : <span className="no-history">Belum ada riwayat perubahan.</span>}</div>;
}

function CompanyDashboard({ user, jobs, loading, onCreate, onCandidates, onAllCandidates }: {
  user: User;
  jobs: Job[];
  loading: boolean;
  onCreate: () => void;
  onCandidates: (job: Job) => void;
  onAllCandidates: () => void;
}) {
  const applicantCount = jobs.reduce((total, job) => total + (job._count?.applications || 0), 0);
  return <>
    <section className="page-heading company-heading">
      <div>
        <span className="section-kicker">RECRUITMENT WORKSPACE</span>
        <h1>Selamat datang, <span>{user.companyName || user.name.split(" ")[0]}.</span></h1>
        <p>Temukan rekan kerja berikutnya untuk membangun hal besar.</p>
      </div>
      <button className="primary-button create-top-button" onClick={onCreate}><FilePlus2 size={17}/>Buat lowongan</button>
    </section>
    <div className="company-metrics">
      <MetricCard label="Lowongan aktif" value={String(jobs.length).padStart(2, "0")} icon={<BriefcaseBusiness size={18}/>} tone="green" caption="Peluang yang sedang dibuka"/>
      <button className="metric-card metric-card-action" onClick={onAllCandidates} aria-label={`Lihat ${applicantCount} kandidat`}>
        <span className="metric-icon peach"><Users size={18}/></span>
        <span className="metric-label">Total kandidat</span>
        <strong>{String(applicantCount).padStart(2, "0")}</strong>
        <small>Buka daftar kandidat →</small>
      </button>
      <MetricCard label="Perusahaan" value="✓" icon={<Building2 size={18}/>} tone="lavender" caption="Profil perusahaan aktif"/>
    </div>
    <div className="section-title-row company-title-row">
      <div><h2>Lowonganmu</h2><p>Kelola posisi dan tinjau kandidat yang masuk.</p></div>
      <div className="company-header-actions">
        <button className="inline-link" onClick={onAllCandidates}>Semua kandidat <ArrowRight size={15}/></button>
        <button className="inline-link" onClick={onCreate}>Tambah lowongan <ArrowRight size={15}/></button>
      </div>
    </div>
    {loading ? <div className="loading-state"><span className="loader"/>Memuat lowongan...</div> : jobs.length ? <div className="company-job-list">{jobs.map((job) => <article className="company-job-card" key={job.id}>
      <div className="company-job-main"><div className="company-logo mint">{companyOf(job).split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div><h3>{job.title}</h3><p>{job.location} <span>·</span> {typeLabels[job.type]}</p></div></div>
      <div className="company-job-salary">{salaryLabel(job)}</div>
      <div className="candidate-count"><Users size={16}/><strong>{job._count?.applications ?? 0}</strong><span>kandidat</span></div>
      <button className="outline-button" onClick={() => onCandidates(job)}>Lihat kandidat <ArrowRight size={14}/></button>
    </article>)}</div> : <EmptyState icon={<BriefcaseBusiness size={23}/>} title="Belum ada lowongan aktif" body="Buat lowongan pertamamu dan temukan kandidat yang tepat." action={<button className="primary-button" onClick={onCreate}>Buat lowongan <ArrowRight size={16}/></button>}/>}
    <div className="bottom-note"><span className="note-line"/><span>Talenta terbaik dimulai dari kesempatan yang tepat</span><Sparkles size={14}/><span className="note-line"/></div>
  </>;
}
function MetricCard({ label, value, icon, tone, caption }: { label: string; value: string; icon: ReactNode; tone: string; caption: string }) { return <div className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><div className="metric-label">{label}</div><strong>{value}</strong><small>{caption}</small></div>; }

function CompanyApplicationsPage({ applications, jobs, jobFilterId, error, loading, onClearJobFilter, onRefresh, onStatus }: {
  applications: Application[];
  jobs: Job[];
  jobFilterId: string | null;
  error: string;
  loading: boolean;
  onClearJobFilter: () => void;
  onRefresh: () => Promise<void>;
  onStatus: (applicationId: string, status: Status) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [selectedJobId, setSelectedJobId] = useState(jobFilterId || "");
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setSelectedJobId(jobFilterId || ""), [jobFilterId]);
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const filteredApplications = applications.filter((application) => {
    const candidate = application.candidate;
    const matchesQuery = !normalizedQuery || [candidate?.name, candidate?.email, application.job.title, application.job.location]
      .some((value) => value?.toLocaleLowerCase("id-ID").includes(normalizedQuery));
    const matchesJob = !selectedJobId || application.job.id === selectedJobId;
    return matchesQuery && matchesJob && (!statusFilter || application.status === statusFilter);
  });
  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  return <>
    <section className="page-heading compact-heading">
      <div><span className="section-kicker">RECRUITMENT WORKSPACE</span><h1>{selectedJob ? <>Kandidat <span>lowongan.</span></> : <>Daftar <span>kandidat.</span></>}</h1><p>{selectedJob ? `Pelamar untuk ${selectedJob.title}.` : "Semua pelamar untuk lowongan yang dikelola perusahaan Anda."}</p></div>
      <div className="candidate-total"><strong>{filteredApplications.length}</strong><span>ditampilkan</span></div>
    </section>
    <div className="company-applications-toolbar">
      <label className="candidate-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, atau lowongan" /></label>
      <label className="candidate-job-filter"><span>Lowongan</span><select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
        <option value="">Semua lowongan</option>
        {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
      </select></label>
      <label className="candidate-status-filter"><span>Filter status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | "")}>
        <option value="">Semua status</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {jobFilterId && <button className="clear-job-filter" onClick={onClearJobFilter}>Tampilkan semua kandidat</button>}
      <button className="outline-button refresh-candidates" onClick={() => { void onRefresh().catch(() => undefined); }} disabled={loading}><RefreshCw size={14}/>Muat ulang</button>
    </div>
    {loading ? <div className="loading-state"><span className="loader"/>Memuat daftar kandidat...</div> : error ? <EmptyState icon={<RefreshCw size={23}/>} title="Daftar kandidat gagal dimuat" body={error} action={<button className="primary-button" onClick={() => { void onRefresh().catch(() => undefined); }}>Coba lagi <RefreshCw size={14}/></button>}/> : filteredApplications.length ? <div className="candidate-list company-applications-list">{filteredApplications.map((application) => {
      const candidateName = application.candidate?.name || "Kandidat";
      const initials = candidateName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
      return <article className="candidate-card" key={application.id}>
        <div className="candidate-avatar">{initials}</div>
        <div className="candidate-info">
          <h3>{candidateName}</h3>
          <span>{application.candidate?.email || "Email tidak tersedia"}</span>
          <p className="candidate-job-meta"><strong>{application.job.title}</strong><span>{application.job.location} · Dilamar {dateLabel(application.createdAt)}</span></p>
          {application.coverLetter && <blockquote>“{application.coverLetter}”</blockquote>}
          {expanded === application.id && <HistoryTimeline history={application.history}/>}
        </div>
        <div className="candidate-actions">
          <StatusBadge status={application.status}/>
          <label className="status-select-label">Ubah status<select aria-label={`Ubah status ${candidateName}`} value={application.status} onChange={(event) => onStatus(application.id, event.target.value as Status)}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select><ChevronDown size={13}/></label>
          <button className="history-toggle" onClick={() => setExpanded(expanded === application.id ? null : application.id)}>
            {expanded === application.id ? "Tutup riwayat" : "Riwayat status"}<ChevronDown size={14} className={expanded === application.id ? "rotate" : ""}/>
          </button>
        </div>
      </article>;
    })}</div> : applications.length ? <EmptyState icon={<Search size={23}/>} title="Kandidat tidak ditemukan" body="Ubah kata kunci atau filter untuk melihat hasil lain."/> : selectedJob ? <EmptyState icon={<Users size={23}/>} title="Belum ada pelamar untuk lowongan ini" body="Pelamar untuk posisi ini akan muncul di sini setelah Job Seeker mengirim lamaran."/> : <EmptyState icon={<Users size={23}/>} title="Belum ada kandidat yang melamar" body="Lamaran untuk lowongan milik perusahaan Anda akan muncul di halaman ini."/>}
  </>;
}

function CreateJob({ onCancel, onCreated, onError }: { onCancel: () => void; onCreated: () => void; onError: (message: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", location: "", type: "FULL_TIME" as JobType, salaryMin: "", salaryMax: "", description: "" });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true);
    const body = { title: form.title, location: form.location, type: form.type, description: form.description, salaryMin: form.salaryMin ? Number(form.salaryMin) : null, salaryMax: form.salaryMax ? Number(form.salaryMax) : null };
    try { await request("/jobs", { method: "POST", body: JSON.stringify(body) }); onCreated(); }
    catch (error) { onError((error as Error).message); }
    finally { setSubmitting(false); }
  };
  return <div className="create-page"><button className="back-link" onClick={onCancel}><ArrowLeft size={16}/>Kembali ke dashboard</button><section className="page-heading create-heading"><div><span className="section-kicker">CARI REKAN BARU</span><h1>Buat lowongan <span>kerja.</span></h1><p>Bagikan detail posisi untuk bertemu talenta yang tepat.</p></div><div className="heading-illustration small-illustration"><div className="illus-circle"><FilePlus2 size={25}/></div><span className="illus-star">✳</span></div></section><form className="create-form" onSubmit={submit}><div className="form-section-title"><span className="form-section-icon"><BriefcaseBusiness size={17}/></span><div><h2>Detail pekerjaan</h2><p>Informasi utama yang akan dilihat oleh kandidat.</p></div></div><div className="create-grid"><label className="wide-field">Judul pekerjaan <span className="required-dot">*</span><input required minLength={3} maxLength={120} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Contoh: Product Designer"/></label><label>Lokasi <span className="required-dot">*</span><input required minLength={2} value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Contoh: Jakarta (Hybrid)"/></label><label>Jenis pekerjaan <span className="required-dot">*</span><select value={form.type} onChange={(event) => update("type", event.target.value)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Gaji minimum <span className="optional-label">Opsional · Rp/bulan</span><input type="number" min="0" value={form.salaryMin} onChange={(event) => update("salaryMin", event.target.value)} placeholder="Contoh: 8000000"/></label><label>Gaji maksimum <span className="optional-label">Opsional · Rp/bulan</span><input type="number" min="1" value={form.salaryMax} onChange={(event) => update("salaryMax", event.target.value)} placeholder="Contoh: 12000000"/></label><label className="wide-field description-field">Deskripsi pekerjaan <span className="required-dot">*</span><textarea required minLength={30} maxLength={10000} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Ceritakan tanggung jawab, kualifikasi, dan hal menarik dari posisi ini..."/><span className="char-count">{form.description.length}/10000</span></label></div><div className="create-footer"><span><span className="required-dot">*</span> Wajib diisi</span><div><button type="button" className="cancel-button" onClick={onCancel}>Batal</button><button disabled={submitting} className="primary-button">{submitting ? "Menerbitkan..." : "Terbitkan lowongan"}<ArrowRight size={16}/></button></div></div></form></div>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span/>{statusLabels[status]}</span>;
}
function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{body}</p>{action}</div>;
}

export default App;
