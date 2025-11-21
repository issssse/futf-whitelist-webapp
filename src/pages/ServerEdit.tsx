import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as api from '@/lib/api';
import type { Server } from '@/lib/types';

type AccessModeOption =
  | 'open'
  | 'student_with_appeal'
  | 'student_strict'
  | 'member_with_appeal'
  | 'member_strict'
  | 'appeal_only';

interface EditableServer {
  id: string;
  name: string;
  description: string;
  ip: string;
  accessLevel: 'open' | 'student' | 'appeal_only' | 'member';
  appeal_policy: 'always' | 'non_student' | 'never';
  required_email_domain: string | null;
  contact: string | null;
  rules: string[];
}

const ServerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [server, setServer] = useState<EditableServer | null>(null);
  const [loading, setLoading] = useState(true);
  const isNew = id === 'new';
  const token = localStorage.getItem('adminToken');

  const resolveAccessMode = (srv: EditableServer): AccessModeOption => {
    if (srv.accessLevel === 'open') return 'open';
    if (srv.accessLevel === 'appeal_only') return 'appeal_only';
    if (srv.accessLevel === 'member') {
      return srv.appeal_policy === 'non_student' ? 'member_with_appeal' : 'member_strict';
    }
    return srv.appeal_policy === 'non_student' ? 'student_with_appeal' : 'student_strict';
  };

  const applyAccessMode = (value: AccessModeOption) => {
    if (!server) return;
    switch (value) {
      case 'open':
        setServer({ ...server, accessLevel: 'open', appeal_policy: 'never' });
        break;
      case 'student_with_appeal':
        setServer({ ...server, accessLevel: 'student', appeal_policy: 'non_student' });
        break;
      case 'student_strict':
        setServer({ ...server, accessLevel: 'student', appeal_policy: 'never' });
        break;
      case 'member_with_appeal':
        setServer({ ...server, accessLevel: 'member', appeal_policy: 'non_student' });
        break;
      case 'member_strict':
        setServer({ ...server, accessLevel: 'member', appeal_policy: 'never' });
        break;
      case 'appeal_only':
        setServer({ ...server, accessLevel: 'appeal_only', appeal_policy: 'always' });
        break;
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    if (isNew) {
      setServer({
        id: `server-${Date.now()}`,
        name: '',
        description: '',
        ip: '',
        accessLevel: 'open',
        appeal_policy: 'never',
        required_email_domain: '@student.uu.se',
        contact: null,
        rules: [],
      });
      setLoading(false);
    } else {
      loadServer();
    }
  }, [id]);

  const mapToEditable = (serverData: Server): EditableServer => ({
    id: serverData.id,
    name: serverData.name,
    description: serverData.description,
    ip: serverData.ip,
    accessLevel: (serverData.accessLevel as 'open' | 'student' | 'appeal_only' | 'member') || 'open',
    appeal_policy: (serverData as any).appealPolicy || 'never',
    required_email_domain: serverData.requiredEmailDomain || null,
    contact: serverData.contact || null,
    rules: serverData.rules || [],
  });

  const loadServer = async () => {
    try {
      const response = await api.getServer(id!);
      setServer(mapToEditable(response.data));
    } catch (error) {
      console.error('Error loading server:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load server',
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!server || !token) return;
    if (!server.id || !server.name || !server.description || !server.ip) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please complete all required fields',
      });
      return;
    }

    const payload = {
      id: server.id,
      name: server.name,
      description: server.description,
      ip: server.ip,
      accessLevel: server.accessLevel,
      requiredEmailDomain: server.required_email_domain,
      contact: server.contact,
      rules: server.rules,
      appealPolicy: server.appeal_policy,
    };

    try {
      if (isNew) {
        await api.createServer(payload, token);
      } else {
        await api.updateServer(server.id, payload, token);
      }

      toast({
        title: 'Success',
        description: 'Server saved successfully',
      });

      navigate('/admin');
    } catch (error: any) {
      console.error('Error saving server:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save server',
      });
    }
  };

  const handleDelete = async () => {
    if (!server || isNew || !token) return;
    if (!confirm('Are you sure you want to delete this server?')) return;

    try {
      await api.deleteServer(server.id, token);
      toast({
        title: 'Success',
        description: 'Server deleted successfully',
      });

      navigate('/admin');
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete server',
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

  if (!server) return null;

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isNew ? 'New Server' : 'Edit Server'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>Configure server settings and requirements</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="gap-2" size="sm">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin')} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="id">Server ID</Label>
            <Input
              id="id"
              value={server.id}
              onChange={(e) => setServer({ ...server, id: e.target.value })}
              placeholder="unique-id"
              disabled={!isNew}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Server Name</Label>
            <Input
              id="name"
              value={server.name}
              onChange={(e) => setServer({ ...server, name: e.target.value })}
              placeholder="FUTF Survival"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={server.description}
              onChange={(e) => setServer({ ...server, description: e.target.value })}
              placeholder="Server description..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip">IP Address</Label>
            <Input
              id="ip"
              value={server.ip}
              onChange={(e) => setServer({ ...server, ip: e.target.value })}
              placeholder="server.example.com:25565"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-mode">Access Mode</Label>
            <Select
              value={resolveAccessMode(server)}
              onValueChange={(value: AccessModeOption) => applyAccessMode(value)}
            >
              <SelectTrigger id="access-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open for everyone</SelectItem>
                <SelectItem value="student_with_appeal">Student email required, allow appeals for others</SelectItem>
                <SelectItem value="student_strict">Student email required, no appeals</SelectItem>
                <SelectItem value="member_with_appeal">FUTF membership required, allow appeals for others</SelectItem>
                <SelectItem value="member_strict">FUTF membership required, no appeals</SelectItem>
                <SelectItem value="appeal_only">Appeal only (manual review)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This single control configures both the whitelist requirement and how appeals behave.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Information (optional)</Label>
            <Input
              id="contact"
              value={server.contact || ''}
              onChange={(e) => setServer({ ...server, contact: e.target.value || null })}
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Student Email Domain</Label>
            <Input
              id="domain"
              value={server.required_email_domain || ''}
              onChange={(e) => setServer({ ...server, required_email_domain: e.target.value || null })}
              placeholder="@student.uu.se"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rules">Server Rules (one per line)</Label>
            <Textarea
              id="rules"
              value={server.rules.join('\n')}
              onChange={(e) => setServer({
                ...server,
                rules: e.target.value.split('\n').filter(Boolean),
              })}
              placeholder="No griefing&#10;Be respectful&#10;Follow staff instructions"
              rows={8}
            />
          </div>

          {!isNew && (
            <div className="flex justify-end pt-4 border-t">
              <Button variant="destructive" onClick={handleDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Server
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ServerEdit;
