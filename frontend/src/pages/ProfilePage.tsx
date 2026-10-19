import { useEffect, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: "JOB_SEEKER" | "COMPANY";
  companyName: string | null;
};
type ProfileUpdate = { name: string; companyName?: string };

export default function ProfilePage({ user, onSave, onError }: {
  user: ProfileUser;
  onSave: (profile: ProfileUpdate) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [saving, setSaving] = useState(false);
  const initials = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    setName(user.name);
    setCompanyName(user.companyName || "");
  }, [user.id, user.name, user.companyName]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const profile = { name: name.trim(), ...(user.role === "COMPANY" ? { companyName: companyName.trim() } : {}) };
      await onSave(profile);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return <>
    <section className="page-heading compact-heading"><div><span className="section-kicker">PENGATURAN AKUN</span><h1>Profil <span>saya.</span></h1><p>Kelola informasi dasar akun IndoKerja-mu.</p></div><div className="heading-illustration small-illustration"><div className="illus-circle"><UserRound size={25}/></div><span className="illus-star">✳</span></div></section>
    <form className="profile-card" onSubmit={submit}>
      <div className="profile-card-header"><div className="avatar profile-avatar">{initials}</div><div><h2>{user.role === "COMPANY" ? user.companyName || "Company" : user.name}</h2><p>{user.role === "COMPANY" ? "Akun perusahaan" : "Akun job seeker"}</p></div><span className="profile-role">{user.role === "COMPANY" ? "COMPANY" : "JOB SEEKER"}</span></div>
      <div className="profile-fields">
        <label>Nama lengkap<span className="required-dot">*</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} required /></label>
        <label>Email<input value={user.email} readOnly disabled /><small>Email akun demo tidak dapat diubah.</small></label>
        {user.role === "COMPANY" && <label className="profile-wide">Nama perusahaan<span className="required-dot">*</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} autoComplete="organization" minLength={2} maxLength={120} required /></label>}
      </div>
      <div className="profile-footer"><span>Perubahan disimpan ke database.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan perubahan"}</button></div>
    </form>
  </>;
}
