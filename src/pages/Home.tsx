import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Sparkles } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-outer-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-inner-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-12 px-4 max-w-6xl mx-auto">
        {/* Logo and tagline */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter">
            <span className="text-gradient-outer">God</span>
            <span className="text-foreground">with</span>
            <span className="text-gradient-inner">You</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            One mind for the world. One for yourself.
          </p>
        </div>

        {/* Split panel world selection */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Outer World Card */}
          <button
            onClick={() => navigate("/querynet")}
            className="group relative glass-panel rounded-2xl p-8 hover:scale-105 transition-portal overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-outer-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
            <div className="relative space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-outer-primary/20 flex items-center justify-center glow-outer">
                <Globe className="w-8 h-8 text-outer-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-outer-primary">QueryNet</h2>
              <p className="text-muted-foreground">
                Chat with any website or document. Let Astra guide you through the world's knowledge.
              </p>
              <div className="pt-4">
                <Button variant="outline" className="border-outer-primary/50 text-outer-primary hover:bg-outer-primary/10 transition-smooth">
                  Explore the World
                </Button>
              </div>
            </div>
          </button>

          {/* Inner World Card */}
          <button
            onClick={() => navigate("/lifesync")}
            className="group relative glass-panel rounded-2xl p-8 hover:scale-105 transition-portal overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-inner-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
            <div className="relative space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-inner-primary/20 flex items-center justify-center glow-inner">
                <Sparkles className="w-8 h-8 text-inner-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-inner-primary">LifeSync</h2>
              <p className="text-muted-foreground">
                Reflect on your inner world. Let Luma help you understand yourself.
              </p>
              <div className="pt-4">
                <Button variant="outline" className="border-inner-primary/50 text-inner-primary hover:bg-inner-primary/10 transition-smooth">
                  Reflect on Yourself
                </Button>
              </div>
            </div>
          </button>
        </div>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground">
          Ask the world. Understand yourself.
        </p>
      </div>
    </div>
  );
};

export default Home;
