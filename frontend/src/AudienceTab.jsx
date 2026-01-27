import { useEffect, useState } from "react";
import { api } from "./api";

export default function AudienceTab() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [cols, setCols] = useState([]);
  const [preview, setPreview] = useState([]);
  const [rows, setRows] = useState(0);
  const [emailCol, setEmailCol] = useState("");
  const [validInfo, setValidInfo] = useState(null);
  const [audienceItems, setAudienceItems] = useState([]);

  async function refreshAudienceList() {
    try { const r = await api.audienceList(); setAudienceItems(r || []); } catch {}
  }

  useEffect(() => { refreshAudienceList(); }, []);

  async function upload() {
    if (!file) return;
    setBusy(true); setNotice(""); setValidInfo(null);
    try {
      const r = await api.audienceUpload(file);
      setFileId(r.id); setCols(r.columns || []); setEmailCol((r.columns || [])[0] || "");
      setPreview([]); setRows(0);
      setNotice("✅ VERİ TABANI GÜNCELLENDİ");
      await refreshAudienceList();
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  async function validate() {
    if (!fileId || !emailCol) return;
    setBusy(true); setNotice("");
    try {
      const r = await api.audienceValidate(fileId, emailCol);
      setValidInfo(r);
      if (Array.isArray(r.preview)) setPreview(r.preview);
      if (typeof r.preview_rows === "number") setRows(r.preview_rows);
      else if (typeof r.previewRows === "number") setRows(r.previewRows);
      if (Array.isArray(r.columns) && r.columns.length) setCols(r.columns);
      setNotice("✅ DOĞRULAMA TAMAMLANDI");
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h3>📂 HEDEF KİTLE VERİ YÜKLEME</h3>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 8, border: '1px dashed #444' }}>
              <label className="small">YENİ EXCEL DOSYASI (.XLSX)</label>
              <div style={{display:'flex', gap: 10}}>
                <input className="input" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{border:'none'}} />
                <button className="btn" disabled={busy || !file} onClick={upload}>YÜKLE</button>
              </div>
          </div>

          <hr />

          <label className="small">SİSTEMDEKİ DOSYALAR</label>
          <div style={{display:'flex', gap: 10, alignItems: 'center'}}>
            <select className="input" value={fileId || ""} onChange={(e) => setFileId(Number(e.target.value) || null)}>
                <option value="">-- DOSYA SEÇİN --</option>
                {audienceItems.map((a) => (
                <option key={a.id} value={a.id}>#{a.id} — {a.original_name}</option>
                ))}
            </select>
            <button className="btn secondary" disabled={!fileId} onClick={async () => {
                if (!fileId || !confirm('VERİ SİLİNSİN Mİ?')) return;
                try { await api.audienceDelete(fileId); setFileId(null); refreshAudienceList(); } catch(e){ alert(e.message) }
            }}>SİL</button>
          </div>

          <div style={{ height: 16 }} />

          <label className="small">E-POSTA SÜTUNU (MAIL COLUMN)</label>
          <select className="input" value={emailCol} onChange={(e) => setEmailCol(e.target.value)} disabled={!cols.length}>
            {cols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div style={{ height: 16 }} />
          <button className="btn" style={{width:'100%'}} disabled={busy || !fileId} onClick={validate}>VERİLERİ DOĞRULA & ANALİZ ET</button>

          {validInfo && (
            <div className="notice" style={{ marginTop: 16, display:'flex', gap: 20, justifyContent:'space-around', textAlign:'center' }}>
              <div><div className="small">TOPLAM</div><b>{validInfo.total}</b></div>
              <div style={{color:'lightgreen'}}><div className="small">GEÇERLİ</div><b>{validInfo.valid}</b></div>
              <div style={{color:'salmon'}}><div className="small">HATALI</div><b>{validInfo.invalid}</b></div>
            </div>
          )}
          {notice && <div className="notice" style={{ marginTop: 12 }}>{notice}</div>}
        </div>
      </div>

      <div className="col">
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between'}}>
             <h3>👀 VERİ ÖNİZLEME</h3>
             <span className="badge">{rows} KAYIT</span>
          </div>
          <hr />
          {preview.length === 0 ? (
             <div className="notice" style={{opacity:0.5}}>Veri görüntülemek için doğrulama yapınız.</div>
          ) : (
            <div style={{ overflowX: "auto", border: '1px solid #333', borderRadius: 8 }}>
              <table style={{width:'100%'}}>
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.05)'}}>
                    {Object.keys(preview[0]).map((k) => <th key={k}>{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(preview[0]).map((k) => <td key={k}>{String(row[k] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}