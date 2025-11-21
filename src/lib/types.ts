export interface Server {
  id: string;
  name: string;
  description: string;
  ip: string;
  accessLevel: 'public' | 'open' | 'student' | 'verified' | 'member';
  requiredEmailDomain?: string;
  contact?: string;
  rules: string[];
  appealPolicy?: 'always' | 'non_student' | 'non_member' | 'never';
  order?: number;
}

export interface User {
  id: number;
  email: string;
  minecraftName: string;
  realName?: string;
  isStudent: boolean;
  verified: boolean;
  createdAt: string;
  serverAccess?: ServerAccess[];
  accessRequests?: AccessRequest[];
}

export interface ServerAccess {
  id: number;
  userId: number;
  serverId: string;
  rulesAccepted: boolean;
  acceptedAt?: string;
}

export interface AccessRequest {
  id: number;
  userId: number;
  requestedLevel: string;
  email: string;
  realName: string;
  note?: string;
  verified: boolean;
  approved?: boolean;
  reviewedAt?: string;
  reviewedBy?: number;
  createdAt: string;
  user?: User;
}
