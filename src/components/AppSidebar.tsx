import { Package, TrendingUp, Receipt, BarChart3, Calculator, LogOut, ShoppingCart, Store, Moon, Sun, Tag } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/', icon: BarChart3 },
  { title: 'Inventario', url: '/inventory', icon: Package },
  { title: 'Punto de Venta', url: '/pos', icon: ShoppingCart },
  { title: 'Transacciones', url: '/transactions', icon: Receipt },
  { title: 'Mi Tienda', url: '/store-config', icon: Store },
  { title: 'Categorías', url: '/categories', icon: Tag },
  { title: 'Calculadora', url: '/calculator', icon: Calculator },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-background/50 backdrop-blur-xl">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-20 flex items-center justify-center p-0">
            {!collapsed ? (
              <div className="flex items-center justify-center w-full px-4 mt-4">
                <img 
                  src="/images/lgsinfondo-conletras.png" 
                  alt="Vantory Logo" 
                  className="h-10 w-auto object-contain transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer" 
                  onClick={() => window.location.href = '/'}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full mt-4">
                <img 
                  src="/images/lgsinfondo-sinletras.png" 
                  alt="V" 
                  className="h-8 w-auto object-contain transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer" 
                  onClick={() => window.location.href = '/'}
                />
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="px-3 py-2.5 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-foreground hover:shadow-sm"
                      activeClassName="bg-primary/10 text-primary font-medium border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                    >
                      <item.icon className={`h-5 w-5 ${!collapsed ? 'mr-3' : 'mx-auto'}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5 p-4">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={toggleTheme} 
              className="px-3 py-2.5 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary w-full"
            >
              {theme === 'dark' ? (
                <Sun className={`h-5 w-5 ${!collapsed ? 'mr-3' : 'mx-auto'}`} />
              ) : (
                <Moon className={`h-5 w-5 ${!collapsed ? 'mr-3' : 'mx-auto'}`} />
              )}
              {!collapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={signOut} 
              className="px-3 py-2.5 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive w-full"
            >
              <LogOut className={`h-5 w-5 ${!collapsed ? 'mr-3' : 'mx-auto'}`} />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
