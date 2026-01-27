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

// --- Login Component (Sadeleştirilmiş) ---
function Login({ onDone, onBack }) {
  const [tab, setTab] = useState("local");
  const [u, setU] = useState("admin");
  const [p, setP] = useState("admin123!");
  const [p2, setP2] = useState("");
  const [e, setE] = useState("");
  const [pw, setPw] = useState("");
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

  async function doWp() {
    setBusy(true); setErr("");
    try {
      const r = await api.worldpassLogin(e, pw);
      setToken(r.token);
      onDone();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  async function doRegister() {
    setBusy(true); setErr("");
    try {
      if (p !== p2) throw new Error("Şifreler uyuşmuyor");
      const r = await api.register(u, p, p2);
      // store token and optionally show verification token
      setToken(r.token);
      if (r.verify_token) {
        // show a notice to user to verify their email
        alert("Kayıt başarılı. Doğrulama token'ınız: " + r.verify_token + "\nLütfen 'WorldPass' veya doğrulama endpoint'ini kullanarak e-posta doğrulayın.");
      }
      onDone();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button className="btn ghost" onClick={onBack} style={{ position: 'absolute', top: 20, left: 20 }}>← Geri Dön</button>
      
      <div className="card" style={{ width: '100%', maxWidth: 450, position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 4, background: 'var(--tr-red)', position: 'absolute', top: 0, left: 0, right: 0 }}></div>
        
        <h2 style={{ textAlign: 'center', marginBottom: 5 }}>Yönetici Girişi</h2>
        <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', marginBottom: 30 }}>Heptapus Mailbot</div>

        <div className="tabs" style={{ justifyContent: 'center' }}>
          <button className={"tab " + (tab === "local" ? "active" : "")} onClick={() => setTab("local")}>Yerel Hesap</button>
          <button className={"tab " + (tab === "register" ? "active" : "")} onClick={() => setTab("register")}>Kayıt Ol</button>
          <button className={"tab " + (tab === "wp" ? "active" : "")} onClick={() => setTab("wp")}>WorldPass ID</button>
        </div>

        {tab === "local" && (
          <>
            <label className="small">Kullanıcı Adı</label>
            <input className="input" value={u} onChange={(ev) => setU(ev.target.value)} />
            <div style={{ height: 15 }} />
            <label className="small">Şifre</label>
            <input className="input" type="password" value={p} onChange={(ev) => setP(ev.target.value)} />
            <div style={{ height: 25 }} />
            <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={doLocal}>
              {busy ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </button>
          </>
        )}

        {tab === "wp" && (
          <>
            <label className="small">WorldPass Email</label>
            <input className="input" value={e} onChange={(ev) => setE(ev.target.value)} />
            <div style={{ height: 15 }} />
            <label className="small">Şifre</label>
            <input className="input" type="password" value={pw} onChange={(ev) => setPw(ev.target.value)} />
            <div style={{ height: 25 }} />
            <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={doWp}>
              {busy ? "Bağlanılıyor..." : "Bağlan"}
            </button>
          </>
        )}

        {tab === "register" && (
          <>
            <label className="small">Kullanıcı Adı (e-posta önerilir)</label>
            <input className="input" value={u} onChange={(ev) => setU(ev.target.value)} />
            <div style={{ height: 15 }} />
            <label className="small">Şifre (en az 8 karakter)</label>
            <input className="input" type="password" value={p} onChange={(ev) => setP(ev.target.value)} />
            <div style={{ height: 10 }} />
            <label className="small">Şifre (tekrar)</label>
            <input className="input" type="password" value={p2} onChange={(ev) => setP2(ev.target.value)} />
            <div style={{ height: 25 }} />
            <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={doRegister}>
              {busy ? "Kayıt Oluşturuluyor..." : "Kayıt Ol"}
            </button>
            {/** Show verification token if returned in response (dev) */}
            {err && <div className="notice" style={{ marginTop: 12 }}>{err}</div>}
          </>
        )}

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

// --- Shell (Ana Dashboard) ---
function Shell({ onLogout }) {
  const [active, setActive] = useState("smtp");

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
      </div>

      {active === "smtp" && <SMTPTab />}
      {active === "audience" && <AudienceTab />}
      {active === "templates" && <TemplatesTab />}
      {active === "attachments" && <AttachmentsTab />}
      {active === "send" && <SendTab />}
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