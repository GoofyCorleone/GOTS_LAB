"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/accompany/NotificationBell";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-md shadow-md" : "bg-transparent"
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
                isScrolled ? "text-foreground hover:text-gold" : "text-white hover:text-gold"
              }`}
            >
              Inicio
            </Link>
            <Link
              href="/inventory"
              className={`text-sm font-medium transition-colors ${
                isScrolled ? "text-foreground hover:text-gold" : "text-white hover:text-gold"
              }`}
            >
              Inventario
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/accompany"
                  className={`text-sm font-medium transition-colors ${
                    isScrolled ? "text-foreground hover:text-gold" : "text-white hover:text-gold"
                  }`}
                >
                  Acompañar
                </Link>
                <Link
                  href="/profile"
                  className={`text-sm font-medium transition-colors ${
                    isScrolled ? "text-foreground hover:text-gold" : "text-white hover:text-gold"
                  }`}
                >
                  Mi Perfil
                </Link>
                <div className="flex items-center gap-3">
                  <NotificationBell
                    className={isScrolled ? "" : "text-white hover:text-white hover:bg-white/10"}
                  />
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className={isScrolled ? "" : "text-white hover:text-white hover:bg-white/10"}
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
                    className={isScrolled ? "" : "text-white hover:text-white hover:bg-white/10"}
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
            className={`md:hidden ${isScrolled ? "" : "text-white hover:text-white hover:bg-white/10"}`}
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
