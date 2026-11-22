import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API });

// Uploaded photos live on the API host: prefix it when frontend and backend are on different domains
export const fileUrl = (p) => (p ? API.replace(/\/api\/?$/, '') + p : null);
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

export const errMsg = (e) => e.response?.data?.message || e.message;

// Authenticated file download (PDF badge, CSV export)
export async function download(path, filename, params) {
  const r = await api.get(path, { responseType: 'blob', params });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
export default api;
