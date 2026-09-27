import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, LogOut, LayoutDashboard, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "How It Works", to: "/", hash: "how-it-works" },
  { label: "Waste Categories", to: "/", hash: "categories" },
  { label: "Track Request", to: "/track" },
];

export function SiteHeader() {
  const { session, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = (
    <>
      {publicLinks.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          hash={link.hash}
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        >
          {link.label}
        </Link>
      ))}
      {session ? (
        <Link
          to="/dashboard"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        >
          Dashboard
        </Link>
      ) : null}
      {isAdmin ? (
        <Link
          to="/admin"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
        >
          Admin
        </Link>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg">
            ♻️
          </span>
          <span className="truncate font-display text-lg font-bold text-primary-deep">
            EcoCollect
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {nav}
          {session ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
                {profile?.name || profile?.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
          )}
          <Link to={session ? "/request-pickup" : "/auth"}>
            <Button size="sm">Request Pickup</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link to={session ? "/request-pickup" : "/auth"}>
            <Button size="sm">Request Pickup</Button>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-display text-primary-deep">♻️ EcoCollect</SheetTitle>
              <nav className="mt-6 flex flex-col gap-4">
                {nav}
                {session ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      <Settings className="h-4 w-4" /> Profile
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        void signOut();
                      }}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <LayoutDashboard className="h-4 w-4" /> Login
                    </Button>
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
