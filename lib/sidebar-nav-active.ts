interface NavItemLike {
  href: string;
}

interface SidebarNavActiveInput {
  href: string;
  pathname: string;
  reportsViewSelected: boolean;
  siblingItems: readonly NavItemLike[];
}

function pathnameFromHref(href: string): string {
  return href.split(/[?#]/, 1)[0];
}

export function isSidebarNavItemActive({
  href,
  pathname,
  reportsViewSelected,
  siblingItems,
}: SidebarNavActiveInput): boolean {
  const itemPathname = pathnameFromHref(href);
  const reportsPathname = `${pathname}/reports`;
  const hasReportsSibling = reportsViewSelected
    && siblingItems.some((item) => pathnameFromHref(item.href) === reportsPathname);

  if (hasReportsSibling) {
    return itemPathname === reportsPathname;
  }

  return itemPathname === pathname;
}
