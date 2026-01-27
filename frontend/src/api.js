const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}


export const api = {
  health: () => request("/health"),
  localLogin: (username, password) =>
    request("/api/auth/local-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username, password, password_confirm) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password, password_confirm }) }),
  verifyEmail: (token) => request(`/api/auth/verify?token=${encodeURIComponent(token)}`, { method: "GET" }),
  worldpassLogin: (email, password) =>
    request("/api/auth/worldpass-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  audienceList: () => request("/api/audience", { method: "GET" }),
  jobLogs: (id) => request(`/api/jobs/${id}/logs`, { method: "GET" }),
  audienceList: () => request("/api/audience", { method: "GET" }),


  uploadFile: (file) => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },
  audienceValidate: (file_id, email_column) =>
    request(`/api/audience/validate`, {
      method: "POST",
      body: JSON.stringify({ file_id, email_column }),
    }),
  smtpList: () => request("/api/smtp", { method: "GET" }),
  smtpTest: (payload) => request("/api/smtp/test", { method: "POST", body: JSON.stringify(payload) }),
  smtpAdd: (payload) => request("/api/smtp", { method: "POST", body: JSON.stringify(payload) }),
  smtpDelete: (id) => request(`/api/smtp/${id}`, { method: "DELETE" }),
  templatesList: () => request("/api/templates", { method: "GET" }),
  templateUpdate: (id, payload) => request(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  templateCreate: (payload) => request("/api/templates", { method: "POST", body: JSON.stringify(payload) }),
  templateDelete: (id) => request(`/api/templates/${id}`, { method: "DELETE" }),
  renderPreview: (payload) => request("/api/templates/render-preview", { method: "POST", body: JSON.stringify(payload) }),
  attachmentsList: () => request("/api/attachments", { method: "GET" }),
  attachmentUpload: (file) => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/api/attachments/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },
  attachmentDelete: (id) => request(`/api/attachments/${id}`, { method: "DELETE" }),
  audienceUpload: (file) => {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/api/audience/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },
  audienceDelete: (id) => request(`/api/audience/${id}`, { method: "DELETE" }),
  jobsList: () => request("/api/jobs", { method: "GET" }),
  dryRun: (payload) => request("/api/jobs/dry-run", { method: "POST", body: JSON.stringify(payload) }),
  startSend: (payload) => request("/api/jobs/start-send", { method: "POST", body: JSON.stringify(payload) }),
  jobDetail: (id) => request(`/api/jobs/${id}`, { method: "GET" }),
  jobCsvUrl: (id) => `${API_BASE}/api/jobs/${id}/csv`,
  jobDelete: (id) => request(`/api/jobs/${id}`, { method: "DELETE" }),
};
