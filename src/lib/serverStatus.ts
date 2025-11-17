import api from './api';

export interface ServerStatusResult {
  online: boolean | null;
  pending: boolean;
  checkedAt: string | null;
  players?: {
    online: number | null;
    max: number | null;
  } | null;
  version?: string | null;
  motd?: string | null;
  latency?: number | null;
}

export async function checkServerStatus(serverId: string): Promise<ServerStatusResult> {
  try {
    const response = await api.getServerStatus(serverId);
    const {
      online = null,
      pending = false,
      checkedAt = null,
      players = null,
      version = null,
      motd = null,
      latency = null,
    } = response.data || {};
    return {
      online,
      pending,
      checkedAt,
      players,
      version,
      motd,
      latency,
    };
  } catch (error) {
    console.error('Error checking server status:', error);
    return {
      online: false,
      pending: false,
      checkedAt: null,
      players: null,
      version: null,
      motd: null,
      latency: null,
    };
  }
}
