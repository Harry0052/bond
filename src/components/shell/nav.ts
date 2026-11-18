export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "create" | "activity" | "me";
};

export const shellNav: NavItem[] = [{ href: "/", label: "Home", icon: "home" }];
