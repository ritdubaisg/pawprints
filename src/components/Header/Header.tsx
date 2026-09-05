"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Menu,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  ShieldIcon,
} from "lucide-react";
import { NotificationBell } from "../Notifications/NotificationBell";
import { ModeToggle } from "@/components/mode-toggle";

import { useRouter } from "next/navigation";

import { useMediaQuery } from "@/hooks/use-media-query";

// Import logout action instead of going to the page
import { logoutAction } from "@/app/logout/logout";

interface HeaderProps {
  hasAdminAccess?: boolean;
  isSuperAdmin?: boolean;
}

const Header = ({ hasAdminAccess, isSuperAdmin }: HeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const showDashboard =
    hasAdminAccess ||
    (user &&
      ((user as any).isStaff ||
        (user as any).isSuperAdmin ||
        (user as any).customClaims?.staff ||
        (user as any).customClaims?.superAdmin));

  const handleNavigate = (href: string) => {
    setProfileMenuOpen(false);
    setMobileSheetOpen(false);
    router.push(href);
  };

  return (
    <header className="border-b h-16 bg-[#F76902]">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/pawprints-white.svg"
            alt="RIT Paw Logo"
            width={140}
            height={40}
            className="object-contain h-10 w-auto"
          />
        </Link>

        {!isMobile && (
          <div className="hidden md:flex items-center gap-4">
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                {showDashboard && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      asChild
                      className={cn(
                        navigationMenuTriggerStyle(),

                        "bg-transparent text-white hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white",
                      )}
                    >
                      <Link href="/review" className="flex items-center gap-2">
                        Dashboard
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}

                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),

                      "bg-transparent text-white hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white",
                    )}
                  >
                    <Link href="/explore">Browse</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),

                      "bg-transparent text-white hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white",
                    )}
                  >
                    <Link href="/create">Create</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),

                      "bg-transparent text-white hover:bg-white/20 hover:text-white focus:bg-white/20 focus:text-white data-[active]:bg-white/20 data-[state=open]:bg-white/20",
                    )}
                  >
                    <Link href="/about">About</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <ModeToggle />

            {user ? (
              <>
                <NotificationBell />

                <DropdownMenu
                  open={profileMenuOpen}
                  onOpenChange={setProfileMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-10 w-10 border-2 border-white/20 hover:border-white transition-colors">
                      <AvatarImage
                        src={user.photoURL || ""}
                        alt={user.displayName || "User"}
                      />

                      <AvatarFallback className="bg-orange-700 text-white">
                        {user.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-60 mr-5"
                    align="start"
                    sideOffset={10}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>

                      <DropdownMenuItem
                        onClick={() => handleNavigate("/profile")}
                      >
                        <UserIcon />
                        Profile
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleNavigate("/profile/settings")}
                      >
                        <SettingsIcon />
                        Settings
                      </DropdownMenuItem>
                      {isSuperAdmin && (
                        <DropdownMenuItem
                          onClick={() => handleNavigate("/admin")}
                        >
                          <ShieldIcon />
                          Admin
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() =>
                          handleNavigate(
                            "https://github.com/ritdubaisg/pawprints",
                          )
                        }
                      >
                        GitHub
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleNavigate("/support")}
                      >
                        Support
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => logoutAction()}
                      >
                        <LogOutIcon />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                asChild
                variant="secondary"
                className="bg-white text-[#F76902] hover:bg-gray-100"
              >
                <Link href="/login">Log In</Link>
              </Button>
            )}
          </div>
        )}

        {isMobile && (
          <div className="md:hidden flex items-center gap-4">
            <ModeToggle />
            {user && (
              <>
                <NotificationBell />
                <DropdownMenu
                  open={profileMenuOpen}
                  onOpenChange={setProfileMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 border-2 border-white/20 hover:border-white transition-colors">
                      <AvatarImage
                        src={user.photoURL || ""}
                        alt={user.displayName || "User"}
                      />
                      <AvatarFallback className="bg-orange-700 text-white">
                        {user.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40" align="start">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleNavigate("/profile")}
                      >
                        <UserIcon />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleNavigate("/profile/settings")}
                      >
                        <SettingsIcon />
                        Settings
                      </DropdownMenuItem>
                      {isSuperAdmin && (
                        <DropdownMenuItem
                          onClick={() => handleNavigate("/admin")}
                        >
                          <ShieldIcon />
                          Admin
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() =>
                          handleNavigate(
                            "https://github.com/ritdubaisg/pawprints",
                          )
                        }
                      >
                        GitHub
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleNavigate("/support")}
                      >
                        Support
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => logoutAction()}
                      >
                        <LogOutIcon />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="px-6 pt-6 text-left">
                  <SheetTitle className="text-2xl font-bold text-[#F76902]">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-6 mt-6">
                  {showDashboard && (
                    <button
                      type="button"
                      onClick={() => handleNavigate("/review")}
                      className="text-left text-lg font-medium hover:text-[#F76902] transition-colors flex items-center gap-2"
                    >
                      Dashboard
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleNavigate("/admin")}
                      className="text-left text-lg font-medium hover:text-[#F76902] transition-colors flex items-center gap-2"
                    >
                      <ShieldIcon className="h-4 w-4" />
                      Admin
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/explore")}
                    className="text-left text-lg font-medium hover:text-[#F76902] transition-colors"
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/create")}
                    className="text-left text-lg font-medium hover:text-[#F76902] transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/about")}
                    className="text-left text-lg font-medium hover:text-[#F76902] transition-colors"
                  >
                    About
                  </button>
                  {!user && (
                    <>
                      <Separator className="my-2" />
                      <Button
                        onClick={() => handleNavigate("/login")}
                        className="w-full bg-[#F76902] hover:bg-[#d55a02] text-white"
                      >
                        Log In
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
