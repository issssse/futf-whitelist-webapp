import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Server as ServerIcon, Plus, CheckCircle, XCircle, Mail, User, Calendar, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as api from '@/lib/api';
import type { Server } from '@/lib/types';

const ADMIN_DOCS_URL = import.meta.env.VITE_ADMIN_DOCS_URL || '/docs/admin-operations.html';

interface Appeal {
  id: string;
  serverId: string;
  userEmail: string;
  minecraftName: string;
  realName: string | null;
  studentEmail: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  server: Server | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAppeal, setExpandedAppeal] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    loadData(token);
  }, []);

  const loadData = async (token: string) => {
    try {
      setLoading(true);
      const [serversRes, appealsRes] = await Promise.all([
        api.getServers(),
        api.getAppeals(token),
      ]);

      const sortedServers = (serversRes.data || []).sort((a: Server, b: Server) => {
        if (a.name.includes('Survival')) return -1;
        if (b.name.includes('Survival')) return 1;
        return a.name.localeCompare(b.name);
      });
      setServers(sortedServers);
      setAppeals(appealsRes.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        setIsAdmin(false);
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appealId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      await api.approveAppeal(appealId, token);
      toast({
        title: 'Success',
        description: 'Appeal approved successfully',
      });
      await loadData(token);
    } catch (error) {
      console.error('Error approving appeal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve appeal',
      });
    }
  };

  const handleReject = async (appealId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      await api.rejectAppeal(appealId, token);
      toast({
        title: 'Success',
        description: 'Appeal rejected successfully',
      });
      await loadData(token);
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject appeal',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>Please sign in to manage servers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.href = '/auth'}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Badge variant="secondary" className="mt-1">Administrator</Badge>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <a href={ADMIN_DOCS_URL} target="_blank" rel="noreferrer">
            <BookOpen className="w-4 h-4" />
            Admin Docs
          </a>
        </Button>
      </div>

      <div className="bg-muted/40 border-2 border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Pending Appeals</h2>
              <p className="text-sm text-muted-foreground">Review and manage server access requests</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">{appeals.length} pending</Badge>
        </div>

        {appeals.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center bg-background/50">
            <Mail className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No pending appeals</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {appeals.map((appeal) => (
              <Collapsible
                key={appeal.id}
                open={expandedAppeal === appeal.id}
                onOpenChange={(open) => setExpandedAppeal(open ? appeal.id : null)}
              >
                <div className="border border-border rounded-lg bg-card/50 hover:bg-card transition-colors">
                  <CollapsibleTrigger className="w-full">
                    <div className="p-3 cursor-pointer">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-md bg-muted">
                            <User className="w-4 h-4 text-foreground" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {appeal.minecraftName}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                {appeal.server?.name || appeal.serverId}
                              </Badge>
                              <span className="truncate">{appeal.userEmail}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                          <Calendar className="w-3 h-3" />
                          {new Date(appeal.createdAt).toLocaleDateString()} {new Date(appeal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                      <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-md">
                        <div>
                          <span className="text-muted-foreground text-xs block mb-1">Real Name</span>
                          <p className="font-medium">{appeal.realName || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block mb-1">Student Email</span>
                          <p className="font-medium truncate">{appeal.studentEmail || 'Not provided'}</p>
                        </div>
                      </div>
                      {appeal.reason && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <span className="text-muted-foreground text-xs block mb-1">Reason</span>
                          <p className="text-sm">{appeal.reason}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(appeal.id)}
                          className="gap-2 flex-1"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(appeal.id)}
                          variant="destructive"
                          className="gap-2 flex-1"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ServerIcon className="w-5 h-5" />
                Servers
              </CardTitle>
              <CardDescription>Manage server configurations</CardDescription>
            </div>
            <Button onClick={() => navigate('/admin/server/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              New Server
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {servers.map((server) => (
            <Card key={server.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ServerIcon className="w-5 h-5" />
                      {server.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{server.description}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/server/${server.id}`)}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <span className="text-muted-foreground">IP:</span>
                  <span className="ml-2 font-mono">{server.ip}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
