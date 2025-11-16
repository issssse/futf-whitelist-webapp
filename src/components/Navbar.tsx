import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import logo from '@/assets/logo.png';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    setIsAuthenticated(!!token);
    const handleStorage = () => {
      setIsAuthenticated(!!localStorage.getItem('adminToken'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [location]);

  const handleLogout = async () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  return (
    <nav className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src={logo} alt="FUTF Logo" className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
            <span className="text-xl font-bold gradient-text">FUTF Minecraft</span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant={location.pathname === '/' ? 'default' : 'ghost'}
                  onClick={() => navigate('/')}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Servers
                </Button>
                <Button
                  variant={location.pathname === '/admin' ? 'default' : 'ghost'}
                  onClick={() => navigate('/admin')}
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
