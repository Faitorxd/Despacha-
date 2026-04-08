"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Error al ingresar", { description: "Credenciales inválidas." });
      setLoading(false);
    } else {
      toast.success("¡Bienvenido!");
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 absolute inset-0 z-50">
      
      {/* Visual background details */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
            <div className="h-16 w-16 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Package className="h-8 w-8 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Inicia Sesión</h1>
              <p className="text-sm text-slate-400">Panel administrativo privado</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  type="email"
                  className="pl-10 bg-slate-950 border-slate-800 focus-visible:ring-teal-500"
                  placeholder="admin@tuempresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  type="password"
                  className="pl-10 bg-slate-950 border-slate-800 focus-visible:ring-teal-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold mt-6 shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Entrar al Sistema"}
            </Button>
          </form>
        </div>
        <div className="px-8 py-4 bg-slate-950/50 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
               ¿No tienes cuenta? Solicitala al administrador.
            </p>
        </div>
      </div>
    </div>
  );
}
