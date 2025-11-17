import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, CheckCircle2, Mail, Gamepad2, Circle, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { checkServerStatus } from '@/lib/serverStatus';
import * as api from '@/lib/api';
import dashboardBg from '@/assets/dashboard-bg.jpg';
import heroBg from '@/assets/hero-bg.jpg';

interface ServerType {
  id: string;
  name: string;
  description: string;
  ip: string;
  accessLevel: 'open' | 'public' | 'student' | 'verified';
  requiredEmailDomain?: string | null;
  appealPolicy?: 'always' | 'students' | 'never';
  contact?: string | null;
  rules: string[];
  student_required?: boolean;
  appeal_policy?: 'always' | 'students' | 'never';
  required_email_domain?: string | null;
}

interface ServerStatusState {
  online: boolean | null;
  pending: boolean;
  players?: {
    online: number | null;
    max: number | null;
  } | null;
}

const STATUS_POLL_INTERVAL = 1500;
const STATUS_REFRESH_INTERVAL = 30000;

const DEV_MODE = false;

const Home = () => {
  const { toast } = useToast();
  const [selectedServer, setSelectedServer] = useState('');
  const [email, setEmail] = useState('');
  const [minecraftName, setMinecraftName] = useState('');
  const [realName, setRealName] = useState('');
  const [note, setNote] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [serverStatus, setServerStatus] = useState<Record<string, ServerStatusState>>({});
  const statusPollers = useRef<Record<string, number>>({});
  const isMountedRef = useRef(true);
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const mapServer = useCallback(
    (server: any): ServerType => ({
      ...server,
      required_email_domain: server.requiredEmailDomain || server.required_email_domain || null,
      appeal_policy: server.appealPolicy || server.appeal_policy || 'never',
      student_required:
        server.student_required !== undefined
          ? server.student_required
          : server.accessLevel === 'student',
    }),
    []
  );

  const fetchServerStatus = useCallback(
    async (serverId: string) => {
      try {
        const status = await checkServerStatus(serverId);
        if (!isMountedRef.current) {
          return;
        }

        setServerStatus((prev) => ({
          ...prev,
          [serverId]: {
            online: typeof status.online === 'boolean' ? status.online : null,
            pending: status.pending || status.online === null,
            players: status.players || null,
          },
        }));

        const delay = status.pending ? STATUS_POLL_INTERVAL : STATUS_REFRESH_INTERVAL;
        if (statusPollers.current[serverId]) {
          window.clearTimeout(statusPollers.current[serverId]);
        }
        statusPollers.current[serverId] = window.setTimeout(() => {
          fetchServerStatus(serverId);
        }, delay);
      } catch (error) {
        console.error('Error refreshing server status:', error);
        if (!isMountedRef.current) {
          return;
        }
        if (statusPollers.current[serverId]) {
          window.clearTimeout(statusPollers.current[serverId]);
          delete statusPollers.current[serverId];
        }
        setServerStatus((prev) => ({
          ...prev,
          [serverId]: {
            online: false,
            pending: false,
            players: null,
          },
        }));
      }
    },
    []
  );

  const loadServers = useCallback(async () => {
    try {
      const response = await api.getServers();
      const sortedData = (response.data || []).map(mapServer).sort((a: ServerType, b: ServerType) => {
        if (a.name.includes('Survival')) return -1;
        if (b.name.includes('Survival')) return 1;
        return a.name.localeCompare(b.name);
      });

      setServers(sortedData);

      if (sortedData && sortedData.length > 0) {
        setSelectedServer(sortedData[0].id);
      }

      setServerStatus((prev) => {
        const next = { ...prev };
        sortedData.forEach((srv) => {
          if (!next[srv.id]) {
            next[srv.id] = { online: null, pending: true, players: null };
          }
        });
        return next;
      });

      sortedData.forEach((srv) => {
        fetchServerStatus(srv.id);
      });
    } catch (error) {
      console.error('Error loading servers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load servers',
      });
    } finally {
      setLoadingServers(false);
    }
  }, [toast, fetchServerStatus, mapServer]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(statusPollers.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const server = servers.find((s) => s.id === selectedServer);

  const isStudentEmail = (email: string) => {
    if (DEV_MODE) return true;
    const domain = server?.required_email_domain;
    if (!domain) return false;
    return email.toLowerCase().endsWith(domain.toLowerCase());
  };

  const canAccessServer = (server: ServerType) => {
    if (DEV_MODE) return true;
    if (!server.student_required) return true;
    return isStudentEmail(email);
  };

  const needsAccessRequest = (server: ServerType) => {
    if (DEV_MODE) return false;
    const policy = server.appeal_policy || 'never';
    if (canAccessServer(server)) return false;
    if (policy === 'never') return false;
    if (policy === 'always') return true;
    if (policy === 'students' && isStudentEmail(email)) return true;
    return false;
  };

  const handleSendCode = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your email address',
      });
      return;
    }

    setSendingCode(true);
    try {
      await api.sendOtp(email);

      setCodeSent(true);
      toast({
        title: 'Code Sent!',
        description: 'Check your email for the verification code',
      });
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send verification code',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter the verification code',
      });
      return;
    }

    setVerifyingCode(true);
    try {
      await api.verifyOtp(email, verificationCode);

      setEmailVerified(true);
      toast({
        title: 'Email Verified!',
        description: 'You can now submit your whitelist request',
      });
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.response?.data?.error || 'Invalid or expired code',
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async () => {
    if (!server) return;

    if (!email || !minecraftName || !realName || !rulesAccepted) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please complete all fields and accept the rules',
      });
      return;
    }

    if (!emailVerified) {
      toast({
        variant: 'destructive',
        title: 'Email Not Verified',
        description: 'Please verify your email before submitting',
      });
      return;
    }

    setLoading(true);
    try {
      const needsApproval = needsAccessRequest(server);
      const autoApproved = canAccessServer(server);

      await api.createAppeal({
        serverId: server.id,
        email,
        minecraftName,
        realName,
        note,
      });

      toast({
        title: autoApproved ? 'Whitelist Applied!' : 'Request Submitted!',
        description: autoApproved
          ? `You now have access to ${server.name}!`
          : 'Your request has been submitted for review. Admins have been notified.',
      });

      setEmail('');
      setMinecraftName('');
      setRealName('');
      setNote('');
      setRulesAccepted(false);
      setEmailVerified(false);
      setVerificationCode('');
      setCodeSent(false);
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || 'Failed to process your request',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      <div className="absolute inset-0 z-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40 fixed" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/90" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img src={dashboardBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-3xl md:text-5xl font-bold text-center px-4">
              FUTF Minecraft Servers
            </h1>
          </div>
        </div>

        {loadingServers ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading servers...</p>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6 px-4 pb-8">
            <Tabs value={selectedServer} onValueChange={setSelectedServer} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${servers.length}, 1fr)` }}>
                {servers.map((srv) => {
                  const statusInfo = serverStatus[srv.id];
                  const statusPending = statusInfo?.pending || statusInfo?.online === null;
                  const statusClasses = statusPending
                    ? 'animate-pulse fill-muted-foreground text-muted-foreground'
                    : statusInfo?.online
                      ? 'fill-green-500 text-green-500'
                      : 'fill-red-500 text-red-500';
                  const statusLabel = statusPending
                    ? 'Checking status'
                    : statusInfo?.online
                      ? 'Online'
                      : 'Offline';

                  return (
                    <TabsTrigger key={srv.id} value={srv.id} className="gap-2 relative">
                      <Circle
                        className={`w-2 h-2 absolute left-2 transition-all ${statusClasses}`}
                        aria-label={statusLabel}
                        title={statusLabel}
                      />
                      <Server className="w-4 h-4 ml-3" />
                      {srv.name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {servers.map((srv, index) => {
                const hasAccess = canAccessServer(srv);
                const needsRequest = needsAccessRequest(srv);
                const accentColors = [
                  'border-l-emerald-500/50 bg-emerald-500/5',
                  'border-l-blue-500/50 bg-blue-500/5',
                  'border-l-purple-500/50 bg-purple-500/5',
                  'border-l-amber-500/50 bg-amber-500/5',
                ];
                const cardAccent = accentColors[index % accentColors.length];
                const isCopied = copiedServer === srv.id;

                return (
                  <TabsContent key={srv.id} value={srv.id} className="space-y-6 mt-6">
                    <Card className={`border-l-4 ${cardAccent}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Server className="w-5 h-5" />
                            {srv.name}
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">
                            Players:{' '}
                            {serverStatus[srv.id]?.pending && serverStatus[srv.id]?.online === null
                              ? '...'
                              : serverStatus[srv.id]?.players?.online !== undefined &&
                                  serverStatus[srv.id]?.players?.online !== null &&
                                  serverStatus[srv.id]?.players?.max !== undefined &&
                                  serverStatus[srv.id]?.players?.max !== null
                                ? `${serverStatus[srv.id]?.players?.online}/${serverStatus[srv.id]?.players?.max}`
                                : serverStatus[srv.id]?.online
                                  ? serverStatus[srv.id]?.players?.online ?? 'Unknown'
                                  : 'Offline'}
                          </div>
                        </CardTitle>
                        <CardDescription>{srv.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Server IP</p>
                            <p className="font-mono font-bold text-lg">{srv.ip}</p>
                          </div>
                          <Button
                            variant={isCopied ? 'default' : 'ghost'}
                            size="icon"
                            className={isCopied ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => {
                              navigator.clipboard.writeText(srv.ip);
                              setCopiedServer(srv.id);
                              setTimeout(() => setCopiedServer(null), 2000);
                            }}
                          >
                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder={
                                srv.required_email_domain ? `your.email@${srv.required_email_domain}` : 'your.email@example.com'
                              }
                            />
                            {srv.student_required && !isStudentEmail(email) && email && srv.required_email_domain && (
                              <p className="text-sm text-destructive">
                                Student email required ({srv.required_email_domain})
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="minecraft" className="flex items-center gap-2">
                                <Gamepad2 className="w-4 h-4" />
                                Minecraft Username
                              </Label>
                              <Input
                                id="minecraft"
                                value={minecraftName}
                                onChange={(e) => setMinecraftName(e.target.value)}
                                placeholder="Steve"
                              />
                            </div>
                            <div>
                              <Label htmlFor="realname" className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Real Name
                              </Label>
                              <Input
                                id="realname"
                                value={realName}
                                onChange={(e) => setRealName(e.target.value)}
                                placeholder="Alex Andersson"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Verification</Label>
                          <div className="grid gap-2 md:grid-cols-2">
                            <Button onClick={handleSendCode} disabled={sendingCode} className="w-full">
                              {sendingCode ? 'Sending...' : codeSent ? 'Resend Code' : 'Send Code'}
                            </Button>
                            <div className="flex gap-2">
                              <Input
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="Enter code"
                              />
                              <Button onClick={handleVerifyCode} disabled={verifyingCode}>
                                Verify
                              </Button>
                            </div>
                          </div>
                          {emailVerified && (
                            <p className="text-sm text-green-500">Email verified!</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Additional Information</Label>
                          <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={4}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="rules"
                            checked={rulesAccepted}
                            onCheckedChange={(checked) => setRulesAccepted(!!checked)}
                          />
                          <Label htmlFor="rules" className="text-sm text-muted-foreground">
                            I have read and agree to the server rules
                          </Label>
                        </div>

                        <Button
                          onClick={handleSubmit}
                          className="w-full"
                          disabled={loading}
                        >
                          {loading
                            ? 'Submitting...'
                            : needsRequest
                              ? 'Submit Request'
                              : canAccessServer(srv)
                                ? 'Join Server'
                                : 'Not Available'}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
