import Link from "next/link";
import { Film } from "lucide-react";

export function Navbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 border-b border-white/10 bg-transparent backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <Film className="h-6 w-6" />
            <span className="text-xl font-bold">YKlipp</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              href="/moments" 
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Videos
            </Link>
            <Link 
              href="/saved" 
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Saved
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

