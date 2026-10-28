"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const loggedIn = session.status === "authenticated";

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/engineering", label: "Engineering" },
  ];

  function linkClass(href: string) {
    return pathname === href ? "text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600";
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold" onClick={closeMenu}>
          Callisto
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <ul className="flex gap-6">
            {links.map(function (link) {
              return (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass(link.href)}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {loggedIn ? (
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
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-blue-600">
                Login
              </Link>
              <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                Sign up
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="p-1 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={function () {
            setOpen(!open);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          {links.map(function (link) {
            return (
              <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={closeMenu}>
                {link.label}
              </Link>
            );
          })}
          <div className="border-t border-gray-200 pt-3">
            {loggedIn ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{session.data?.user?.name}</span>
                <button
                  onClick={function () {
                    closeMenu();
                    signOut();
                  }}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-gray-600" onClick={closeMenu}>
                  Login
                </Link>
                <Link href="/signup" className="font-medium text-blue-600" onClick={closeMenu}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  );
}