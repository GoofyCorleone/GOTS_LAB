export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold mb-4">GOTS Lab</h3>
            <p className="text-sm text-primary-foreground/80">
              Sistema de gestión de inventario óptico y trazabilidad de experimentos.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4">Enlaces</h3>
            <ul className="text-sm space-y-2 text-primary-foreground/80">
              <li>
                <a href="/" className="hover:text-gold transition-colors">
                  Inicio
                </a>
              </li>
              <li>
                <a href="/inventory" className="hover:text-gold transition-colors">
                  Inventario
                </a>
              </li>
              <li>
                <a href="/profile" className="hover:text-gold transition-colors">
                  Perfil
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Institución</h3>
            <p className="text-sm text-primary-foreground/80">
              Universidad Industrial de Santander <br />
              Grupo de Óptica y Tratamiento de Señales (GOTS)
            </p>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/60">
          <p>&copy; 2026 GOTS Lab. Todos los derechos reservados.</p>
          <p className="mt-2">
            <a href="https://github.com/GoofyCorleone/GOTS_LAB" className="hover:text-gold transition-colors">
              Ver en GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
