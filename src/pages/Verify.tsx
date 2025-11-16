import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { verify, verifyUpgrade } from '@/lib/api';

const Verify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isUpgrade, setIsUpgrade] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verifyToken = async () => {
      try {
        if (type === 'upgrade') {
          setIsUpgrade(true);
          const response = await verifyUpgrade(token);
          setStatus('success');
          setMessage(response.data.message || 'Upgrade request verified! Awaiting admin approval.');
        } else {
          const response = await verify(token);
          const { userId, minecraftName } = response.data;
          localStorage.setItem('userId', userId.toString());
          setStatus('success');
          setMessage(`Welcome ${minecraftName || 'back'}! Your email has been verified.`);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
            {status === 'loading' && (
              <div className="bg-info/20">
                <Loader2 className="w-8 h-8 text-info animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-success/20">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-destructive/20">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying...'}
            {status === 'success' && (isUpgrade ? 'Request Verified' : 'Email Verified')}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && !isUpgrade && (
            <Button
              className="w-full btn-glow"
              onClick={() => navigate('/')}
            >
              Go to Home
            </Button>
          )}
          {status === 'success' && isUpgrade && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          )}
          {status === 'error' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Verify;
