import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

export default function SendTab() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [smtp, setSmtp] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [audienceList, setAudienceList] = useState([]);

  // Selections
  const [audienceFileId, setAudienceFileId] = useState("");
  const [audienceCols, setAudienceCols] = useState([]);
  const [emailColumn, setEmailColumn] = useState("");
  const [smtpId, setSmtpId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [campName, setCampName] = useState("Kampanya - " + new Date().toLocaleDateString());
  const [dryRun, setDryRun] = useState(true);
  const [selectedAtt, setSelectedAtt] = useState([]);
  const [ccCsv, setCcCsv] = useState("");

  // Jobs
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);

  function getSelectedTemplate() {
    if (!templateId) return null;
    return templates.find((x) => String(x.id) === String(templateId)) || null;
  }

  async function refreshAll() {
    try {
      const [s, t, a, au] = await Promise.all([api.smtpList(), api.templatesList(), api.attachmentsList(), api.audienceList()]);
      setSmtp(s || []); setTemplates(t || []); setAttachments(a || []); setAudienceList(au || []);
    } catch (ex) { setNotice("❌ " + ex.message); }
  }

  async function refreshJobs() { try { const r = await api.jobsList(); setJobs(r || []); } catch {} }

  useEffect(() => { refreshAll(); refreshJobs(); const t = setInterval(refreshJobs, 3000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!audienceFileId) { setAudienceCols([]); setEmailColumn(""); return; }
    const f = audienceList.find((x) => String(x.id) === String(audienceFileId));
    const cols = (f && Array.isArray(f.columns)) ? f.columns : [];
    setAudienceCols(cols);
    const guess = cols.find((c) => String(c).toLowerCase().includes("mail")) || cols[0] || "";
    setEmailColumn(guess);
  }, [audienceFileId, audienceList]);

  async function start() {
    setBusy(true); setNotice("");
    try {
      const tpl = getSelectedTemplate();
      const payload = {
        name: campName, subject: tpl ? tpl.subject : subject, body_html: tpl ? tpl.body_html : bodyHtml,
        audience_file_id: Number(audienceFileId), email_column: emailColumn,
            dry_run: !!dryRun, attachments: selectedAtt.map(Number),
            cc_csv: ccCsv || "",
        smtp_account_id: dryRun ? null : Number(smtpId)
      };
      if (!payload.audience_file_id) throw new Error("Hedef Kitle seçilmedi!");
      if (!payload.dry_run && !payload.smtp_account_id) throw new Error("Gerçek gönderim için SMTP seçmelisin!");

      const r = await api.startSend(payload);
      setNotice(`✅ GÖREV BAŞLATILDI: ID #${r.id}`);
      await refreshJobs();
    } catch (ex) { setNotice("❌ " + ex.message); } finally { setBusy(false); }
  }

  async function openJob(id) {
    setActiveJobId(id);
    try { const d = await api.jobDetail(id); setJobDetail(d); } catch (ex) { alert(ex.message); }
  }

    return (
      <div className="row">
     <div className="col" style={{ flex: 2 }}>
       <div className="card" style={{ borderTop: '4px solid var(--tr-red)' }}>
      <h3>🚀 OPERASYON MERKEZİ</h3>
          
      <div className="row">
        <div className="col">
          <label className="small">KAMPANYA ADI</label>
          <input className="input" value={campName} onChange={(e) => setCampName(e.target.value)} />
        </div>
        <div className="col">
          <label className="small">HEDEF KİTLE</label>
          <select className="input" value={audienceFileId} onChange={(e) => setAudienceFileId(e.target.value)}>
          <option value="">Seçiniz...</option>
          {audienceList.map((a) => <option key={a.id} value={a.id}>#{a.id} — {a.original_name}</option>)}
          </select>
        </div>
        <div className="col">
          <label className="small">MAIL SÜTUNU</label>
          <select className="input" value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)}>
          {audienceCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col">
          <label className="small">CC (virgülle ayrılmış)</label>
          <input className="input" value={ccCsv} onChange={(e) => setCcCsv(e.target.value)} placeholder="a@x.com,b@y.com" />
        </div>
      </div>

      <hr />

      <div className="row">
             <div className="col">
                <label className="small">ŞABLON SEÇİMİ</label>
                <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">-- Manuel Giriş --</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
             <div className="col">
                <label className="small">DOSYA EKLERİ</label>
                <select className="input" multiple value={selectedAtt} onChange={(e) => setSelectedAtt(Array.from(e.target.selectedOptions).map(o => o.value))} style={{height: 42}}>
                    {attachments.map((a) => <option key={a.id} value={a.id}>{a.original_name}</option>)}
                </select>
             </div>
          </div>

          {!templateId && (
            <div style={{marginTop: 15, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 6}}>
              <label className="small">KONU</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <div style={{height:8}}></div>
              <label className="small">İÇERİK</label>
              <textarea className="input" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} style={{height: 100}} />
            </div>
          )}

          <hr />

          <div style={{ background: dryRun ? 'rgba(50,200,50,0.1)' : 'rgba(227,10,23,0.1)', padding: 15, borderRadius: 8, border: '1px solid', borderColor: dryRun ? 'green' : 'var(--tr-red)' }}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <label style={{display:'flex', alignItems:'center', gap: 10, cursor:'pointer', fontWeight:'bold', fontSize: 14}}>
                    <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} style={{width:20, height:20}} />
                    SİMÜLASYON MODU (DRY RUN)
                </label>
                {!dryRun && (
                    <div style={{width: 300}}>
                        <select className="input" value={smtpId} onChange={(e) => setSmtpId(e.target.value)} style={{borderColor: 'var(--tr-red)'}}>
                            <option value="">-- SMTP SEÇİNİZ --</option>
                            {smtp.map((s) => <option key={s.id} value={s.id}>{s.email} ({s.host})</option>)}
                        </select>
                    </div>
                )}
            </div>
            <div className="small" style={{marginTop: 5, marginLeft: 30}}>
                {dryRun ? "E-postalar gönderilmez, sadece sistem testi yapılır." : "DİKKAT! Bu işlem gerçek e-posta gönderimi yapacaktır."}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn" disabled={busy} onClick={start} style={{width:'100%', fontSize: 16, padding: 16}}>
                {busy ? "İŞLENİYOR..." : "OPERASYONU BAŞLAT"}
            </button>
          </div>
          {notice && <div className="notice" style={{ marginTop: 12 }}>{notice}</div>}
        </div>
      </div>

      <div className="col" style={{ flex: 1 }}>
        <div className="card" style={{height:'100%', overflow:'hidden', display:'flex', flexDirection:'column'}}>
          <h3>📜 GÖREV KAYITLARI</h3>
          <div style={{overflowY:'auto', flex:1}}>
             {jobs.length === 0 && <div className="notice">Kayıt yok.</div>}
             {jobs.map((j) => (
                <div key={j.id} onClick={() => openJob(j.id)}
                  style={{
                      padding: 10, marginBottom: 8, borderRadius: 6, cursor: 'pointer',
                      background: j.id === activeJobId ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
                      borderLeft: j.dry_run ? '3px solid green' : '3px solid var(--tr-red)'
                  }}>
                  <div style={{fontWeight:'bold'}}>#{j.id} {j.name}</div>
                  <div className="small">{j.status} • {j.success}/{j.total} Başarılı</div>
                  <div className="small" style={{opacity:0.5}}>{j.created_at.slice(0,16).replace('T',' ')}</div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {jobDetail && (
        <div className="col" style={{flex: 1}}>
             <div className="card" style={{height:'100%', overflowY:'auto'}}>
                <h3>DETAY RAPORU #{jobDetail.id}</h3>
                <div className="small">STATÜ: {jobDetail.status}</div>
                <hr/>
                <div style={{display:'flex', gap: 10, marginBottom: 10}}>
                     <a className="btn secondary" href={api.jobCsvUrl(jobDetail.id)} target="_blank">CSV İNDİR</a>
                     <button className="btn secondary" onClick={async () => { if(confirm('Silinecek?')) { await api.jobDelete(jobDetail.id); setJobDetail(null); refreshJobs(); }}}>SİL</button>
                </div>
                <div style={{background: 'black', padding: 10, borderRadius: 6, fontSize: 12, fontFamily: 'monospace'}}>
                    {(jobDetail.logs || []).map((l, i) => (
                        <div key={i} style={{marginBottom: 4, borderBottom: '1px solid #222'}}>
                            <span style={{color:'var(--tr-red)'}}>[{l.status}]</span> {l.email}
                        </div>
                    ))}
                </div>
             </div>
        </div>
      )}
    </div>
  );
}