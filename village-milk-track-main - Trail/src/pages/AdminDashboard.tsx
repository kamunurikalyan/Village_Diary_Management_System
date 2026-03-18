import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Milk, LogOut, Users, TrendingUp, IndianRupee, Settings, Plus, Shield, Calendar, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { queryDocuments, createDocument, updateDocument, createDocumentWithId, getDocuments } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { generateMilkEntryPDF } from "@/lib/pdfGenerator";
import { FileDown } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { exportMilkEntriesToCSV, exportPaymentsToCSV, exportRateHistoryToCSV } from "@/lib/csvExport";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [fatPercentage, setFatPercentage] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalFarmers: 0,
    todayCollection: 0,
    monthlyTotal: 0,
  });
  const [ratePerLitre, setRatePerLitre] = useState("45");
  const [isDownloading, setIsDownloading] = useState(false);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [pendingFarmers, setPendingFarmers] = useState<any[]>([]);
  const [isApprovingFarmer, setIsApprovingFarmer] = useState(false);

  const filteredEntries = allEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= dateRange.from && entryDate <= dateRange.to;
  });

  const handleExportMilkEntries = () => {
    exportMilkEntriesToCSV(filteredEntries, 'milk-entries');
    toast({ title: "Export Complete", description: "Milk entries exported to CSV" });
  };

  const handleExportPayments = async () => {
    try {
      // Calculate payments from milk entries (grouped by farmer and month)
      const paymentsData = filteredEntries.map(entry => {
        const farmer = farmers.find(f => f.uid === entry.userId || f.id === entry.userId || f.uid === String(entry.userId) || f.id === String(entry.userId));
        return {
          date: entry.date,
          farmerName: farmer?.displayName || farmer?.email || 'Unknown',
          quantity: entry.quantity,
          fat: entry.fat,
          amount: entry.amount,
          ratePerLitre: entry.ratePerLitre,
        };
      });
      
      if (paymentsData.length === 0) {
        toast({
          title: "No Data",
          description: "No payment data to export",
          variant: "destructive",
        });
        return;
      }

      exportPaymentsToCSV(paymentsData, 'payments');
      toast({ title: "Export Complete", description: "Payment data exported to CSV" });
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast({
        title: "Error",
        description: "Failed to export payments",
        variant: "destructive",
      });
    }
  };

  const handleExportRateHistory = () => {
    exportRateHistoryToCSV(rateHistory, 'rate-history');
    toast({ title: "Export Complete", description: "Rate history exported to CSV" });
  };

  const getDailyCollectionData = () => {
    const dailyData: { [key: string]: { quantity: number; amount: number } } = {};
    filteredEntries.forEach(entry => {
      if (!dailyData[entry.date]) {
        dailyData[entry.date] = { quantity: 0, amount: 0 };
      }
      dailyData[entry.date].quantity += entry.quantity || 0;
      dailyData[entry.date].amount += entry.amount || 0;
    });
    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({
        date: format(new Date(date), 'MM/dd'),
        quantity: Math.round(data.quantity * 10) / 10,
        amount: Math.round(data.amount),
      }));
  };

  const getFarmerContributionData = () => {
    const farmerData: { [key: string]: number } = {};
    filteredEntries.forEach(entry => {
      const farmer = farmers.find(f => f.uid === entry.userId || f.id === entry.userId || f.uid === String(entry.userId) || f.id === String(entry.userId));
      const name = farmer?.displayName || farmer?.name || farmer?.email || 'Unknown';
      farmerData[name] = (farmerData[name] || 0) + (entry.amount || 0);
    });
    return Object.entries(farmerData)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  };

  const getFatDistributionData = () => {
    const fatRanges = { '<3': 0, '3-4': 0, '4-5': 0, '5-6': 0, '>6': 0 };
    filteredEntries.forEach(entry => {
      const fat = entry.fat || 0;
      if (fat < 3) fatRanges['<3']++;
      else if (fat < 4) fatRanges['3-4']++;
      else if (fat < 5) fatRanges['4-5']++;
      else if (fat < 6) fatRanges['5-6']++;
      else fatRanges['>6']++;
    });
    return Object.entries(fatRanges).map(([range, count]) => ({ range, count }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const getLatestMilkRate = async (): Promise<number> => {
    try {
      const rateData = await getDocuments('milk-rates') as any[];
      if (rateData.length > 0) {
        const sortedRates = [...rateData].sort((a: any, b: any) => {
          const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        const latestRateDoc = sortedRates[0];
        return latestRateDoc?.ratePerLitre || 45;
      }
      return 45;
    } catch (error) {
      console.error('Error fetching latest rate:', error);
      return 45;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // fetch all farmer accounts (approved or not) so historical entries can be mapped to names
      const allFarmersData = await queryDocuments('users', [
        { field: 'role', operator: '==', value: 'farmer' }
      ]) as any[];
      setFarmers(allFarmersData);

      const pendingFarmersData = await queryDocuments('users', [
        { field: 'role', operator: '==', value: 'farmer' },
        { field: 'isApproved', operator: '==', value: false },
        { field: 'status', operator: '==', value: 'pending' }
      ]) as any[];
      setPendingFarmers(pendingFarmersData);

      const entriesData = await queryDocuments('milk_entries', []) as any[];
      
      entriesData.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      
      setAllEntries(entriesData);

      const ratesData = await getDocuments('milk-rates') as any[];
      const sortedRates = ratesData
        .sort((a: any, b: any) => b.id.localeCompare(a.id))
        .map((r: any) => ({
          ...r,
          createdAt: r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt)
        }));
      setRateHistory(sortedRates);

      // count only approved farmers for stats
      const totalFarmers = allFarmersData.filter(f => f.isApproved).length;
      const today = new Date().toISOString().split('T')[0];
      const todayEntriesOnly = entriesData.filter(entry => entry.date === today);
      const todayCollection = todayEntriesOnly.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyEntries = entriesData.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      });
      const monthlyTotal = monthlyEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

      const latestRate = await getLatestMilkRate();
      setRatePerLitre(String(latestRate));

      setStats({
        totalFarmers,
        todayCollection,
        monthlyTotal,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createDocument('milk-rates', {
        ratePerLitre: parseFloat(ratePerLitre),
        updatedAt: new Date(),
        updatedBy: user?.uid,
        userEmail: user?.email,
        createdAt: new Date(),
      });
      
      toast({
        title: "Rate updated",
        description: "Milk rate has been updated successfully.",
      });
      setIsDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error updating rate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = (qty: number, fat: number, rate: number): number => {
    const fatBonus = Math.floor((fat - 4) / 0.5) * 5;
    return qty * (rate + Math.max(0, fatBonus));
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const latestRate = await getLatestMilkRate();
      const currentRate = latestRate || 45;

      const qty = parseFloat(quantity);
      const fat = parseFloat(fatPercentage);

      const amount = calculateAmount(qty, fat, currentRate);

      const today = new Date().toISOString().split('T')[0];
      const timeValue = entryTime || new Date().toTimeString().slice(0, 5);
      const createdAtTimestamp = new Date(`${today}T${timeValue}:00`).toISOString();

      const existingEntry = await queryDocuments('milk_entries', [
        { field: 'userId', operator: '==', value: selectedFarmer },
        { field: 'date', operator: '==', value: today }
      ]);

      if (existingEntry.length > 0) {
        await updateDocument('milk_entries', existingEntry[0].id, {
          quantity: qty,
          fat: fat,
          amount: amount,
          ratePerLitre: currentRate,
          time: timeValue,
          createdAt: createdAtTimestamp,
        });
        toast({
          title: "Entry updated",
          description: `Entry saved with rate ₹${currentRate}/L - Amount: ₹${amount}`,
        });
      } else {
        await createDocument('milk_entries', {
          userId: selectedFarmer,
          date: today,
          time: timeValue,
          createdAt: createdAtTimestamp,
          quantity: qty,
          fat: fat,
          amount: amount,
          ratePerLitre: currentRate,
        });
        toast({
          title: "Entry added",
          description: `Entry saved with rate ₹${currentRate}/L - Amount: ₹${amount}`,
        });
      }

      await fetchData();
      setIsAddEntryOpen(false);
      setQuantity("");
      setFatPercentage("");
      setSelectedFarmer("");
      setEntryTime("");
    } catch (error: any) {
      console.error('Error saving milk entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save milk entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (entry: any): string => {
    if (entry.time) {
      return entry.time;
    }
    if (entry.createdAt) {
      const date = new Date(entry.createdAt);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return '-';
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      
      if (adminName) {
        await updateProfile(userCredential.user, { displayName: adminName });
      }

      await createDocumentWithId('users', userCredential.user.uid, {
        email: adminEmail,
        displayName: adminName,
        role: 'admin',
        uid: userCredential.user.uid,
        createdAt: new Date(),
        createdBy: user?.uid,
      });

      toast({
        title: "Admin created",
        description: `Admin account for ${adminEmail} has been created successfully.`,
      });

      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
      setIsCreateAdminOpen(false);
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setCreateAdminLoading(false);
    }
  };

  const handleDownloadStatement = async () => {
    if (allEntries.length === 0) {
      toast({
        title: "No Data",
        description: "No milk entries to download",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      generateMilkEntryPDF(allEntries, undefined, true);
      toast({
        title: "Download Started",
        description: "Your PDF is being generated",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApproveFarmer = async (farmerId: string, farmerEmail: string) => {
    try {
      setIsApprovingFarmer(true);
      await updateDocument('users', farmerId, {
        isApproved: true,
        status: 'approved',
        approvedAt: new Date()
      });
      
      toast({
        title: "Farmer Approved",
        description: `${farmerEmail} has been approved successfully.`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error approving farmer:', error);
      toast({
        title: "Error",
        description: "Failed to approve farmer",
        variant: "destructive",
      });
    } finally {
      setIsApprovingFarmer(false);
    }
  };

  const handleRejectFarmer = async (farmerId: string, farmerEmail: string) => {
    try {
      setIsApprovingFarmer(true);
      await updateDocument('users', farmerId, {
        isApproved: false,
        status: 'rejected',
        rejectedAt: new Date()
      });
      
      toast({
        title: "Farmer Rejected",
        description: `${farmerEmail} has been rejected.`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error rejecting farmer:', error);
      toast({
        title: "Error",
        description: "Failed to reject farmer",
        variant: "destructive",
      });
    } finally {
      setIsApprovingFarmer(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-primary to-secondary p-2 rounded-lg">
              <Milk className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Village Dairy</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setIsDateFilterOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" onClick={() => setShowCharts(!showCharts)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={handleExportMilkEntries} className="justify-start">Export Milk Entries</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPayments} className="justify-start">Export Payments</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportRateHistory} className="justify-start">Export Rate History</Button>
                </div>
              </PopoverContent>
            </Popover>

            <NotificationBell />

            <Dialog open={isCreateAdminOpen} onOpenChange={setIsCreateAdminOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Admin Account</DialogTitle>
                  <DialogDescription>Create a new admin account for the dairy system</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <Input
                      id="admin-name"
                      type="text"
                      placeholder="Admin Name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createAdminLoading}>
                    {createAdminLoading ? "Creating..." : "Create Admin"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Milk Entry</DialogTitle>
                  <DialogDescription>Enter milk collection details for a farmer</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddEntry} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="farmer">Select Farmer</Label>
                    <select
                      id="farmer"
                      value={selectedFarmer}
                      onChange={(e) => setSelectedFarmer(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      required
                    >
                      <option value="">Choose a farmer...</option>
                      {farmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.uid}>
                          {farmer.displayName || farmer.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (Litres)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      placeholder="25.0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fat">Fat Percentage (%)</Label>
                    <Input
                      id="fat"
                      type="number"
                      step="0.1"
                      placeholder="4.5"
                      value={fatPercentage}
                      onChange={(e) => setFatPercentage(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                    />
                  </div>
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm font-medium">Current Rate: ₹{ratePerLitre}/L</p>
                    <p className="text-xs text-muted-foreground">Rate will be fetched from Firebase</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Saving..." : "Save Entry"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Set Rate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Milk Rate</DialogTitle>
                  <DialogDescription>Set the rate per litre for milk collection</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateRate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate per Litre (₹)</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.1"
                      placeholder="45.0"
                      value={ratePerLitre}
                      onChange={(e) => setRatePerLitre(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Updating..." : "Update Rate"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Farmers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalFarmers}</div>
              <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Today's Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayCollection}L</div>
              <p className="text-xs text-muted-foreground mt-1">Total milk collected</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Monthly Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.monthlyTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total payments this month</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Today's Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{ratePerLitre}/L</div>
              <p className="text-xs text-muted-foreground mt-1">Current milk rate</p>
            </CardContent>
          </Card>
        </div>

        {pendingFarmers.length > 0 && (
          <Card className="shadow-lg mb-8 border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle>Pending Farmer Approvals</CardTitle>
              <CardDescription>{pendingFarmers.length} farmer(s) pending approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingFarmers.map((farmer: any) => (
                  <div key={farmer.uid} className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{farmer.displayName || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{farmer.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied: {farmer.createdAt?.toDate ? new Date(farmer.createdAt.toDate()).toLocaleDateString() : new Date(farmer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveFarmer(farmer.uid, farmer.email)}
                        disabled={isApprovingFarmer}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectFarmer(farmer.uid, farmer.email)}
                        disabled={isApprovingFarmer}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {showCharts && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Daily Collection Trend</CardTitle>
                <CardDescription>Milk quantity and earnings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getDailyCollectionData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#8884d8" name="Quantity (L)" />
                    <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#82ca9d" name="Amount (₹)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Farmer Contribution</CardTitle>
                <CardDescription>Top 10 farmers by earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFarmerContributionData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#8884d8" name="Amount (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Fat Distribution</CardTitle>
                <CardDescription>Milk quality distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getFatDistributionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.range}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {getFatDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Rate History</CardTitle>
                <CardDescription>Milk rate changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                {rateHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No rate history available</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {rateHistory.slice(0, 10).map((rate: any) => (
                      <div key={rate.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">₹{rate.ratePerLitre}/L</span>
                        <span className="text-sm text-muted-foreground">
                          {rate.createdAt ? format(new Date(rate.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Milk Collection Records</CardTitle>
            <CardDescription>Filtered: {filteredEntries.length} entries from {format(dateRange.from, 'MMM dd')} to {format(dateRange.to, 'MMM dd, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries in selected date range.</p>
            ) : (
              <div className="rounded-md border">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Date</TableHead>
                      <TableHead className="w-16">Time</TableHead>
                      <TableHead className="w-32 text-left">Farmer Name</TableHead>
                      <TableHead className="w-16">Quantity (L)</TableHead>
                      <TableHead className="w-12">Fat %</TableHead>
                      <TableHead className="w-20">Rate (₹/L)</TableHead>
                      <TableHead className="w-24 text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry: any) => {
                      const farmer = farmers.find((f: any) => f.uid === entry.userId || f.id === entry.userId || f.uid === String(entry.userId));
                      const timeStr = formatTime(entry);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium text-left whitespace-nowrap">{entry.date}</TableCell>
                          <TableCell className="text-muted-foreground text-left">{timeStr}</TableCell>
                          <TableCell className="font-medium text-left max-w-[8rem] truncate overflow-hidden">
                            {farmer?.displayName || farmer?.name || farmer?.email || 'Unknown Farmer'}
                          </TableCell>
                          <TableCell className="text-center px-2">{entry.quantity}L</TableCell>
                          <TableCell className="text-center px-2">{entry.fat}%</TableCell>
                          <TableCell className="text-center px-2">₹{(entry.ratePerLitre || ratePerLitre)}/L</TableCell>
                          <TableCell className="font-semibold text-primary text-right whitespace-nowrap px-3">₹{entry.amount?.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
