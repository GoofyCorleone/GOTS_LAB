"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, LogOut, Bug } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/accompany/NotificationBell";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();

  // The header used to be transparent with white text until you scrolled —
  // a pattern inherited from the institutional site, which has a dark hero
  // image behind it. This app has no dark hero: --background is pure white,
  // so white-on-white made the nav invisible on every page. The header is now
  // always readable; scroll/hover only add depth (shadow + stronger blur).
  const isActive = isScrolled || isHovered;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md ${
        isActive ? "bg-background/95 shadow-md" : "bg-background/80"
      }`}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <video
              src="/videos/logo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-16 sm:h-20 md:h-24 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                "text-foreground hover:text-gold"
              }`}
            >
              Inicio
            </Link>
            <Link
              href="/inventory"
              className={`text-sm font-medium transition-colors ${
                "text-foreground hover:text-gold"
              }`}
            >
              Inventario
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/experiments"
                  className={`text-sm font-medium transition-colors ${
                    "text-foreground hover:text-gold"
                  }`}
                >
                  Experimentos
                </Link>
                <Link
                  href="/accompany"
                  className={`text-sm font-medium transition-colors ${
                    "text-foreground hover:text-gold"
                  }`}
                >
                  Acompañar
                </Link>
                <Link
                  href="/profile"
                  className={`text-sm font-medium transition-colors ${
                    "text-foreground hover:text-gold"
                  }`}
                >
                  Mi Perfil
                </Link>
                <Link
                  href="/report"
                  title="Reportar un error o bug"
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    "text-foreground hover:text-gold"
                  }`}
                >
                  <Bug className="h-4 w-4" />
                  Reportar error
                </Link>
                <div className="flex items-center gap-3">
                  <NotificationBell />
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}

                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"

                  >
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 flex flex-col gap-2 bg-background/95 backdrop-blur-md rounded-lg p-4 -mx-4">
            <Link
              href="/"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/inventory"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Inventario
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/experiments"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Experimentos
                </Link>
                <Link
                  href="/accompany"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Acompañar
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Mi Perfil
                </Link>
                <Link
                  href="/report"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2 flex items-center gap-1.5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Bug className="h-4 w-4" />
                  Reportar error
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground hover:text-accent"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
