import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, TrendingUp, ShieldCheck, Globe, History, ArrowRight, Activity, Award, CheckCircle, Bot, LogIn, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DOMAIN_NAME = "lasvegascybertruck.com";
const AUCTION_END_DATE = new Date("2026-06-15T00:00:00-07:00");
const API_BASE = "https://auction-backend.daniel-hendricks1337.workers.dev";

interface Bid {
  id: string;
  amount: number;
  bidder: string;
  name?: string;
  email?: string;
  pin?: string;
  isAutoBid?: boolean;
  maxAmount?: number;
  timestamp: Date;
}

const Index = () => {
  const { toast } = useToast();

  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{name: string, email: string, pin?: string} | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPin, setLoginPin] = useState<string>("");

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAuctionEnded, setIsAuctionEnded] = useState<boolean>(false);
  const [isEditingMaxBid, setIsEditingMaxBid] = useState<boolean>(false);
  const [editMaxBidAmount, setEditMaxBidAmount] = useState<string>("");

  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : 0;
  const minNextBid = highestBid + 500;

  // ====================== BACKEND INTEGRATION ======================
  const fetchBids = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bids`);
      const data = await res.json();
      setBids(data.bids || []);
    } catch (err) {
      console.error("Failed to fetch bids", err);
    }
  };

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 2000); // refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const distance = AUCTION_END_DATE.getTime() - now;
      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsAuctionEnded(true);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuctionEnded) {
      toast({ title: "Auction Ended", description: "Bidding is no longer allowed.", variant: "destructive" });
      return;
    }
    if (!name || !email) {
      toast({ title: "Name & Email required", variant: "destructive" });
      return;
    }

    const amount = parseFloat(bidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount < minNextBid) {
      toast({ title: "Bid too low", description: `Minimum next bid is $${minNextBid.toLocaleString()}`, variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/place-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: minNextBid, name, email, pin: pin || currentUser?.pin })
      });

      const result = await res.json();
      if (result.success) {
        setCurrentUser({ name, email, pin: pin || currentUser?.pin });
        setBidAmount("");
        toast({ 
          title: "Bid placed successfully!", 
          description: `You are now the highest bidder at $${minNextBid.toLocaleString()}`,
          className: "bg-primary text-primary-foreground border-none"
        });
      }
    } catch (err) {
      toast({ title: "Failed to place bid", variant: "destructive" });
    }
  };

  const handleUpdateMaxBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuctionEnded) return;
    const amount = parseFloat(editMaxBidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= bids[0]?.amount) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const updatedBids = [...bids];
    if (updatedBids[0]) {
      updatedBids[0] = { ...updatedBids[0], isAutoBid: true, maxAmount: amount };
      setBids(updatedBids);
    }
    setIsEditingMaxBid(false);
    toast({ title: "Auto-bid updated" });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userBids = bids.filter(b => b.email?.toLowerCase() === loginEmail.toLowerCase());
    if (userBids.length > 0) {
      if (userBids[0].pin !== loginPin) {
        toast({ title: "Incorrect PIN", variant: "destructive" });
        return;
      }
      const userName = userBids[0].name || loginEmail.split('@')[0];
      setCurrentUser({ name: userName, email: loginEmail, pin: loginPin });
      setName(userName);
      setEmail(loginEmail);
      toast({ title: "Welcome back!" });
      setIsLoginOpen(false);
    } else {
      toast({ title: "No bids found", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setName("");
    setEmail("");
    setPin("");
    toast({ title: "Signed out" });
  };

  const hasBid = currentUser ? bids.some(b => b.email?.toLowerCase() === currentUser.email.toLowerCase()) : false;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground font-sans selection:bg-[#c9a84c] selection:text-black flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#0a0a0a]/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/90 to-[#0a0a0a] z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/80 z-10" />
        <img 
          src="https://vibe.filesafe.space/1781476464602106944/assets/66cffca3-c2cd-4113-abde-70cfa96a66da.png" 
          alt="Las Vegas Cybertruck Background" 
          className="w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay z-20 pointer-events-none" />
      </div>

      {/* Header */}
      <header className="border-b border-[#c9a84c]/20 bg-[#0a0a0a]/60 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="font-['Space_Grotesk'] font-bold text-lg sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-[#c9a84c] tracking-tighter flex items-center whitespace-nowrap">
            <Globe className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-[#c9a84c] shrink-0" />
            <span className="truncate">{DOMAIN_NAME}</span>
          </div>
          <div>
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-[#c9a84c] font-medium hidden sm:inline-block">{currentUser.email}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white hover:bg-white/5">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            ) : (
              <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black">
                    <LogIn className="w-4 h-4 mr-2" /> Sign In
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-[#121212] border-[#c9a84c]/30">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-['Space_Grotesk']">Sign In</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Address</label>
                      <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Security PIN</label>
                      <Input type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full">Sign In</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 lg:py-24 flex-1 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-12">
            <div className="space-y-8">
              <Badge variant="outline" className="border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#f0d78c] px-5 py-2 text-sm uppercase tracking-widest font-mono">
                <Activity className="w-4 h-4 mr-2 inline animate-pulse" /> Live Premium Auction
              </Badge>
              <h1 className="text-[clamp(1.25rem,6vw,3.5rem)] lg:text-[clamp(1.5rem,3.5vw,4rem)] xl:text-[clamp(2rem,4vw,4.5rem)] font-bold tracking-tighter font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f0d78c] to-[#c9a84c]">
                {DOMAIN_NAME}
              </h1>
              <p className="text-xl lg:text-2xl text-zinc-300 font-light leading-relaxed max-w-2xl">
                The ultimate digital real estate. Establish instant authority and dominate the luxury Cybertruck rental and tour market in Las Vegas.
              </p>
            </div>

            {/* Your feature cards - keep as is */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10 border-t border-white/10">
              {/* ... your 4 feature cards ... */}
            </div>
          </div>

          {/* Right Column - Auction Box */}
          <div className="lg:col-span-4 relative">
            <Card className="bg-[#0f0f0f]/80 backdrop-blur-2xl border-[#c9a84c]/30 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent pb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Current Highest Bid</span>
                  <div className={`flex items-center text-[#1a1a1a] px-4 py-1.5 rounded-full text-xs font-bold ${isAuctionEnded ? 'bg-zinc-400' : 'bg-gradient-to-r from-[#f0d78c] to-[#c9a84c]'}`}>
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    {isAuctionEnded ? "AUCTION ENDED" : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}
                  </div>
                </div>
                <CardTitle className="text-6xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
                  ${highestBid.toLocaleString()}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 lg:p-8 space-y-8">
                {isAuctionEnded ? (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 mx-auto text-[#c9a84c] mb-4" />
                    <h3 className="text-2xl font-bold">Auction Concluded</h3>
                  </div>
                ) : hasBid ? (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-[#c9a84c] mb-4" />
                    <h3 className="text-2xl font-bold">You are the highest bidder!</h3>
                  </div>
                ) : (
                  <form onSubmit={handleBid} className="space-y-4">
                    <div className="space-y-2">
                      <label>Full Name</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={!!currentUser} />
                    </div>
                    <div className="space-y-2">
                      <label>Email Address</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!currentUser} />
                    </div>
                    {!currentUser && (
                      <div className="space-y-2">
                        <label>Security PIN</label>
                        <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} required />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label>Maximum Bid (USD)</label>
                      <Input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} min={minNextBid} step="100" />
                    </div>
                    <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#c9a84c] to-[#a68635]">
                      Place Premium Bid <ArrowRight className="ml-2" />
                    </Button>
                  </form>
                )}

                {/* Recent Bids */}
                <div className="pt-8 border-t border-white/5">
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-5 flex items-center">
                    <History className="w-4 h-4 mr-2" /> Recent Bids
                  </h4>
                  <div className="space-y-3">
                    {bids.length === 0 && <p className="text-zinc-500 italic">No bids yet. Be the first!</p>}
                    {bids.slice(0, 5).map((bid, i) => (
                      <div key={bid.id} className={`flex justify-between p-4 rounded-xl ${i === 0 ? 'bg-[#c9a84c]/10 border border-[#c9a84c]/30' : 'bg-white/5'}`}>
                        <div>
                          <p className="font-semibold">{bid.name || bid.bidder}</p>
                          <p className="text-xs text-zinc-400">{new Date(bid.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <div className="font-bold text-lg">${bid.amount.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
