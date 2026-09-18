import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import landingBg from "@/assets/bg-landing.jpg";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-slate-900">
      <img
        src={landingBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-brand/40 to-slate-900/80" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 h-24 max-w-7xl mx-auto w-full">
        <img src={logo} alt="MOHA" className="h-10 brightness-0 invert" />
        <Button
          onClick={() => navigate("/login")}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md rounded-full px-6 transition-all"
        >
          Sign In
        </Button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto w-full -mt-20">
        <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/90 text-sm font-medium tracking-wide backdrop-blur-md mb-6 uppercase">
          Enterprise File Sharing
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6 drop-shadow-lg">
          Secure, seamless collaboration for <span className="text-blue-400">MOHA Soft Drinks</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl font-light">
          Access your documents, collaborate with your team, and manage permissions across the organization with our secure file sharing portal.
        </p>
        <Button
          onClick={() => navigate("/login")}
          className="h-14 px-10 bg-white text-brand hover:bg-slate-100 font-semibold rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 text-lg"
        >
          Access Portal
        </Button>
      </main>
    </div>
  );
}