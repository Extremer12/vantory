import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Package2, TrendingUp, ShieldCheck } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email({ message: "Por favor ingresa un email válido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  businessName: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
      businessName: '',
    }
  });

  const onSubmit = async (data: AuthFormValues) => {
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: data.email, 
          password: data.password 
        });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { business_name: data.businessName || 'Mi Negocio' },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Cuenta creada. Revisa tu email para confirmar.');
        setIsLogin(true);
        reset();
      }
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side: Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package2 className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">StockLogic</span>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isLogin 
                  ? 'Ingresa tus credenciales para acceder a tu panel.' 
                  : 'Comienza a gestionar tu inventario como un profesional.'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del negocio</Label>
                  <Input
                    id="businessName"
                    {...register("businessName")}
                    placeholder="Ej. Mi Tienda"
                    className="h-11"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="nombre@ejemplo.com"
                  className="h-11"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  {isLogin && (
                    <a href="#" className="text-sm font-medium text-primary hover:underline" onClick={(e) => { e.preventDefault(); toast.info("Funcionalidad en desarrollo"); }}>
                      ¿Olvidaste tu contraseña?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                  className="h-11"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Iniciando...' : 'Creando...'}
                  </>
                ) : (
                  isLogin ? 'Iniciar sesión' : 'Crear cuenta'
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">
                  {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  reset();
                }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Visuals */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-950 overflow-hidden items-center justify-center p-12">
        {/* Abstract Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Control total <br/> sobre tu inventario.
            </h1>
            <p className="text-lg text-zinc-400">
              Gestiona productos, analiza métricas y optimiza tus ventas con la herramienta que usan los profesionales.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md transition-all hover:bg-white/10">
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Análisis en tiempo real</h3>
                <p className="text-zinc-400 text-sm">Toma decisiones basadas en datos actualizados.</p>
              </div>
            </div>
            
            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md transition-all hover:bg-white/10">
              <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Seguridad empresarial</h3>
                <p className="text-zinc-400 text-sm">Tus datos están protegidos en la nube.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-xs text-white/50 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 12}`} alt="User" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-zinc-400">
                Únete a más de <strong className="text-white">2,000+</strong> emprendedores
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
