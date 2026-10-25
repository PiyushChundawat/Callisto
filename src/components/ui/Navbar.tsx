"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
    const pathname = usePathname();
    const session = useSession();
    const links = [
        { href: "/", label: "Dashboard" },
        { href: "/watchlist", label: "Watchlist" },
        { href: "/portfolio", label: "Portfolio" },
    ];
  return (
    <nav className="fixed top-0 w-full z-50 bg-white border-b border-gray-200">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-lg">Helios</span>
        <div className="flex items-center gap-6">
          <ul className="flex gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? "text-blue-600 font-medium" : "text-gray-600"}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {session.status === "authenticated" ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{session.data?.user?.name}</span>
              <button
                onClick={function () {
                  signOut();
                }}
                className="text-gray-600 hover:text-blue-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-gray-600 hover:text-blue-600">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}