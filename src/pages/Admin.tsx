import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Server as ServerIcon, Plus, CheckCircle, XCircle, Mail, User, Calendar, BookOpen, ArrowUp, ArrowDown, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as api from '@/lib/api';
import type { Server } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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
  const [orbiStats, setOrbiStats] = useState<{ count: number; updatedAt?: string | null }>({ count: 0, updatedAt: null });
  const [orbiDialogOpen, setOrbiDialogOpen] = useState(false);
  const [orbiFileName, setOrbiFileName] = useState('');
  const [orbiCsv, setOrbiCsv] = useState<string>('');
  const [orbiSummary, setOrbiSummary] = useState<any | null>(null);
  const [orbiPreview, setOrbiPreview] = useState<Array<{ name: string; email: string; status: string; validFrom: string }>>([]);
  const [orbiAnalyzing, setOrbiAnalyzing] = useState(false);
  const [orbiUpdating, setOrbiUpdating] = useState(false);
  const lastUpdatedDate = orbiStats.updatedAt ? new Date(orbiStats.updatedAt).toLocaleDateString() : 'Unknown';

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
      const [serversRes, appealsRes, orbiRes] = await Promise.all([
        api.getServers(),
        api.getAppeals(token),
        api.getOrbiStats(token),
      ]);

      const sortedServers = (serversRes.data || [])
        .map((srv: Server & { order?: number }, index: number) => ({
          ...srv,
          order: typeof srv.order === 'number' ? srv.order : index,
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setServers(sortedServers);
      setAppeals(appealsRes.data || []);
      setOrbiStats({
        count: orbiRes.data?.count || 0,
        updatedAt: orbiRes.data?.updatedAt || null,
      });
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

  const handleReorder = async (serverId: string, direction: 'up' | 'down') => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const index = servers.findIndex((s) => s.id === serverId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= servers.length) return;

    const previous = [...servers];
    const next = [...servers];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setServers(next);

    try {
      await api.reorderServers(next.map((srv) => srv.id), token);
    } catch (error) {
      console.error('Error reordering servers:', error);
      setServers(previous);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update server order',
      });
    }
  };

  const handleOrbiFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setOrbiFileName(file.name);
    setOrbiCsv(text);
    setOrbiSummary(null);
    setOrbiPreview([]);
    await runOrbiAnalysis(text);
  };

  const runOrbiAnalysis = async (csvText: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token || !csvText) return;
    try {
      setOrbiAnalyzing(true);
      const res = await api.uploadOrbiCsv(csvText, token, true);
      setOrbiSummary(res.data);
      setOrbiPreview(res.data?.preview || []);
    } catch (error: any) {
      console.error('Error analyzing Orbi CSV:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to analyze CSV',
        description: error.response?.data?.error || 'Upload failed',
      });
    } finally {
      setOrbiAnalyzing(false);
    }
  };

  const confirmUpdateOrbi = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || !orbiCsv) return;

    if (!orbiSummary) {
      toast({ variant: 'destructive', title: 'No analysis yet', description: 'Upload a CSV to see the summary before updating.' });
      return;
    }

    const msg = `Are you sure you want to update the FUTF member list?\n` +
      `Deleting: ${orbiSummary.deleted}\n` +
      `Updating: ${orbiSummary.updated}\n` +
      `Unchanged: ${orbiSummary.unchanged}\n` +
      `Adding: ${orbiSummary.added}`;

    if (!window.confirm(msg)) return;

    try {
      setOrbiUpdating(true);
      const res = await api.uploadOrbiCsv(orbiCsv, token, false);
      setOrbiSummary(res.data);
      setOrbiPreview(res.data?.preview || []);
      setOrbiStats((prev) => ({
        count: res.data?.totalIncoming ?? prev.count,
        updatedAt: new Date().toISOString(),
      }));
      toast({ title: 'Membership updated', description: 'The member list has been replaced.' });
    } catch (error: any) {
      console.error('Error updating Orbi CSV:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.response?.data?.error || 'Upload failed',
      });
    } finally {
      setOrbiUpdating(false);
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
    <div className="container mx-auto p-4 pt-12 max-w-6xl space-y-12">
      <div className="flex items-start justify-between gap-4 flex-wrap pb-2">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Badge variant="secondary" className="mt-1">Administrator</Badge>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-start gap-1">
            <Button variant="default" className="gap-2" onClick={() => setOrbiDialogOpen(true)}>
              <Upload className="w-4 h-4" />
              Update FUTF members
            </Button>
            <div className="text-xs text-muted-foreground leading-snug text-left ml-1">
              Updated: {lastUpdatedDate}
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <a href={ADMIN_DOCS_URL} target="_blank" rel="noreferrer">
              <BookOpen className="w-4 h-4" />
              Admin Docs
            </a>
          </Button>
        </div>
      </div>

      <div className="bg-muted/40 border-2 border-border p-5 pt-4 space-y-4 mt-3">
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
          {servers.map((server, index) => (
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(server.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(server.id, 'down')}
                      disabled={index === servers.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/server/${server.id}`)}
                    >
                      Edit
                    </Button>
                  </div>
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

      <Dialog open={orbiDialogOpen} onOpenChange={(open) => { setOrbiDialogOpen(open); if (!open) { setOrbiFileName(''); setOrbiCsv(''); setOrbiSummary(null); setOrbiPreview([]); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Update FUTF member list</DialogTitle>
            <DialogDescription>
              Upload a fresh Orbi CSV export to replace the existing member list. We’ll show a summary before applying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CSV file</label>
              <Input type="file" accept=".csv,text/csv" onChange={handleOrbiFile} />
              {orbiFileName && <div className="text-xs text-muted-foreground">Selected: {orbiFileName}</div>}
            </div>

            {orbiSummary && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-semibold text-foreground">Current members</div>
                    <div className="text-2xl font-bold text-foreground">{orbiSummary.totalExisting}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">New members list</div>
                    <div className="text-2xl font-bold text-foreground">{orbiSummary.totalIncoming}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>Adding: <strong>{orbiSummary.added}</strong></div>
                  <div>Updating: <strong>{orbiSummary.updated}</strong></div>
                  <div>Unchanged: <strong>{orbiSummary.unchanged}</strong></div>
                  <div>Deleting: <strong>{orbiSummary.deleted}</strong></div>
                </div>
              </div>
            )}

            {orbiPreview.length > 0 && (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="text-sm font-semibold mb-2">Preview (first {orbiPreview.length} rows)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Membership ID</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Valid from</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orbiPreview.map((row, idx) => (
                        <tr key={`preview-${idx}`} className="border-t border-border/50">
                          <td className="p-2">{row.name || '—'}</td>
                          <td className="p-2">{(row as any).membershipId || '—'}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2">{row.status}</td>
                          <td className="p-2">{row.validFrom || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              We run a dry run automatically; Update replaces the entire member list with the uploaded CSV.
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmUpdateOrbi} disabled={!orbiCsv || orbiAnalyzing || orbiUpdating}>
                {orbiUpdating ? 'Updating...' : orbiAnalyzing ? 'Analyzing...' : 'Update list'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
