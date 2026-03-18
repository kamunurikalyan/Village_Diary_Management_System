import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Milk, LogOut, TrendingUp, Calendar, Plus, BarChart3, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { queryDocuments, createDocument, updateDocument, getDocuments, subscribeToCollection } from "@/lib/firestore";
import { generateMilkEntryPDF } from "@/lib/pdfGenerator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import NotificationBell from "@/components/NotificationBell";
import { exportMilkEntriesToCSV } from "@/lib/csvExport";
import { format, subDays } from "date-fns";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [fatPercentage, setFatPercentage] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [ratePerLitre, setRatePerLitre] = useState<number>(45);
  const [isDownloading, setIsDownloading] = useState(false);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [showCharts, setShowCharts] = useState(false);

  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= dateRange.from && entryDate <= dateRange.to;
  });

  const getMonthlyEarningsData = () => {
    const monthlyData: { [key: string]: number } = {};
    filteredEntries.forEach(entry => {
      const monthKey = entry.date.substring(0, 7);
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (entry.amount || 0);
    });
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({
        month: format(new Date(month + '-01'), 'MMM yy'),
        amount: Math.round(amount as number),
      }));
  };

  const getDailyTrendData = () => {
    const dailyData: { [key: string]: { quantity: number; amount: number } } = {};
    filteredEntries.slice(0, 30).forEach(entry => {
      if (!dailyData[entry.date]) {
        dailyData[entry.date] = { quantity: 0, amount: 0 };
      }
      dailyData[entry.date].quantity += entry.quantity || 0;
      dailyData[entry.date].amount += entry.amount || 0;
    });
    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, data]) => ({
        date: format(new Date(date), 'MM/dd'),
        quantity: Math.round((data as any).quantity * 10) / 10,
        amount: Math.round((data as any).amount),
      }));
  };

  const handleExportEntries = () => {
    exportMilkEntriesToCSV(filteredEntries, 'my-milk-entries');
    toast({ title: "Export Complete", description: "Milk entries exported to CSV" });
  };

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  // subscribe to rate changes so farmer dashboard reflects admin updates in real-time
  useEffect(() => {
    const unsub = subscribeToCollection('milk-rates', (docs: any[]) => {
      if (docs && docs.length > 0) {
        const sorted = [...docs].sort((a: any, b: any) => {
          const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        const latest = sorted[0];
        setRatePerLitre(latest?.ratePerLitre || 45);
      }
    });
    return () => unsub && unsub();
  }, []);

  const fetchEntries = async () => {
    if (!user?.uid) {
      console.log('No user UID available');
      return;
    }

    try {
      const userEntries = await queryDocuments('milk_entries', [
        { field: 'userId', operator: '==', value: user.uid }
      ]) as any[];

      userEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      setEntries(userEntries);

      const today = new Date().toISOString().split('T')[0];
      const todayEntryData = userEntries.find(entry => entry.date === today);
      setTodayEntry(todayEntryData);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyEntries = userEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      });
      const total = monthlyEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      setMonthlyTotal(total);

      const latestRate = await getLatestMilkRate();
      setRatePerLitre(latestRate);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

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

  const calculateAmount = (qty: number, fat: number, rate: number): number => {
    const fatBonus = Math.floor((fat - 4) / 0.5) * 5;
    return qty * (rate + Math.max(0, fatBonus));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const qty = parseFloat(quantity);
      
      // Validate quantity is between 0 and 100
      if (isNaN(qty) || qty <= 0 || qty > 100) {
        toast({
          title: "Invalid Quantity",
          description: "Quantity must be greater than 0 and up to 100 litres",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate fat percentage
      const fat = parseFloat(fatPercentage);
      if (isNaN(fat) || fat <= 0 || fat > 15) {
        toast({
          title: "Invalid Fat Percentage",
          description: "Fat percentage must be between 0 and 15",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const latestRate = await getLatestMilkRate();
      const currentRate = latestRate || 45;

      const amount = calculateAmount(qty, fat, currentRate);

      const today = new Date().toISOString().split('T')[0];
      const timeValue = entryTime || new Date().toTimeString().slice(0, 5);
      const createdAtTimestamp = new Date(`${today}T${timeValue}:00`).toISOString();

      if (todayEntry) {
        await updateDocument('milk_entries', todayEntry.id, {
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
          userId: user?.uid,
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

      await fetchEntries();
      setIsAddEntryOpen(false);
      setQuantity("");
      setFatPercentage("");
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

  const handleDownloadStatement = async () => {
    if (entries.length === 0) {
      toast({
        title: "No Data",
        description: "No milk entries to download",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      generateMilkEntryPDF(entries, { displayName: user?.displayName, email: user?.email }, false);
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
              <p className="text-sm text-muted-foreground">Farmer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCharts(!showCharts)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportEntries}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <NotificationBell />
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
                  <DialogDescription>Enter your daily milk collection details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddEntry} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (Litres)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="99.9"
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
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Today's Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayEntry ? `${todayEntry.quantity}L` : 'No entry'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayEntry ? `Fat: ${todayEntry.fat}% | ₹${todayEntry.amount}` : 'Add your first entry'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{monthlyTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total earnings this month</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Milk className="h-4 w-4" />
                Current Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{ratePerLitre}/L</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per litre rate
              </p>
            </CardContent>
          </Card>
        </div>

        {showCharts && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Daily Collection Trend</CardTitle>
                <CardDescription>Your milk quantity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getDailyTrendData()}>
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
                <CardTitle>Monthly Earnings</CardTitle>
                <CardDescription>Your earnings over months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getMonthlyEarningsData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="#82ca9d" name="Earnings (₹)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Entries</CardTitle>
                <CardDescription>Your milk collection history - {filteredEntries.length} entries</CardDescription>
              </div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries yet. Add your first milk entry!</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredEntries.map((entry: any, index: number) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold">
                        <span className="text-xs">#{filteredEntries.length - index}</span>
                      </div>
                      <div>
                        <p className="font-medium text-lg">{entry.date}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.quantity}L - {entry.fat}% fat
                        </p>
                        {entry.time && (
                          <p className="text-xs text-muted-foreground">
                            Time: {entry.time}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-primary">₹{entry.amount?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Rate: ₹{entry.ratePerLitre || ratePerLitre}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FarmerDashboard;
