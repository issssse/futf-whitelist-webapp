import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Server, CheckCircle2, Mail, Gamepad2, Circle, Copy, Check, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { checkServerStatus } from '@/lib/serverStatus';
import * as api from '@/lib/api';
import dashboardBg from '@/assets/dashboard-bg.jpg';
import heroBg from '@/assets/hero-bg.jpg';
import { cn } from '@/lib/utils';
import ReactMarkdown, { type Components as MarkdownComponents } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ServerType {
  id: string;
  name: string;
  description: string;
  ip: string;
  accessLevel: 'open' | 'student' | 'appeal_only' | 'member';
  requiredEmailDomain?: string | null;
  appealPolicy?: 'always' | 'non_student' | 'non_member' | 'never';
  contact?: string | null;
  rules: string[];
  appeal_policy?: 'always' | 'non_student' | 'non_member' | 'never';
  required_email_domain?: string | null;
  order?: number;
  rulesMarkdownUrl?: string | null;
  rulesPdfUrl?: string | null;
  rules_markdown_url?: string | null;
  rules_pdf_url?: string | null;
  mustAcceptRules?: boolean;
  must_accept_rules?: boolean;
}

interface ServerStatusState {
  online: boolean | null;
  pending: boolean;
  players?: {
    online: number | null;
    max: number | null;
  } | null;
}

interface AccessState {
  mode: 'open' | 'student' | 'appeal_only' | 'member';
  policy: 'never' | 'non_student' | 'always';
  requiresMembership: boolean;
  hasMembership: boolean;
  requiresStudentEmail: boolean;
  hasRequiredEmail: boolean;
  appealMandatory: boolean;
  appealsEnabled: boolean;
  appealsDisabled: boolean;
  canAutoJoin: boolean;
}

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  open: boolean;
  children: ReactNode;
  className?: string;
}

const StepCard = ({ step, title, description, open, children, className }: StepCardProps) => (
  <div
    className={cn(
      'rounded-2xl border border-border/60 bg-card/40 overflow-hidden transition-all duration-500',
      open ? 'mt-4 p-4 opacity-100 translate-y-0 max-h-[1600px]' : 'mt-0 p-0 opacity-0 -translate-y-3 max-h-0 border-transparent pointer-events-none',
      className
    )}
    aria-hidden={!open}
    data-open={open}
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
        {step}
      </div>
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="mt-4 space-y-4">{children}</div>
  </div>
);

const STATUS_POLL_INTERVAL = 1500;
const STATUS_REFRESH_INTERVAL = 30000;
const DEV_MODE = false;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeDomain = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
};

const isStudentEmailForServer = (address: string, target?: ServerType) => {
  if (DEV_MODE) return true;
  if (!target) return false;
  const email = address.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return false;
  const domain = normalizeDomain(target.required_email_domain || target.requiredEmailDomain || null);
  if (!domain) return false;
  return email.endsWith(domain);
};

const serverRequiresStudentEmail = (target?: ServerType) => {
  if (!target) return false;
  if (target.accessLevel === 'appeal_only') return false;
  if (target.accessLevel === 'open') return false;
  return target.accessLevel === 'student';
};

const serverRequiresMembership = (target?: ServerType) => {
  if (!target) return false;
  return target.accessLevel === 'member';
};

const getAppealPolicy = (target?: ServerType) => {
  if (!target) return 'never';
  if (target.accessLevel === 'appeal_only') {
    return 'always';
  }
  if (target.accessLevel === 'open') {
    return 'never';
  }
  const policy = target.appeal_policy || target.appealPolicy || 'never';
  if (policy === 'students' || policy === 'non_member') {
    return 'non_student';
  }
  return policy as 'never' | 'non_student' | 'always';
};

const buildAccessState = (
  target: ServerType | undefined,
  email: string,
  hasMembership: boolean
): AccessState => {
  const mode = target?.accessLevel || 'open';
  if (mode === 'open') {
    return {
      mode,
      policy: 'never',
      requiresMembership: false,
      hasMembership: true,
      requiresStudentEmail: false,
      hasRequiredEmail: true,
      appealMandatory: false,
      appealsEnabled: false,
      appealsDisabled: false,
      canAutoJoin: true,
    };
  }

  if (mode === 'appeal_only') {
    return {
      mode,
      policy: 'always',
      requiresMembership: false,
      hasMembership: false,
      requiresStudentEmail: false,
      hasRequiredEmail: false,
      appealMandatory: true,
      appealsEnabled: true,
      appealsDisabled: false,
      canAutoJoin: false,
    };
  }

  const policy = getAppealPolicy(target);
  const requiresMembership = serverRequiresMembership(target);
  const requiresStudentEmail = serverRequiresStudentEmail(target);
  const hasMembershipMatch = requiresMembership ? hasMembership : true;
  const hasRequiredEmail = requiresStudentEmail
    ? isStudentEmailForServer(email, target)
    : true;
  const appealsForMissingEmail =
    policy === 'non_student' &&
    ((requiresStudentEmail && !hasRequiredEmail) ||
      (requiresMembership && !hasMembershipMatch));
  const appealMandatory = policy === 'always' || appealsForMissingEmail;
  const appealsEnabled = policy === 'always' || appealsForMissingEmail;
  const appealsDisabled =
    (requiresStudentEmail && !hasRequiredEmail && policy === 'never') ||
    (requiresMembership && !hasMembershipMatch && policy === 'never');
  const canAutoJoin =
    hasRequiredEmail && hasMembershipMatch && policy !== 'always';

  return {
    mode,
    policy,
    requiresMembership,
    hasMembership: hasMembershipMatch,
    requiresStudentEmail,
    hasRequiredEmail,
    appealMandatory,
    appealsEnabled,
    appealsDisabled,
    canAutoJoin,
  };
};

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
  const [rulesMarkdownContent, setRulesMarkdownContent] = useState<string | null>(null);
  const statusPollers = useRef<Record<string, number>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [linkSending, setLinkSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<'idle' | 'checking' | 'match' | 'nomatch' | 'error'>('idle');
  const [pingTick, setPingTick] = useState(0);
  const [membershipName, setMembershipName] = useState<string | null>(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [rulesScrollComplete, setRulesScrollComplete] = useState(false);
  const rulesScrollRef = useRef<HTMLDivElement | null>(null);

  // Derived values
  const server = servers.find((s) => s.id === selectedServer);
  const trimmedEmail = email.trim();
  const trimmedMinecraftName = minecraftName.trim();
  const trimmedRealName = realName.trim();
  const membershipMatch = membershipStatus === 'match';
  const selectedAccess = buildAccessState(server, trimmedEmail, membershipMatch);
  const emailValid = EMAIL_REGEX.test(trimmedEmail);
  const identityFieldsComplete = Boolean(trimmedMinecraftName && trimmedRealName);
  const showIdentitySection = emailValid;
  const showVerificationSection =
    selectedAccess.mode !== 'open' &&
    showIdentitySection &&
    identityFieldsComplete;

  const mapServer = useCallback(
    (server: any, index?: number): ServerType => ({
      ...server,
      required_email_domain: server.requiredEmailDomain || server.required_email_domain || null,
      appeal_policy: getAppealPolicy(server),
      order: typeof server.order === 'number' ? server.order : index ?? 0,
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
      const sortedData = (response.data || [])
        .map((srv: any, index: number) => mapServer(srv, index))
        .sort((a: ServerType, b: ServerType) => (a.order ?? 0) - (b.order ?? 0));

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
    const hasPending = Object.values(serverStatus).some(
      (s) => s?.pending || s?.online === null
    );
    if (!hasPending) {
      return;
    }
    const timer = window.setInterval(() => {
      setPingTick((value) => (value + 1) % 3);
    }, 400);
    return () => window.clearInterval(timer);
  }, [serverStatus]);

  useEffect(() => {
    if (selectedServer && tabRefs.current[selectedServer]) {
      tabRefs.current[selectedServer]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedServer]);

  useEffect(() => {
    setRulesAccepted(false);
    setNote('');
  }, [selectedServer]);

  useEffect(() => {
    if (!server || !serverRequiresMembership(server)) {
      setMembershipStatus('idle');
      return;
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setMembershipStatus('idle');
      return;
    }

    let cancelled = false;
    setMembershipStatus('checking');
    api
      .checkOrbiMembership(trimmedEmail)
      .then((res) => {
        if (cancelled) return;
        setMembershipStatus(res.data?.member ? 'match' : 'nomatch');
        setMembershipName(res.data?.name || null);
      })
      .catch((error) => {
        console.error('Failed to validate membership', error);
        if (!cancelled) {
          setMembershipStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [server, trimmedEmail, selectedServer]);

  useEffect(() => {
    if (membershipStatus === 'match' && membershipName && !realName.trim()) {
      setRealName(membershipName);
    }
  }, [membershipStatus, membershipName, realName]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(statusPollers.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const showFinalSection = selectedAccess.mode === 'open' ? true : emailVerified;
  const rulesMarkdownUrl = server?.rules_markdown_url || server?.rulesMarkdownUrl || null;
  const rulesPdfUrl = server?.rules_pdf_url || server?.rulesPdfUrl || null;
  const mustAcceptRules = Boolean(server?.must_accept_rules || server?.mustAcceptRules);
  const renderedRulesMarkdown =
    rulesMarkdownContent ||
    (server?.rules?.length
      ? server.rules.map((rule, idx) => `${idx + 1}. ${rule}`).join('\n')
      : null);

  const markdownComponents: MarkdownComponents = {
    h1: ({ node, ...props }) => (
      <h1
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', marginTop: '1.6em', marginBottom: '0.4em', fontWeight: 700 }}
        {...props}
      />
    ),
    h2: ({ node, ...props }) => (
      <h2
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', marginTop: '1.4em', marginBottom: '0.35em', fontWeight: 700 }}
        {...props}
      />
    ),
    h3: ({ node, ...props }) => (
      <h3
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', marginTop: '1.2em', marginBottom: '0.3em', fontWeight: 600 }}
        {...props}
      />
    ),
    p: ({ node, ...props }) => (
      <p
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', lineHeight: 1.6, marginTop: '0.65em', marginBottom: '0.45em' }}
        {...props}
      />
    ),
    li: ({ node, children, ...props }) => (
      <li
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', lineHeight: 1.6, marginTop: '0.35em', marginBottom: '0.25em' }}
        {...props}
      >
        {children}
      </li>
    ),
    ul: ({ node, ...props }) => (
      <ul
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', paddingLeft: '1.3em', marginTop: '0.6em', marginBottom: '0.6em' }}
        {...props}
      />
    ),
    ol: ({ node, ...props }) => (
      <ol
        style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif', paddingLeft: '1.3em', marginTop: '0.6em', marginBottom: '0.6em' }}
        {...props}
      />
    ),
  };

  useEffect(() => {
    if (!selectedAccess.appealsEnabled) {
      setNote('');
    }
  }, [selectedAccess.appealsEnabled]);

  useEffect(() => {
    setLinkSent(false);
  }, [trimmedEmail]);

  useEffect(() => {
    if (!rulesMarkdownUrl) {
      setRulesMarkdownContent(null);
      return;
    }
    fetch(rulesMarkdownUrl)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text !== null) {
          setRulesMarkdownContent(text);
        } else {
          setRulesMarkdownContent(null);
        }
      })
      .catch(() => setRulesMarkdownContent(null));
  }, [rulesMarkdownUrl]);

  const syncVerifiedState = useCallback(() => {
    const storedEmail = (localStorage.getItem('verifiedEmail') || '').trim().toLowerCase();
    const storedUserId = localStorage.getItem('verifiedUserId');
    if (storedEmail && storedEmail === trimmedEmail.toLowerCase()) {
      setEmailVerified(true);
      setVerifiedUserId(storedUserId);
    } else {
      setEmailVerified(false);
      setVerifiedUserId(null);
    }
  }, [trimmedEmail]);

  useEffect(() => {
    syncVerifiedState();
  }, [syncVerifiedState]);

  useEffect(() => {
    const handler = () => syncVerifiedState();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [syncVerifiedState]);

  const handleSendMagicLink = async () => {
    if (!emailValid || !server) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please enter a valid email and select a server before requesting a link.',
      });
      return;
    }

    if (!identityFieldsComplete) {
      toast({
        variant: 'destructive',
        title: 'Player details required',
        description: 'Fill in your Minecraft username and real name first.',
      });
      return;
    }

    if (server.accessLevel === 'open') {
      toast({
        title: 'No verification needed',
        description: 'This server is open for everyone—use the IP above to join directly.',
      });
      return;
    }

    setLinkSending(true);
    try {
      await api.registerUser({
        email: trimmedEmail,
        minecraftName: trimmedMinecraftName,
        realName: trimmedRealName || undefined,
        serverId: server.id,
      });
      setLinkSent(true);
      toast({
        title: 'Magic link sent!',
        description: `Check ${trimmedEmail} for your sign-in link. Open it on this device to continue.`,
      });
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send link',
        description: error.response?.data?.error || 'Unable to send verification link',
      });
    } finally {
      setLinkSending(false);
    }
  };

  const resetRulesDialogState = useCallback(() => {
    setRulesScrollComplete(false);
    setPendingSubmit(false);
  }, []);

  const handleRulesDialogChange = useCallback(
    (open: boolean) => {
      setRulesDialogOpen(open);
      if (!open) {
        resetRulesDialogState();
      } else if (rulesAccepted) {
        setRulesScrollComplete(true);
      }
    },
    [resetRulesDialogState, rulesAccepted]
  );

  const handleRulesScroll = useCallback(() => {
    const container = rulesScrollRef.current;
    if (!container || rulesScrollComplete) return;

    const threshold = 8;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
      setRulesScrollComplete(true);
    }
  }, [rulesScrollComplete]);

  const performSubmit = async () => {
    if (!server) return;

    if (server.accessLevel === 'open') {
      toast({
        title: 'No whitelist required',
        description: `Join ${server.name} immediately using ${server.ip}.`,
      });
      return;
    }

    if (!email || !minecraftName || !realName) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please complete all fields before continuing',
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

    if (!selectedAccess.hasRequiredEmail && !selectedAccess.appealsEnabled) {
      toast({
        variant: 'destructive',
        title: selectedAccess.requiresMembership ? 'FUTF membership required' : 'Student email required',
        description: selectedAccess.requiresMembership
          ? 'Use the email tied to your FUTF Orbi membership to join this server.'
          : server?.required_email_domain
            ? `This server requires an email ending with ${server.required_email_domain}`
            : 'This server requires a student email',
      });
      return;
    }

    if (selectedAccess.requiresMembership && membershipStatus === 'checking') {
      toast({
        variant: 'destructive',
        title: 'Still checking membership',
        description: 'Please wait a moment while we confirm your FUTF membership.',
      });
      return;
    }

    if (selectedAccess.requiresMembership && membershipStatus === 'error') {
      toast({
        variant: 'destructive',
        title: 'Membership check failed',
        description: 'We could not validate your membership. Try again shortly.',
      });
      return;
    }

    setLoading(true);
    try {
      await api.createAppeal({
        serverId: server.id,
        email: trimmedEmail,
        minecraftName,
        realName,
        note,
      });

      const directlyGranted = selectedAccess.canAutoJoin;
      toast({
        title: directlyGranted ? 'Whitelist Applied!' : 'Request Submitted!',
        description: directlyGranted
          ? `You now have access to ${server.name}!`
          : 'Your request has been submitted for review. Admins have been notified.',
      });

      setEmail('');
      setMinecraftName('');
      setRealName('');
      setNote('');
      setRulesAccepted(false);
      setEmailVerified(false);
      setLinkSent(false);
      setVerifiedUserId(null);
      resetRulesDialogState();
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

  const handleSubmit = async () => {
    if (!server) {
      toast({
        variant: 'destructive',
        title: 'No server selected',
        description: 'Please pick a server before submitting.',
      });
      return;
    }

    if (!rulesAccepted) {
      setPendingSubmit(true);
      setRulesDialogOpen(true);
      setRulesScrollComplete(false);
      return;
    }

    await performSubmit();
  };

  const handleAcceptRules = async () => {
    setRulesAccepted(true);
    setRulesDialogOpen(false);
    const shouldSubmit = pendingSubmit;
    resetRulesDialogState();
    if (shouldSubmit) {
      await performSubmit();
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
              {servers.length > 1 && (
                <div className="relative" ref={tabListRef}>
                  <TabsList
                    className="relative z-0 flex w-full min-h-[52px] gap-2 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-1 scroll-smooth snap-x snap-mandatory
                      [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                  >
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
                        <TabsTrigger
                          key={srv.id}
                          value={srv.id}
                          ref={(node) => {
                            tabRefs.current[srv.id] = node;
                          }}
                          className={cn(
                            'relative flex-shrink-0 min-w-[160px] snap-start rounded-lg px-4 py-2 text-sm transition-colors',
                            selectedServer === srv.id
                              ? 'bg-background text-foreground shadow-sm'
                              : 'bg-transparent text-muted-foreground hover:bg-card/40'
                          )}
                        >
                          <Circle
                            className={`w-2 h-2 absolute left-3 transition-all ${statusClasses}`}
                            aria-label={statusLabel}
                            title={statusLabel}
                          />
                          <Server className="w-4 h-4 ml-5" />
                          {srv.name}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 rounded-l-xl bg-gradient-to-r from-background via-background/80 to-transparent md:hidden" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 rounded-r-xl bg-gradient-to-l from-background via-background/80 to-transparent md:hidden" />
                </div>
              )}

              {(servers.length === 1 ? servers : servers).map((srv, index) => {
                const membershipCheckState = srv.id === server?.id ? membershipStatus : 'idle';
                const membershipMatchForServer =
                  membershipCheckState === 'match'
                    ? true
                    : srv.id === server?.id
                      ? false
                      : true;
                const state = buildAccessState(
                  srv,
                  trimmedEmail,
                  membershipMatchForServer
                );
                const needsRequest = !state.canAutoJoin;
                const showAppealSection = state.appealsEnabled;
                const requiredDomain = srv.required_email_domain || srv.requiredEmailDomain || '';
                const appealUnavailableMessage = state.appealsDisabled;
                const membershipPending = membershipCheckState === 'checking';
                const membershipMismatch = membershipCheckState === 'nomatch';
                const membershipFailed = membershipCheckState === 'error';
                const membershipVerified = membershipCheckState === 'match';
                const accentColors = [
                  'border-l-emerald-500/50 bg-emerald-500/5',
                  'border-l-blue-500/50 bg-blue-500/5',
                  'border-l-purple-500/50 bg-purple-500/5',
                  'border-l-amber-500/50 bg-amber-500/5',
                ];
                const cardAccent = accentColors[index % accentColors.length];
                const isCopied = copiedServer === srv.id;
                const statusInfo = serverStatus[srv.id];
                const statusPending = statusInfo?.pending || statusInfo?.online === null;
                const statusOnline = statusInfo?.online;
                const statusText = statusPending
                  ? `PINGING${'.'.repeat((pingTick % 3) + 1)}`
                  : statusOnline
                    ? 'ONLINE'
                    : 'OFFLINE';
                const statusClass = statusPending
                  ? 'text-muted-foreground'
                  : statusOnline
                    ? 'text-green-600'
                    : 'text-red-600';

                if (state.mode === 'open') {
                  return (
                    <TabsContent key={srv.id} value={srv.id} className="space-y-6 mt-6">
                      <Card className={`border-l-4 ${cardAccent}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Server className="w-5 h-5" />
                              {srv.name}
                            </div>
                            <div className="text-sm text-muted-foreground font-medium text-right">
                              <div>
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
                              <div className={cn('font-semibold', statusClass)}>
                                Status: {statusText}
                              </div>
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

                          {srv.rules && srv.rules.length > 0 && (
                            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-2">
                              <p className="text-sm font-semibold">Server rules</p>
                              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                {srv.rules.map((rule, idx) => (
                                  <li key={`${srv.id}-rule-${idx}`}>{rule}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-2">
                            <h3 className="font-semibold">Open to everyone</h3>
                            <p className="text-sm text-muted-foreground">
                              No whitelist required. Add the server using the IP above and start playing immediately.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                }

                return (
                  <TabsContent key={srv.id} value={srv.id} className="space-y-6 mt-6">
                    <Card className={`border-l-4 ${cardAccent}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Server className="w-5 h-5" />
                              {srv.name}
                            </div>
                            <div className="text-sm text-muted-foreground font-medium text-right">
                              <div>
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
                              <div className={cn('font-semibold', statusClass)}>
                                Status: {statusText}
                              </div>
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

                <StepCard
                  step={1}
                  title="Contact email"
                  description="Enter the address that should receive verification codes."
                  open
                  className="mt-0"
                >
                          <div className="space-y-2">
                            <Label htmlFor={`email-${srv.id}`} className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email Address
                            </Label>
                            <Input
                              id={`email-${srv.id}`}
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder={
                                requiredDomain
                                  ? `your.name${requiredDomain}`
                                  : 'your.email@example.com'
                              }
                            />
                            <p className="text-xs text-muted-foreground">Continue with a valid email.</p>
                        </div>
                        {state.requiresStudentEmail && trimmedEmail && !state.hasRequiredEmail && (
                          <p className="text-sm text-destructive">
                            {requiredDomain
                              ? `Student email required (${requiredDomain})`
                              : 'Student email required'}
                          </p>
                        )}
                        {state.requiresMembership && trimmedEmail && (
                          <>
                            {membershipMismatch && (
                              <p className="text-sm text-destructive">
                                This server requires a FUTF membership email (Orbi export). Use the address linked to your membership.
                              </p>
                            )}
                            {membershipFailed && (
                              <p className="text-sm text-destructive">
                                Could not validate membership right now. Please try again in a moment.
                              </p>
                            )}
                            {membershipPending && (
                              <p className="text-xs text-muted-foreground">Checking membership…</p>
                            )}
                            {membershipVerified && (
                              <p className="text-sm text-green-600">
                                Membership verified. You can continue with this address.
                              </p>
                            )}
                          </>
                        )}
                      </StepCard>

                        <StepCard
                          step={2}
                          title="Player details"
                          description="Tell us who you are in Minecraft and in real life."
                          open={showIdentitySection}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`minecraft-${srv.id}`} className="flex items-center gap-2">
                                <Gamepad2 className="w-4 h-4" />
                                Minecraft Username
                              </Label>
                              <Input
                                id={`minecraft-${srv.id}`}
                                value={minecraftName}
                                onChange={(e) => setMinecraftName(e.target.value)}
                                placeholder="Steve"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`realname-${srv.id}`} className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Real Name
                              </Label>
                              <Input
                                id={`realname-${srv.id}`}
                                value={realName}
                                onChange={(e) => setRealName(e.target.value)}
                                placeholder="Karl Martinez"
                              />
                            </div>
                          </div>
                        </StepCard>

                        <StepCard
                          step={3}
                          title="Verify email"
                          description="We’ll email you a secure sign-in link. Open it on this device to unlock the final step."
                          open={showVerificationSection}
                        >
                          <div className="space-y-3">
                            <Button
                              onClick={handleSendMagicLink}
                              disabled={linkSending || !emailValid || !identityFieldsComplete}
                              className="w-full"
                            >
                              {linkSending ? 'Sending…' : linkSent ? 'Resend Magic Link' : 'Send Magic Link'}
                            </Button>
                            {linkSent && (
                              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                                We sent a link to <span className="font-semibold">{trimmedEmail}</span>. Open it to verify.
                              </div>
                            )}
                            {emailVerified && (
                              <p className="text-sm text-green-500">
                                Email confirmed.
                              </p>
                            )}
                          </div>
                        </StepCard>

                        <StepCard
                          step={4}
                          title="Finalise request"
                          description="Include an appeal if required and accept the server rules."
                          open={showFinalSection}
                        >
                          {srv.rules && srv.rules.length > 0 && (
                            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">Server rules</p>
                                  <p className="text-xs text-muted-foreground">
                                    You must review and accept these rules before sending your request.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {rulesAccepted && (
                                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                                      Accepted
                                    </span>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setPendingSubmit(false);
                                      setRulesDialogOpen(true);
                                      setRulesScrollComplete(rulesAccepted);
                                    }}
                                  >
                                    View & accept
                                  </Button>
                                </div>
                              </div>
                              <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                                <ul className="list-disc space-y-1 pl-5">
                                  {srv.rules.map((rule, idx) => (
                                    <li key={`${srv.id}-rule-${idx}`}>{rule}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {showAppealSection && (
                            <div className="space-y-2">
                              <Label>Appeal for whitelist</Label>
                              <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Reason for access (required)"
                                rows={4}
                              />
                            </div>
                          )}

                          {appealUnavailableMessage && (
                            <p className="text-sm text-destructive">
                              {state.requiresMembership
                                ? 'Appeals are disabled for non-members. Use the email tied to your FUTF membership to join this server.'
                                : (
                                  <>
                                    Appeals are disabled for this email. Please use your student address
                                    {requiredDomain ? ` (${requiredDomain})` : ''} to join this server.
                                  </>
                                )}
                            </p>
                          )}

                        </StepCard>

                        <Button
                          onClick={handleSubmit}
                          className="w-full"
                          disabled={loading || !emailVerified}
                        >
                          {loading
                            ? 'Submitting...'
                            : needsRequest
                              ? 'Submit Appeal'
                              : state.canAutoJoin
                                ? 'Join Server'
                                : 'Submit Request'}
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

      <Dialog open={rulesDialogOpen} onOpenChange={handleRulesDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review & accept the rules</DialogTitle>
            <DialogDescription>
              You must read and accept the rules for {server?.name || 'this server'} before submitting your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <FileText className="h-4 w-4" />
                {server?.name ? `${server.name} rules` : 'Server rules'}
              </span>
              <div className="flex items-center gap-3">
                {rulesPdfUrl && (
                  <a
                    href={rulesPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-dotted underline-offset-4 hover:text-foreground"
                  >
                    Open PDF
                  </a>
                )}
                {rulesPdfUrl && rulesMarkdownUrl && <span aria-hidden className="text-border">•</span>}
                {rulesMarkdownUrl && (
                  <a
                    href={rulesMarkdownUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-dotted underline-offset-4 hover:text-foreground"
                  >
                    View Markdown
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
              <div
                ref={rulesScrollRef}
                onScroll={handleRulesScroll}
                className="max-h-[360px] overflow-y-auto rounded-lg bg-background/80 p-4 shadow-inner"
              >
                {renderedRulesMarkdown ? (
                  <div style={{ fontFamily: 'Helvetica, Arial, system-ui, -apple-system, sans-serif' }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                      className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-li:marker:text-primary font-sans"
                    >
                      {renderedRulesMarkdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Rules are not available for this server yet. Please contact an administrator for details.
                  </p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Scroll to the bottom to enable the accept button. Accepting will immediately send your request.
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Acceptance is required to continue. Close this dialog to keep editing your request.
            </div>
            <Button
              onClick={handleAcceptRules}
              disabled={(server?.rules?.length || 0) > 0 ? !rulesScrollComplete || loading : (!mustAcceptRules ? loading : !rulesScrollComplete || loading)}
            >
              {pendingSubmit ? 'Accept & submit' : 'Accept rules'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
