export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "create" | "activity" | "me";
};

export const shellNav: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/create", label: "Create", icon: "create" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/me", label: "Me", icon: "me" },
];
