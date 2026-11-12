const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('online-shop-token');
  const headers = { ...(options.body instanceof FormData ? {} : options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || 'Phản hồi máy chủ không hợp lệ.' }; }
  if (!response.ok) throw new Error(data.message || `Yêu cầu thất bại (${response.status}).`);
  return data;
}

export const money = (value = 0) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export const date = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const imageUrl = (value) => value?.startsWith('/uploads/') ? value : value || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80';
