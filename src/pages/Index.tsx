import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, TrendingUp, ShieldCheck, Globe, History, ArrowRight, Activity, Award, CheckCircle, Bot, LogIn, LogOut, Lock } from "lucide-react";
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

  // Fetch bids from backend
  const fetchBids = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bids`);
      const data = await res.json();
      setBids(data.bids || []);
    } catch (err) {
      console.error("Failed to fetch bids", err);
    }
  };

  // Load bids on mount + poll every 3 seconds
  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuctionEnded) {
      toast({ title: "Auction Ended", description: "Bidding is no longer allowed.", variant: "destructive" });
      return;
    }
    if (!name || !email) {
      toast({ title: "Missing info", description: "Name and email are required.", variant: "destructive" });
      return;
    }

    const amount = parseFloat(bidAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount < minNextBid) {
      toast({ title: "Invalid bid", description: `Minimum bid is $${minNextBid.toLocaleString()}`, variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to place bid. Try again.", variant: "destructive" });
    }
  };

  // ... (rest of your code stays the same - login, logout, handleUpdateMaxBid, etc.)

  const hasBid = currentUser ? bids.some(b => b.email?.toLowerCase() === currentUser.email.toLowerCase()) : false;

  // Keep your existing handleLogin, handleLogout, handleUpdateMaxBid functions
  // (They mostly work locally for now)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground font-sans ...">
      {/* Your entire JSX stays exactly the same from here down */}
      {/* ... (no changes needed in the return statement) */}
    </div>
  );
};

export default Index;
