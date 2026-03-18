import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Milk } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      navigate(userRole === 'admin' ? '/admin' : '/farmer');
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary to-secondary p-4 rounded-lg mb-4 inline-block">
            <Milk className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Village Dairy</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 py-12">
          <header className="text-center mb-12">
            <div className="bg-gradient-to-r from-primary to-secondary p-4 rounded-lg mb-4 inline-block">
              <Milk className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Welcome to Village Dairy</h1>
            <p className="text-lg text-muted-foreground">Milk Collection Management System</p>
          </header>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
              <h3 className="text-xl font-semibold mb-3">For Farmers</h3>
              <p className="text-muted-foreground mb-4">Track your daily milk collection, manage entries, and view payments.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
              <h3 className="text-xl font-semibold mb-3">For Admins</h3>
              <p className="text-muted-foreground mb-4">Monitor farmer records, manage rates, and view collection statistics.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
              <h3 className="text-xl font-semibold mb-3">Real-time Tracking</h3>
              <p className="text-muted-foreground mb-4">Get instant updates on milk collection and payment information.</p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
