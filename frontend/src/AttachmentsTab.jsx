import { useEffect, useState } from "react";
import { api } from "./api";

export default function AttachmentsTab() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);

  async function refresh() {
    try { const r = await api.attachmentsList(); setItems(r || []); } catch (ex) { setNotice("❌ " + ex.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function upload() {
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      await api.attachmentUpload(file);
      setNotice("✅ DOSYA SİSTEME YÜKLENDİ"); setFile(null); await refresh();
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  async function del(id) {
    if (!confirm("Dosya kalıcı olarak silinsin mi?")) return;
    try { await api.attachmentDelete(id); refresh(); } catch (ex) { alert(ex.message); }
  }

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h3>📎 DOSYA YÜKLEME MERKEZİ</h3>
          <div style={{padding: 20, border: '2px dashed #444', borderRadius: 10, textAlign:'center'}}>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{color:'white'}} />
              <div style={{height:10}}></div>
              <button className="btn" disabled={busy || !file} onClick={upload}>SUNUCUYA YÜKLE</button>
          </div>
          {notice && <div className="notice" style={{ marginTop: 12 }}>{notice}</div>}
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h3>📂 YÜKLÜ DOSYALAR</h3>
          <hr />
          {items.length === 0 && <div className="notice">Kayıtlı dosya bulunamadı.</div>}
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {items.map((x) => (
                <div key={x.id} style={{display:'flex', justifyContent:'space-between', padding: 12, background:'rgba(255,255,255,0.03)', borderRadius: 6, alignItems:'center'}}>
                <div>
                    <div style={{fontWeight:'bold'}}>{x.original_name}</div>
                    <div className="small">{Math.round((x.size || 0) / 1024)} KB</div>
                </div>
                <button className="btn secondary" style={{padding:'6px 10px', fontSize:10}} onClick={() => del(x.id)}>X</button>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}