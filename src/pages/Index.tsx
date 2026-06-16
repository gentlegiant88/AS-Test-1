import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, TrendingUp, ShieldCheck, Globe, History, ArrowRight, Activity, Award, CheckCircle, Bot, LogIn, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "https://auction-backend.daniel-hendricks1337.workers.dev";
const DOMAIN_NAME = "lasvegascybertruck.com";
const AUCTION_END_DATE = new Date("2026-06-17T00:00:00-07:00");
const RESERVE_PRICE = 1000;
const BID_INCREMENT = 100;

interface Bid {
  id: string;
  amount: number;
  name?: string;
  email?: string;
  pin?: string;
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
  const [editMaxBidAmount, setEditMaxBidAmount] = useState<string>("");

  const [currentUser, setCurrentUser] = useState<{name: string, email: string, pin?: string} | null>(() => {
    const saved = localStorage.getItem('auction_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const fetchBids = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bids`);
      const data = await res.json();
      const processed = (data.bids || [])
        .map((b: any) => ({
          ...b,
          timestamp: new Date(b.timestamp)
        }))
        .sort((a, b) => b.amount - a.amount);   // Highest bid first

      setBids(processed);
    } catch (err) {
      console.error("Failed to fetch bids", err);
    }
  };

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

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const highestBid = bids.length > 0 ? bids[0].amount : 0;
  const isHighestBidder = currentUser && bids.length > 0 
    ? bids[0].email?.toLowerCase() === currentUser.email?.toLowerCase()
    : false;
  const userMaxBid = currentUser 
  ? bids.find(b => b.email?.toLowerCase() === currentUser.email?.toLowerCase())?.maxAmount 
  : null;
    // Stable bidder numbers (locked to email, based on first bid time)
  const bidderNumberMap = bids.length > 0 
    ? (() => {
        const uniqueEmails = [...new Set(
          bids.map(b => b.email?.toLowerCase()).filter(Boolean)
        )];

        // Sort emails by their first bid timestamp
        const sortedEmails = uniqueEmails
          .map(email => {
            const firstBid = bids
              .filter(b => b.email?.toLowerCase() === email)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
            return { email, firstTime: firstBid ? new Date(firstBid.timestamp).getTime() : 0 };
          })
          .sort((a, b) => a.firstTime - b.firstTime);

        const map = {};
        sortedEmails.forEach((item, index) => {
          map[item.email] = index + 1;
        });
        return map;
      })()
    : {};

  const minNextBid = highestBid > 0 ? highestBid + BID_INCREMENT : 100;

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);

  // Timer
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
      if (calculateTimeLeft()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sendGHLTracking = (name: string, email: string, amount: number, pin: string) => {
    const trackingPayload = {
      type: "external_form_submission",
      timestamp: Date.now(),
      formId: "Auction Bid Form",
      formData: { first_name: name, email, "contact.security_pin": pin, "contact.maximum_bid": amount },
      formLabels: { first_name: "Full Name", email: "Email Address", "contact.security_pin": "Security PIN", "contact.maximum_bid": "Maximum Bid" },
      url: window.location.href,
      title: document.title,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      trackingId: "tk_84945ef98ad64c818d00ae3bcd173cfc",
      locationId: "H71py0LtXYeIKk7smCSK",
      sessionId: crypto.randomUUID(),
      properties: { deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop" },
    };

    fetch("https://backend.leadconnectorhq.com/external-tracking/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", version: "2021-07-28" },
      body: JSON.stringify(trackingPayload),
    }).catch(() => {});
  };

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
    if (!currentUser && !pin) {
      toast({ title: "PIN required", variant: "destructive" });
      return;
    }

    const amount = parseFloat(bidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount < minNextBid) {
      toast({ title: "Bid too low", description: `Minimum next bid is $${minNextBid.toLocaleString()}`, variant: "destructive" });
      return;
    }

    // === NEW TIE PROTECTION ===
    const currentHighestMax = bids.length > 0 ? Math.max(...bids.map(b => b.maxAmount || b.amount)) : 0;
    if (amount <= currentHighestMax) {
      toast({ 
        title: "Max bid too low", 
        description: `Please enter a max bid higher than $${currentHighestMax.toLocaleString()} to take the lead.`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/place-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: minNextBid, 
          maxAmount: amount,
          name, 
          email, 
          pin: currentUser?.pin || pin 
        })
      });

      const result = await res.json();

      if (result.success) {
        setCurrentUser({ name, email, pin: currentUser?.pin || pin });
        setBidAmount("");
        await fetchBids();
        sendGHLTracking(name, email, amount, currentUser?.pin || pin);

        toast({ 
          title: "Bid placed successfully!", 
          description: `Auto-bidding active up to $${amount.toLocaleString()}`,
          className: "bg-primary text-primary-foreground border-none"
        });
      } else if (result.error) {
        toast({ title: "Bid rejected", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to place bid", variant: "destructive" });
    }
  };

  const handleUpdateMaxBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuctionEnded || !currentUser) {
      toast({ title: "Error", description: "Please sign in to update your max bid.", variant: "destructive" });
      return;
    }

    const amount = parseFloat(editMaxBidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= highestBid) {
      toast({ title: "Invalid amount", description: `Max bid must be higher than current highest bid ($${highestBid.toLocaleString()})`, variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/place-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: highestBid, 
          maxAmount: amount,
          name: currentUser.name,
          email: currentUser.email,
          pin: currentUser.pin
        })
      });

      const result = await res.json();

      if (result.success) {
        await fetchBids();
        setEditMaxBidAmount("");
        toast({ 
          title: "Max Bid Updated", 
          description: `Your new maximum bid is now $${amount.toLocaleString()}`,
          className: "bg-primary text-primary-foreground border-none"
        });
      }
    } catch (err) {
      toast({ title: "Failed to update max bid", variant: "destructive" });
    }
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
              <div className="flex items-center gap-4 relative z-50">
                <span className="text-sm text-[#c9a84c] font-medium hidden sm:inline-block">{currentUser.email}</span>

                {userMaxBid && (
                  <div className="hidden md:flex items-center gap-1.5 text-sm">
                    <span className="text-zinc-400">Your Max Bid</span>
                    <span className="font-semibold text-[#f0d78c]">${userMaxBid.toLocaleString()}</span>
                  </div>
                )}

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
                      <Input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Security PIN</label>
                      <Input type="password" placeholder="••••" maxLength={10} value={loginPin} onChange={(e) => setLoginPin(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Sign In</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 lg:py-24 flex-1 relative z-20">
        
        {/* === UPDATED GRID: Bidding card appears early on mobile === */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* BIDDING CARD - Shows near the top on mobile */}
          <div className="lg:col-span-5 lg:order-2">
            <div className="lg:sticky lg:top-24">
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
                  {highestBid >= RESERVE_PRICE ? (
                    <p className="text-sm text-[#c9a84c] mt-3 font-medium flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> Reserve price met. Domain will be sold.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-400 mt-3 font-medium flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> Reserve price not met yet.
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="p-6 lg:p-8 space-y-8">
                  {isAuctionEnded ? (
                    <div className="bg-[#1a1a1a] border border-[#c9a84c]/30 rounded-xl p-8 text-center space-y-4 shadow-[0_0_30px_rgba(201,168,76,0.1)]">
                      <Award className="w-16 h-16 mx-auto text-[#c9a84c] mb-4" />
                      <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">Auction Concluded</h3>
                    </div>
                  ) : isHighestBidder ? (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 text-center space-y-4">
                      <CheckCircle className="w-16 h-16 mx-auto text-[#c9a84c] mb-4" />
                      <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">Bid Placed!</h3>
                      <p className="text-muted-foreground">You are currently the highest bidder.</p>
                      <p className="text-sm text-white">We will contact you at <span className="font-medium">{currentUser?.email}</span> if you win the auction.</p>

                      <div className="mt-6 pt-6 border-t border-primary/20">
                        <form onSubmit={handleUpdateMaxBid} className="space-y-4">
                          <label className="text-sm font-medium text-foreground block">Update Your Maximum Bid</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input type="number" value={editMaxBidAmount} onChange={(e) => setEditMaxBidAmount(e.target.value)} className="pl-8" min={highestBid + 100} step="100" placeholder="New max bid" required />
                          </div>
                          <Button type="submit" className="w-full">Update Max Bid</Button>
                        </form>
                      </div>
                    </div>
                  ) : currentUser ? (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 text-center space-y-4">
                      <CheckCircle className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                      <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">Bid Placed!</h3>
                      <p className="text-amber-400 font-medium">You have been outbid.</p>
                      <p className="text-muted-foreground">Update your max bid to stay competitive.</p>

                      <div className="mt-6 pt-6 border-t border-primary/20">
                        <form onSubmit={handleUpdateMaxBid} className="space-y-4">
                          <label className="text-sm font-medium text-foreground block">Update Your Maximum Bid</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input type="number" value={editMaxBidAmount} onChange={(e) => setEditMaxBidAmount(e.target.value)} className="pl-8" min={highestBid + 100} step="100" placeholder="New max bid" required />
                          </div>
                          <Button type="submit" className="w-full">Update Max Bid</Button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBid} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <Input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      {!currentUser && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Set Security PIN</label>
                          <Input type="password" placeholder="••••" maxLength={10} value={pin} onChange={(e) => setPin(e.target.value)} required />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Your Maximum Bid (USD)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                          <Input type="number" placeholder={minNextBid.toString()} value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} min={minNextBid} step="100" required className="pl-8" />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">Enter ${minNextBid.toLocaleString()} or more.</p>
                      </div>
                      <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#c9a84c] to-[#a68635] hover:from-[#f0d78c] hover:to-[#c9a84c] text-black shadow-[0_0_20px_rgba(201,168,76,0.3)] transition-all duration-300">
                        Place Premium Bid <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </form>
                  )}

                  {/* Recent Bids */}
                  <div className="pt-8 border-t border-white/5">
                    <h4 className="text-sm font-bold uppercase tracking-wider flex items-center text-zinc-400 mb-5 font-mono">
                      <History className="w-4 h-4 mr-2 text-[#c9a84c]" /> Recent Bids
                    </h4>
                    <div className="space-y-3">
                      {bids.length === 0 && <p className="text-sm text-zinc-500 italic py-4">No bids placed yet. Be the first!</p>}
                      
                      {bids.slice(0, 5).map((bid, i) => {
                        const isYou = bid.email && currentUser?.email === bid.email;
                        const isHighest = i === 0;
                        const stableNumber = bidderNumberMap[bid.email?.toLowerCase()] || (i + 1);

                        return (
                          <div 
                            key={bid.id} 
                            className={`flex justify-between items-center p-4 rounded-xl transition-all ${
                              isHighest 
                                ? 'bg-[#c9a84c]/10 border border-[#c9a84c]/30 shadow-[0_0_15px_rgba(201,168,76,0.1)]' 
                                : 'bg-white/5 border border-transparent'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-sm text-white">
                                {isYou ? "You" : `Bidder #${stableNumber}`}
                              </p>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold font-['Space_Grotesk'] text-lg ${isHighest ? 'text-[#f0d78c]' : 'text-white'}`}>
                                ${bid.amount.toLocaleString()}
                              </p>
                              {isHighest && (
                                <span className="text-[10px] uppercase tracking-widest text-[#c9a84c] font-bold">
                                  HIGHEST
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* LEFT CONTENT - Headline + Features + Marketing Sections */}
          <div className="lg:col-span-7 lg:order-1 space-y-12">
            
            {/* Hero Section */}
            <div className="space-y-8">
              <Badge variant="outline" className="border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#f0d78c] px-5 py-2 text-sm uppercase tracking-widest font-mono backdrop-blur-md shadow-[0_0_15px_rgba(201,168,76,0.2)]">
                <Activity className="w-4 h-4 mr-2 inline animate-pulse" /> Live Premium Auction
              </Badge>

              <h1 className="text-[clamp(1.25rem,6vw,3.5rem)] lg:text-[clamp(1.5rem,3.5vw,4rem)] xl:text-[clamp(2rem,4vw,4.5rem)] font-bold tracking-tighter font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-b from-white via-[#f0d78c] to-[#c9a84c] drop-shadow-sm leading-tight">
                Own the Definitive Cybertruck Brand in Las Vegas
              </h1>

              <p className="text-xl lg:text-2xl text-zinc-300 font-light leading-relaxed max-w-2xl">
                The premium domain for luxury Cybertruck rentals, private desert tours, and exclusive high-end experiences in the entertainment capital of the world.
              </p>

              <p className="text-lg text-zinc-400 max-w-2xl">
                With roughly <span className="text-[#f0d78c] font-medium">38–42 million visitors</span> every year, Las Vegas is one of the top destinations for premium experiences. 
                <span className="font-medium text-white"> lasvegascybertruck.com</span> gives you instant brand authority in the fast-growing luxury electric vehicle and experiential tourism market.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10 border-t border-white/10">
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors"><Globe className="w-6 h-6 text-[#f0d78c]" /></div>
                <div><h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Global Appeal</h3><p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Short, memorable, and globally understood.</p></div>
              </div>
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors"><ShieldCheck className="w-6 h-6 text-[#f0d78c]" /></div>
                <div><h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Secure Transfer</h3><p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Escrow.com integrated for guaranteed safe transaction.</p></div>
              </div>
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors"><TrendingUp className="w-6 h-6 text-[#f0d78c]" /></div>
                <div><h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Exact Match</h3><p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Highly searched keywords. Instantly recognizable for anyone looking to rent a Cybertruck in Vegas.</p></div>
              </div>
              <div className="flex items-start space-x-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.2)] group">
                <div className="bg-[#c9a84c]/10 p-4 rounded-xl group-hover:bg-[#c9a84c]/20 transition-colors"><Award className="w-6 h-6 text-[#f0d78c]" /></div>
                <div><h3 className="font-semibold text-white text-lg font-['Space_Grotesk']">Brand Authority</h3><p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">Own the definitive digital presence for Tesla's most iconic vehicle in the entertainment capital.</p></div>
              </div>
            </div>

            {/* The Las Vegas Opportunity */}
            <div className="pt-12 border-t border-white/10">
              <h2 className="text-3xl font-bold tracking-tight font-['Space_Grotesk'] text-white mb-4">
                A Massive & Proven Market
              </h2>
              <p className="text-lg text-zinc-400 max-w-3xl">
                Las Vegas attracts approximately <span className="text-[#f0d78c] font-medium">38–42 million visitors</span> every year. 
                Demand for unique, premium transportation experiences — especially with standout vehicles like the Cybertruck — continues to grow among high-net-worth travelers, corporate groups, and luxury tourists.
              </p>
              <p className="text-lg text-zinc-400 max-w-3xl mt-3">
                Owning the exact-match domain for Cybertruck experiences in Las Vegas puts you at the center of this high-margin opportunity.
              </p>
            </div>

            {/* Why This Domain Stands Out */}
            <div className="pt-10">
              <h2 className="text-3xl font-bold tracking-tight font-['Space_Grotesk'] text-white mb-4">
                Instant Authority. Maximum Impact.
              </h2>
              <p className="text-lg text-zinc-400 max-w-3xl">
                <span className="font-medium text-white">lasvegascybertruck.com</span> is the clearest, most memorable, and most brandable domain possible for this niche. 
                It instantly communicates what you offer, builds trust with customers, and positions your business as the premium choice in the market.
              </p>
            </div>

            {/* Premium Use Cases */}
            <div className="pt-10">
              <h2 className="text-3xl font-bold tracking-tight font-['Space_Grotesk'] text-white mb-6">
                Built for Multiple High-Margin Revenue Streams
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#121212]/60 border border-white/10 p-6 rounded-2xl">
                  <h3 className="font-semibold text-white text-xl mb-2">Luxury Private Tours</h3>
                  <p className="text-zinc-400">Sunset desert experiences, Red Rock Canyon, and custom VIP itineraries.</p>
                </div>
                <div className="bg-[#121212]/60 border border-white/10 p-6 rounded-2xl">
                  <h3 className="font-semibold text-white text-xl mb-2">Premium Vehicle Rentals</h3>
                  <p className="text-zinc-400">Daily and weekly rentals for high-net-worth travelers and influencers.</p>
                </div>
                <div className="bg-[#121212]/60 border border-white/10 p-6 rounded-2xl">
                  <h3 className="font-semibold text-white text-xl mb-2">Corporate & Event Experiences</h3>
                  <p className="text-zinc-400">VIP transport for conferences, weddings, and brand activations.</p>
                </div>
                <div className="bg-[#121212]/60 border border-white/10 p-6 rounded-2xl">
                  <h3 className="font-semibold text-white text-xl mb-2">Content & Media Production</h3>
                  <p className="text-zinc-400">Film, photography, and influencer partnerships.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
