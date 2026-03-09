import { useEffect, useState } from "react";
import { api, setToken, getToken } from "./api";

// Bileşenleri import et (dosya yolların doğru olsun)
import AudienceTab from "./AudienceTab.jsx";
import TemplatesTab from "./TemplatesTab.jsx";
import AttachmentsTab from "./AttachmentsTab.jsx";
import SendTab from "./SendTab.jsx";
import LandingPage from "./LandingPage.jsx"; // Yeni dosyayı import et

const SMTP_PRESETS = {
  "Özel (Manuel Ayar)": { host: "", port: 587 },
  "Gmail": { host: "smtp.gmail.com", port: 587 },
  "Outlook / Hotmail": { host: "smtp.office365.com", port: 587 },
  "Yandex Mail": { host: "smtp.yandex.com", port: 587 },
  "IEEE (Google Altyapılı)": { host: "smtp.gmail.com", port: 587 },
  "Yahoo Mail": { host: "smtp.mail.yahoo.com", port: 587 },
  "Zoho Mail": { host: "smtp.zoho.com", port: 587 },
};

// Decode JWT payload (no signature verification — display only)
function getRoleFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1])).role;
  } catch {
    return null;
  }
}

// --- Login Component ---
function Login({ onDone, onBack }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function doLocal() {
    setBusy(true); setErr("");
    try {
      const r = await api.localLogin(u, p);
      setToken(r.token);
      onDone();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button className="btn ghost" onClick={onBack} style={{ position: 'absolute', top: 20, left: 20 }}>← Geri Dön</button>
      
      <div className="card" style={{ width: '100%', maxWidth: 450, position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 4, background: 'var(--tr-red)', position: 'absolute', top: 0, left: 0, right: 0 }}></div>
        
        <h2 style={{ textAlign: 'center', marginBottom: 5 }}>Giriş Yap</h2>
        <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', marginBottom: 30 }}>Heptapus Mailbot</div>

        <label className="small">Kullanıcı Adı</label>
        <input className="input" value={u} onChange={(ev) => setU(ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && doLocal()} />
        <div style={{ height: 15 }} />
        <label className="small">Şifre</label>
        <input className="input" type="password" value={p} onChange={(ev) => setP(ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && doLocal()} />
        <div style={{ height: 25 }} />
        <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={doLocal}>
          {busy ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>

        {err && <div className="notice" style={{ marginTop: 20, borderColor: 'red', color: '#ff6b6b' }}>{err}</div>}
      </div>
      <div style={{ marginTop: 20, opacity: 0.3 }}>
         <img src="https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg" width="24" style={{verticalAlign:'middle'}} />
      </div>
    </div>
  );
}

// --- SMTP Tab (Component değişmedi ama style.css ile görüntüsü değişecek) ---
function SMTPTab() {
  const [smtp, setSmtp] = useState([]);
  const [notice, setNotice] = useState("");
  const [provider, setProvider] = useState("Gmail");
  const preset = SMTP_PRESETS[provider] || { host: "", port: 587 };
  const [server, setServer] = useState(preset.host);
  const [port, setPort] = useState(preset.port);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setServer(preset.host); setPort(preset.port); }, [provider]);

  async function refresh() {
    try { const list = await api.smtpList(); setSmtp(list); } catch (ex) { setNotice("❌ " + ex.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function add() {
    setBusy(true); setNotice("");
    try {
      await api.smtpTest({ host: server, port: Number(port), email, password });
      await api.smtpAdd({ host: server, port: Number(port), email, password });
      setNotice("✅ Eklendi"); setEmail(""); setPassword(""); await refresh();
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  async function del(id) {
    if (!confirm("Silinsin mi?")) return;
    await api.smtpDelete(id); refresh();
  }

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h3>SMTP Hesabı Ekle</h3>
          <div className="row">
            <div className="col">
                <label className="small">Sağlayıcı</label>
                <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {Object.keys(SMTP_PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
            </div>
            <div className="col">
                 <label className="small">Email</label>
                 <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div style={{height:10}} />
          <div className="row">
             <div className="col">
                <label className="small">Host</label>
                <input className="input" value={server} onChange={(e) => setServer(e.target.value)} />
             </div>
             <div className="col" style={{flex:'0 0 80px'}}>
                <label className="small">Port</label>
                <input className="input" value={port} onChange={(e) => setPort(e.target.value)} />
             </div>
          </div>
          <div style={{height:10}} />
          <label className="small">Uygulama Şifresi</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div style={{height:15}} />
          <button className="btn" disabled={busy} onClick={add} style={{width:'100%'}}>Kaydet</button>
          {notice && <div className="notice" style={{marginTop:10}}>{notice}</div>}
        </div>
      </div>
      <div className="col">
        <div className="card">
          <h3>Kayıtlı Hesaplar</h3>
          {smtp.length === 0 && <div className="notice">Hesap yok.</div>}
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
             {smtp.map(x => (
                 <div key={x.id} style={{padding:12, background:'rgba(255,255,255,0.03)', borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                        <div style={{fontWeight:600}}>{x.email}</div>
                        <div className="small">{x.server}</div>
                    </div>
                    <button className="btn secondary" onClick={() => del(x.id)} style={{padding:'6px 10px', fontSize:'0.8rem'}}>Sil</button>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Users Tab (admin only) ---
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sender");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try { setUsers(await api.adminListUsers()); } catch (ex) { setNotice("❌ " + ex.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function addUser() {
    setBusy(true); setNotice("");
    try {
      await api.adminCreateUser(username.trim(), password, role);
      setNotice("✅ Kullanıcı oluşturuldu");
      setUsername(""); setPassword(""); setRole("sender");
      await refresh();
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  async function delUser(id) {
    if (!confirm("Bu kullanıcı silinsin mi?")) return;
    try { await api.adminDeleteUser(id); await refresh(); } catch (ex) { setNotice("❌ " + ex.message); }
  }

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h3>Kullanıcı Ekle</h3>
          <label className="small">Kullanıcı Adı</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          <div style={{ height: 10 }} />
          <label className="small">Şifre (en az 8 karakter)</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div style={{ height: 10 }} />
          <label className="small">Rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="sender">Gönderici (sender)</option>
            <option value="admin">Yönetici (admin)</option>
          </select>
          <div style={{ height: 15 }} />
          <button className="btn" disabled={busy} onClick={addUser} style={{ width: "100%" }}>
            {busy ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
          </button>
          {notice && <div className="notice" style={{ marginTop: 10 }}>{notice}</div>}
        </div>
      </div>
      <div className="col">
        <div className="card">
          <h3>Mevcut Kullanıcılar</h3>
          {users.length === 0 && <div className="notice">Kullanıcı yok.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map((u) => (
              <div key={u.id} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div className="small" style={{ opacity: 0.6 }}>{u.role}</div>
                </div>
                <button className="btn secondary" onClick={() => delUser(u.id)} style={{ padding: "6px 10px", fontSize: "0.8rem" }}>Sil</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Shell (Ana Dashboard) ---
function Shell({ onLogout }) {
  const [active, setActive] = useState("smtp");
  const isAdmin = getRoleFromToken() === "admin";

  return (
    <div className="container">
      <div className="hero-panel">
        <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>HEPTAPUS <span style={{ color: 'var(--tr-red)' }}>MAILBOT</span></h2>
        </div>
        <button className="btn secondary" onClick={onLogout}>Çıkış Yap</button>
      </div>

      <div className="tabs">
        <button className={"tab " + (active === "smtp" ? "active" : "")} onClick={() => setActive("smtp")}>SMTP Ayarları</button>
        <button className={"tab " + (active === "audience" ? "active" : "")} onClick={() => setActive("audience")}>Hedef Kitle</button>
        <button className={"tab " + (active === "templates" ? "active" : "")} onClick={() => setActive("templates")}>Şablonlar</button>
        <button className={"tab " + (active === "attachments" ? "active" : "")} onClick={() => setActive("attachments")}>Dosyalar</button>
        <button className={"tab " + (active === "send" ? "active" : "")} onClick={() => setActive("send")}>Gönderim & Rapor</button>
        {isAdmin && <button className={"tab " + (active === "users" ? "active" : "")} onClick={() => setActive("users")}>Kullanıcılar</button>}
      </div>

      {active === "smtp" && <SMTPTab />}
      {active === "audience" && <AudienceTab />}
      {active === "templates" && <TemplatesTab />}
      {active === "attachments" && <AttachmentsTab />}
      {active === "send" && <SendTab />}
      {active === "users" && isAdmin && <UsersTab />}
    </div>
  );
}

// --- Main App Logic ---
export default function App() {
  // 'landing', 'login', 'app'
  const [view, setView] = useState("landing");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Eğer token varsa direkt app'e git
    if (getToken()) {
      setReady(true);
      setView("app");
    }
  }, []);

  // Kullanıcı Landing Page'de "Giriş" dediğinde
  if (view === "landing") {
    return <LandingPage onEnterApp={() => setView(getToken() ? "app" : "login")} />;
  }

  // Token yoksa ve login istendiyse
  if (view === "login") {
    return (
      <Login 
        onDone={() => { setReady(true); setView("app"); }} 
        onBack={() => setView("landing")} 
      />
    );
  }

  // App
  return (
    <Shell
      onLogout={() => {
        setToken("");
        setView("landing"); // Çıkış yapınca landing'e dön
      }}
    />
  );
}