import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function extractPlaceholders(text) {
  const s = String(text || "");
  const matches = s.match(/\{[A-Za-z0-9_]+\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
}

export default function TemplatesTab() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState("Taslak 1");
  const [subject, setSubject] = useState("İş Birliği Hakkında");
  const [body, setBody] = useState("Merhaba {Yetkili},<br/><br/>...");

  const placeholders = useMemo(() => Array.from(new Set([...extractPlaceholders(subject), ...extractPlaceholders(body)])), [subject, body]);

  async function refresh() {
    try { const r = await api.templatesList(); setTemplates(r || []); } catch (ex) { setNotice("❌ " + ex.message); }
  }
  useEffect(() => { refresh(); }, []);

  function loadIntoForm(t) {
    setSelectedId(t.id); setName(t.name || ""); setSubject(t.subject || ""); setBody(t.body_html || "");
  }

  async function createNew() {
    setSelectedId(null); setName("Yeni Taslak"); setSubject("Konu Başlığı"); setBody("İçerik...");
  }

  async function save() {
    setBusy(true); setNotice("");
    try {
      const payload = { name, subject, body_html: body };
      if (selectedId) { await api.templateUpdate(selectedId, payload); setNotice("✅ ŞABLON GÜNCELLENDİ"); } 
      else { await api.templateCreate(payload); setNotice("✅ YENİ ŞABLON OLUŞTURULDU"); }
      await refresh();
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  async function del() {
    if (!selectedId || !confirm("Bu şablon silinsin mi?")) return;
    try { await api.templateDelete(selectedId); await createNew(); await refresh(); } catch (ex) { alert(ex.message); }
  }

  return (
    <div className="row">
      <div className="col" style={{ flex: '0 0 300px' }}>
        <div className="card" style={{height:'100%'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3>🧩 ARŞİV</h3>
            <button className="btn secondary" onClick={refresh} style={{fontSize:10}}>↻</button>
          </div>
          <hr />
          <div style={{display:'flex', flexDirection:'column', gap: 8}}>
            <button className="btn" onClick={createNew} style={{background: 'rgba(255,255,255,0.1)', border:'1px dashed #666'}}>+ YENİ ŞABLON</button>
            {templates.map((t) => (
                <div key={t.id} 
                    onClick={() => loadIntoForm(t)}
                    style={{ 
                        padding: 12, borderRadius: 8, cursor: "pointer", 
                        border: '1px solid',
                        borderColor: t.id === selectedId ? 'var(--tr-red)' : '#333',
                        background: t.id === selectedId ? 'rgba(227, 10, 23, 0.1)' : 'transparent'
                    }}>
                <div style={{fontWeight:'bold'}}>{t.name}</div>
                <div className="small" style={{marginTop:4, opacity:0.7}}>{t.subject.substring(0,30)}...</div>
                </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h3>✍️ EDİTÖR</h3>
          
          <label className="small">ŞABLON İSMİ (SİSTEM İÇİN)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

          <div style={{ height: 16 }} />
          <label className="small">E-POSTA KONUSU</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{fontWeight:'bold'}} />

          <div style={{ height: 16 }} />
          <label className="small">HTML İÇERİK</label>
          <textarea className="input" value={body} onChange={(e) => setBody(e.target.value)} style={{minHeight: 300, fontFamily:'monospace', lineHeight: 1.5}} />

          <div style={{ height: 16 }} />
          <div style={{background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 6}}>
             <span className="small">ALGILANAN DEĞİŞKENLER:</span> 
             {placeholders.length === 0 && <span className="small" style={{marginLeft: 5}}>-</span>}
             {placeholders.map((p) => <span key={p} className="badge" style={{color:'var(--tr-red)', borderColor:'var(--tr-red)'}}>{"{" + p + "}"}</span>)}
          </div>

          <hr />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" disabled={busy} onClick={save}>KAYDET</button>
            {selectedId && <button className="btn secondary" disabled={busy} onClick={del}>SİL</button>}
          </div>
          {notice && <div className="notice" style={{ marginTop: 12 }}>{notice}</div>}
        </div>
      </div>
    </div>
  );
}