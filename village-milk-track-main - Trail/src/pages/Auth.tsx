import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Milk } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createDocumentWithId } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { user, userRole, signIn, signUp, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"farmer" | "admin">("farmer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userRole) {
      const currentPath = window.location.pathname;
      const targetPath = userRole === 'admin' ? '/admin' : '/farmer';
      
      if (currentPath !== targetPath) {
        navigate(targetPath);
      }
    }
  }, [user, userRole, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (user && userRole) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      // Wait for AuthContext to fetch user role and redirect
      // The useEffect will handle the redirect
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Invalid credentials";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Don't set loading false here - let the auth state change handle it
      // This prevents the UI from flickering before redirect
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const createdUser = await signUp(email, password, name);
      
      if (role === "farmer") {
        // Farmers need admin approval - set pending status
        await createDocumentWithId('users', createdUser.uid, {
          uid: createdUser.uid,
          email: createdUser.email,
          displayName: name,
          role: role,
          isApproved: false,
          status: 'pending',
          createdAt: new Date(),
        });
        
        // Sign out the farmer so they can't access dashboard until approved
        await logout();
        
        // Clear form
        setEmail("");
        setPassword("");
        setName("");
        
        toast({
          title: "Registration submitted",
          description: "Your account is pending approval by admin. You will be able to login after approval.",
        });
      } else {
        // Admin accounts are created directly
        await createDocumentWithId('users', createdUser.uid, {
          uid: createdUser.uid,
          email: createdUser.email,
          displayName: name,
          role: role,
          isApproved: true,
          status: 'approved',
          createdAt: new Date(),
        });
        
        toast({
          title: "Account created",
          description: "Welcome to Village Dairy!",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-lg mb-4 inline-block">
            <Milk className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Village Dairy</CardTitle>
          <CardDescription>Milk Collection Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="signup-role"
                        value="farmer"
                        checked={role === "farmer"}
                        onChange={(e) => setRole(e.target.value as "farmer" | "admin")}
                        className="text-primary"
                      />
                      <span>Farmer</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admin accounts can only be created by existing admins.
                  </p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
