import api from './api';

export async function checkServerStatus(serverId: string): Promise<boolean> {
  try {
    const response = await api.getServerStatus(serverId);
    return response.data.online;
  } catch (error) {
    console.error('Error checking server status:', error);
    return false;
  }
}
