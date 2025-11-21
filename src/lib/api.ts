import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// User endpoints
export const login = (email: string) => 
  api.post('/user/login', { email });

export const getProfile = (userId: string) => 
  api.get(`/user/profile/${userId}`);

export const updateProfile = (userId: string, data: { realName?: string; minecraftName?: string }) =>
  api.put(`/user/profile/${userId}`, data);

// Auth endpoints
export const verify = (token: string) => 
  api.get(`/auth/verify?token=${token}`);

export const registerUser = (payload: {
  email: string;
  minecraftName: string;
  realName?: string;
  serverId: string;
}) => api.post('/auth/register', payload);

// Server endpoints
export const getServers = () => 
  api.get('/servers');

export const getServer = (serverId: string) => 
  api.get(`/servers/${serverId}`);

export const acceptRules = (serverId: string, userId: string) =>
  api.post(`/servers/${serverId}/accept-rules`, { userId });

export const getServerStatus = (serverId: string) =>
  api.get(`/servers/${serverId}/status`);

export const createServer = (data: any, token: string) =>
  api.post('/servers', data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateServer = (serverId: string, data: any, token: string) =>
  api.put(`/servers/${serverId}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteServer = (serverId: string, token: string) =>
  api.delete(`/servers/${serverId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const reorderServers = (order: string[], token: string) =>
  api.post('/servers/reorder', { order }, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Upgrade endpoints
export const requestUpgrade = (data: {
  userId: string;
  requestedLevel: string;
  email: string;
  realName: string;
  note?: string;
}) => api.post('/upgrade/request', data);

export const verifyUpgrade = (token: string) =>
  api.get(`/upgrade/verify?token=${token}`);

// OTP endpoints
export const sendOtp = (email: string) =>
  api.post('/otp/send', { email });

export const verifyOtp = (email: string, code: string) =>
  api.post('/otp/verify', { email, code });

// Orbi membership
export const checkOrbiMembership = (email: string) =>
  api.get('/orbi/check', { params: { email } });

export const reloadOrbiMembership = (token: string) =>
  api.post('/orbi/reload', {}, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getOrbiStats = (token: string) =>
  api.get('/orbi/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });

// Appeals
export const createAppeal = (data: {
  serverId: string;
  email: string;
  minecraftName: string;
  realName: string;
  note?: string;
}) => api.post('/appeals', data);

export const getAppeals = (token: string) =>
  api.get('/appeals', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const approveAppeal = (id: string, token: string) =>
  api.post(`/appeals/${id}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const rejectAppeal = (id: string, token: string) =>
  api.post(`/appeals/${id}/reject`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Admin endpoints
export const adminLogin = (credentials: { identifier: string; password: string }) =>
  api.post('/admin/login', credentials);

export const getAccessRequests = (token: string) =>
  api.get('/admin/access-requests', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const approveRequest = (id: string, token: string) =>
  api.post(`/admin/access-requests/${id}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const rejectRequest = (id: string, token: string) =>
  api.post(`/admin/access-requests/${id}/reject`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });

export default {
  login,
  getProfile,
  updateProfile,
  verify,
  registerUser,
  getServers,
  getServer,
  acceptRules,
  getServerStatus,
  createServer,
  updateServer,
  deleteServer,
  requestUpgrade,
  verifyUpgrade,
  sendOtp,
  reorderServers,
  verifyOtp,
  createAppeal,
  getAppeals,
  approveAppeal,
  rejectAppeal,
  adminLogin,
  getAccessRequests,
  approveRequest,
  rejectRequest,
  checkOrbiMembership,
  reloadOrbiMembership,
  getOrbiStats,
  api,
};
