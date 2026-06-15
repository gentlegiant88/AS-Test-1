import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, TrendingUp, ShieldCheck, Globe, History, ArrowRight, Activity, Award, CheckCircle, Bot, LogIn, LogOut, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "https://auction-backend.daniel-hendricks1337.workers.dev";
const DOMAIN_NAME = "lasvegascybertruck.com";
const AUCTION_END_DATE = new Date("2026-06-15T00:00:00-07:00"); // Midnight Pacific Time (end of June 14th)

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

  // Global bids from backend
  const [bids, setBids] = useState<Bid[]>([]);

  const [bidAmount, setBidAmount] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [pin, setPin] = useState<string>("");

  const [currentUser, setCurrentUser] = useState<{name: string, email: string, pin?: string} | null>(() => {
    const saved = localStorage.getItem('auction_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

    // Fetch bids from global backend
  const fetchBids = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bids`);
      const data = await res.json();
      
      // Convert timestamp strings to Date objects
      const processedBids = (data.bids || []).map((b: any) => ({
        ...b,
        timestamp: new Date(b.timestamp)
      }));
      
      setBids(processedBids);
    } catch (err) {
      console.error("Failed to fetch bids", err);
    }
  };
  
    // Load bids from backend + poll every 2 seconds
  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('auction_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('auction_user');
    }
  }, [currentUser]);

  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPin, setLoginPin] = useState<string>("");

  const hasBid = currentUser ? bids.some(b => b.email?.toLowerCase() === currentUser.email.toLowerCase()) : false;
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAuctionEnded, setIsAuctionEnded] = useState<boolean>(false);
  const [isEditingMaxBid, setIsEditingMaxBid] = useState<boolean>(false);
  const [editMaxBidAmount, setEditMaxBidAmount] = useState<string>("");

  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : 0;
  const minNextBid = highestBid + 500;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = AUCTION_END_DATE.getTime() - now;

      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsAuctionEnded(true);
        return true;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
      return false;
    };

    const ended = calculateTimeLeft();
    if (ended) return;

    const timer = setInterval(() => {
      const isEnded = calculateTimeLeft();
      if (isEnded) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

         const handleBid = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isAuctionEnded) {
 toast({ title: "Auction Ended", description: "Bidding is no longer allowed.", variant: "destructive" });
 return;
 }
 if (!name) {
 toast({ title: "Name required", description: "Please enter your full name to place a bid.", variant: "destructive" });
 return;
 }
 if (!email) {
 toast({ title: "Email required", description: "Please enter your email to place a bid.", variant: "destructive" });
 return;
 }
 if (!currentUser && !pin) {
 toast({ title: "PIN required", description: "Please set a security PIN to protect your bid.", variant: "destructive" });
 return;
 }

 const amount = parseFloat(bidAmount.replace(/,/g, ''));
 
 if (isNaN(amount)) {
 toast({ title: "Invalid amount", description: "Please enter a valid number.", variant: "destructive" });
 return;
 }
 
 if (amount < minNextBid) {
 toast({ title: "Bid too low", description: `Minimum next bid is $${minNextBid.toLocaleString()}`, variant: "destructive" });
 return;
 }

 try {
 // Send bid to global backend
 const res = await fetch(`${API_BASE}/api/place-bid`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ 
 amount: minNextBid, 
 name, 
 email, 
 pin: currentUser?.pin || pin 
 })
 });

 const result = await res.json();

 if (result.success) {
 setCurrentUser({ name, email, pin: currentUser?.pin || pin });
 setBidAmount("");

 // Send tracking to GoHighLevel
 const trackingPayload = {
 type: "external_form_submission",
 timestamp: Date.now(),
 formId: "Auction Bid Form",
 formData: {
 first_name: name,
 email: email,
 "contact.security_pin": currentUser?.pin || pin,
 "contact.maximum_bid": amount,
 },
 formLabels: {
 first_name: "Full Name",
 email: "Email Address",
 "contact.security_pin": "Security PIN",
 "contact.maximum_bid": "Maximum Bid",
 },
 url: window.location.href,
 title: document.title,
 path: window.location.pathname,
 userAgent: navigator.userAgent,
 trackingId: "tk_84945ef98ad64c818d00ae3bcd173cfc ",
 locationId: "H71py0LtXYeIKk7smCSK",
 sessionId: crypto.randomUUID(),
 properties: {
 deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
 },
 };

 fetch("https://backend.leadconnectorhq.com/external-tracking/events", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 version: "2021-07-28",
 },
 body: JSON.stringify(trackingPayload),
 }).catch(() => {});

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
    if (isAuctionEnded) {
      toast({ title: "Auction Ended", description: "Bidding is no longer allowed.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(editMaxBidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= bids[0].amount) {
      toast({ title: "Invalid amount", description: "Max bid must be greater than your current bid.", variant: "destructive" });
      return;
    }
    
    const updatedBids = [...bids];
    updatedBids[0] = {
      ...updatedBids[0],
      isAutoBid: true,
      maxAmount: amount
    };
    setBids(updatedBids);

    setIsEditingMaxBid(false);
    toast({ 
      title: "Auto-bid updated", 
      description: `Your maximum bid is now $${amount.toLocaleString()}`,
      className: "bg-primary text-primary-foreground border-none"
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userBids = bids.filter(b => b.email?.toLowerCase() === loginEmail.toLowerCase());
    
    if (userBids.length > 0) {
      if (userBids[0].pin !== loginPin) {
        toast({ title: "Incorrect PIN", description: "The security PIN you entered is incorrect.", variant: "destructive" });
        return;
      }
      const userName = userBids[0].name || loginEmail.split('@')[0];
      setCurrentUser({ name: userName, email: loginEmail, pin: loginPin });
      setName(userName);
      setEmail(loginEmail);
      toast({ 
        title: "Welcome back!", 
        description: "We've restored your active bids.",
        className: "bg-primary text-primary-foreground border-none"
      });
      setIsLoginOpen(false);
      setLoginEmail("");
      setLoginPin("");
    } else {
      toast({ 
        title: "No bids found", 
        description: "No bids found for this email. Please place a bid to create an account.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setName("");
    setEmail("");
    setPin("");
    toast({ title: "Signed out", description: "You have been securely signed out." });
  };

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

      {/* Decorative Gold Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#c9a84c] opacity-[0.07] blur-[150px] pointer-events-none z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#f0d78c] opacity-[0.05] blur-[120px] pointer-events-none z-10" />

      {/* Header */}
      <header className="border-b border-[#c9a84c]/20 bg-[#0a0a0a]/60 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="font-['Space_Grotesk'] font-bold text-lg sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-[#c9a84c] tracking-tighter flex items-center whitespace-nowrap">
            <Globe className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-[#c9a84c] shrink-0" />
            <span className="truncate">{DOMAIN_NAME}</span>
          </div>
          <div>
            {currentUser ? (
              <div className="flex items-center space-x-4 relative z-50">
                <span className="text-sm text-[#c9a84c] font-medium hidden sm:inline-block">{currentUser.email}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white hover:bg-white/5">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            ) : (
              <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black transition-all duration-300 relative z-50">
                    <LogIn className="w-4 h-4 mr-2" /> Sign In
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-[#121212] border-[#c9a84c]/30 shadow-2xl shadow-[#c9a84c]/10">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-['Space_Grotesk'] text-white">Sign In</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Email Address</label>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="bg-background/50 border-border focus-visible:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Security PIN</label>
                      <Input 
                        type="password" 
                        placeholder="••••"
                        maxLength={10}
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        className="bg-background/50 border-border focus-visible:ring-primary"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Sign In
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 lg:py-24 flex-1 relative z-20">
        
        {/* Asymmetric Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Domain Info (8 cols) */}
          <div className="lg:col-span-8 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="space-y-8">
              <Badge variant="outline" className="border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#f0d78c] px-5 py-2 text-sm uppercase tracking-widest font-mono backdrop-blur-md shadow-[0_0_15px_rgba(201,168,76,0.2)]">
                <Activity className="w-4 h-4 mr-2 inline animate-pulse" /> Live Premium Auction
              </Badge>
              <h1 className="text-[clamp(1.25rem,6vw,3.5rem)] lg:text-[clamp(1.5rem,3.5vw,4rem)] xl:text-[clamp(2rem,4vw,4.5rem)] whitespace-nowrap font-bold tracking-tighter font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f0d78c] to-[#c9a84c] drop-shadow-sm leading-tight">
                {DOMAIN_NAME}
              </h1>
              <p className="text-xl lg:text-2xl text-zinc-300 font-light leading-relaxed max-w-2xl">
                The ultimate digital real estate. Establish instant authority and dominate the luxury Cybertruck rental and tour market in Las Vegas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10 border-t border-white/10">
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors">
                  <Globe className="w-6 h-6 text-[#f0d78c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Global Appeal</h3>
                  <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Short, memorable, and globally understood.</p>
                </div>
              </div>
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-[#f0d78c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Secure Transfer</h3>
                  <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Escrow.com integrated for guaranteed safe transaction.</p>
                </div>
              </div>
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors">
                  <TrendingUp className="w-6 h-6 text-[#f0d78c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Exact Match</h3>
                  <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Highly searched keywords. Instantly recognizable for anyone looking to rent a Cybertruck in Vegas.</p>
                </div>
              </div>
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors">
                  <Award className="w-6 h-6 text-[#f0d78c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Brand Authority</h3>
                  <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Own the definitive digital presence for Tesla's most iconic vehicle in the entertainment capital.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Auction Tool (4 cols) */}
          <div className="lg:col-span-4 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 fill-mode-both">
            {/* Decorative background glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-[#c9a84c]/50 via-[#c9a84c]/10 to-transparent rounded-2xl blur-xl -z-10 opacity-70" />
            
            <Card className="bg-[#0f0f0f]/80 backdrop-blur-2xl border-[#c9a84c]/30 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent opacity-50"></div>
              
              <CardHeader className="border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent pb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Current Highest Bid</span>
                  <div className={`flex items-center text-[#1a1a1a] px-4 py-1.5 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(201,168,76,0.4)] ${isAuctionEnded ? 'bg-zinc-400 shadow-none' : 'bg-gradient-to-r from-[#f0d78c] to-[#c9a84c]'}`}>
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    {isAuctionEnded ? "AUCTION ENDED" : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}
                  </div>
                </div>
                <CardTitle className="text-6xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
                  ${highestBid.toLocaleString()}
                </CardTitle>
                <p className="text-sm text-[#c9a84c] mt-3 font-medium flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5" /> Reserve price met. Domain will be sold.
                </p>
              </CardHeader>
              
              <CardContent className="p-6 lg:p-8 space-y-8">
                {isAuctionEnded ? (
                  <div className="bg-[#1a1a1a] border border-[#c9a84c]/30 rounded-xl p-8 text-center space-y-4 shadow-[0_0_30px_rgba(201,168,76,0.1)]">
                    <div className="mx-auto w-16 h-16 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mb-4">
                      <Award className="w-8 h-8 text-[#c9a84c]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">Auction Concluded</h3>
                    {bids.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-muted-foreground">The winning bid was</p>
                        <p className="text-4xl font-bold text-[#f0d78c]">${highestBid.toLocaleString()}</p>
                        {hasBid && bids[0].email === currentUser?.email && (
                          <p className="text-[#c9a84c] font-medium mt-4 bg-[#c9a84c]/10 py-2 px-4 rounded-lg inline-block">
                            🎉 Congratulations, you won! We will contact you shortly.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        The auction has concluded with no bids.
                      </p>
                    )}
                  </div>
                ) : hasBid ? (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-[#c9a84c]/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(201,168,76,0.3)]">
                      <CheckCircle className="w-8 h-8 text-[#c9a84c]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">Bid Placed!</h3>
                    <p className="text-muted-foreground">
                      You are currently the highest bidder. We will contact you at <span className="text-white font-medium">{currentUser?.email || email}</span> if you win the auction.
                    </p>
                    <div className="mt-6 pt-6 border-t border-primary/20">
                      {!isEditingMaxBid ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                          {bids[0]?.isAutoBid ? (
                            <div className="flex items-center space-x-2 text-primary bg-primary/10 border border-primary/20 py-2 px-4 rounded-full text-sm">
                              <Bot className="w-4 h-4" />
                              <span>Auto-bidding active up to <strong>${bids[0].maxAmount?.toLocaleString()}</strong></span>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Auto-bidding is currently disabled.</p>
                          )}
                          <Button variant="outline" size="sm" onClick={() => { setIsEditingMaxBid(true); setEditMaxBidAmount(bids[0]?.maxAmount?.toString() || (bids[0].amount + 1000).toString()); }} className="border-primary/50 text-primary hover:bg-primary/20 hover:text-primary">
                            {bids[0]?.isAutoBid ? "Update Max Bid" : "Enable Auto-bid"}
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={handleUpdateMaxBid} className="space-y-4 text-left max-w-sm mx-auto animate-in fade-in slide-in-from-top-2">
                          <label className="text-sm font-medium text-foreground">New Maximum Bid (USD)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input 
                              type="number" 
                              value={editMaxBidAmount}
                              onChange={(e) => setEditMaxBidAmount(e.target.value)}
                              className="pl-8 bg-background/50 border-border focus-visible:ring-primary"
                              min={bids[0].amount + 100}
                              step="100"
                              required
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
                            <Button type="button" variant="ghost" onClick={() => setIsEditingMaxBid(false)} className="flex-1 hover:bg-secondary">Cancel</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                <form onSubmit={handleBid} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input 
                      type="text" 
                      placeholder="John Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-14 text-lg bg-background/50 border-border focus-visible:ring-primary"
                      required
                      disabled={!!currentUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 text-lg bg-background/50 border-border focus-visible:ring-primary"
                      required
                      disabled={!!currentUser}
                    />
                  </div>
                  {!currentUser && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Set Security PIN</label>
                      <Input 
                        type="password" 
                        placeholder="••••"
                        maxLength={10}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="h-14 text-lg bg-background/50 border-border focus-visible:ring-primary"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        You will need this PIN to log back in and manage your bids.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Your Maximum Bid (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                      <Input 
                        type="number" 
                        placeholder={minNextBid.toString()} 
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="pl-8 h-14 text-lg bg-background/50 border-border focus-visible:ring-primary"
                        min={minNextBid}
                        step="100"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      Enter ${minNextBid.toLocaleString()} or more. We'll bid just enough to keep you in the lead.
                    </p>
                  </div>
                  
                  <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#c9a84c] to-[#a68635] hover:from-[#f0d78c] hover:to-[#c9a84c] text-black shadow-[0_0_20px_rgba(201,168,76,0.3)] transition-all duration-300">
                    Place Premium Bid <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    By placing a bid, you commit to buy if you win.
                  </p>
                </form>
                )}

                <div className="pt-8 border-t border-white/5">
                  <h4 className="text-sm font-bold uppercase tracking-wider flex items-center text-zinc-400 mb-5 font-mono">
                    <History className="w-4 h-4 mr-2 text-[#c9a84c]" /> Recent Bids
                  </h4>
                  <div className="space-y-3">
                    {bids.length === 0 && (
                      <p className="text-sm text-zinc-500 italic py-4">No bids placed yet. Be the first!</p>
                    )}
                    {bids.slice(0, 5).map((bid, i) => (
                      <div key={bid.id} className={`flex justify-between items-center p-4 rounded-xl transition-all ${i === 0 ? 'bg-[#c9a84c]/10 border border-[#c9a84c]/30 shadow-[0_0_15px_rgba(201,168,76,0.1)]' : 'bg-white/5 border border-transparent'}`}>
                        <div>
                          <p className="font-semibold text-sm text-white">
                            {bid.email && currentUser?.email === bid.email 
                              ? "You" 
                              : `Bidder #${bids.indexOf(bid) + 1}`}
                            </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            { new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold font-['Space_Grotesk'] text-lg ${i === 0 ? 'text-[#f0d78c]' : 'text-white'}`}>${bid.amount.toLocaleString()}</p>
                          {i === 0 && <span className="text-[10px] uppercase tracking-widest text-[#c9a84c] font-bold">Highest</span>}
                        </div>
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
