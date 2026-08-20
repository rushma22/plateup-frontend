import { ActivatedRoute, Router } from '@angular/router';

/**
 * Read a route param from the active route tree.
 * Ionic tabs nest pages deeply, so a simple parent walk can miss :tableId.
 */
export function routeParam(
  route: ActivatedRoute,
  name: string,
  fallback = ''
): string {
  for (const current of route.pathFromRoot) {
    const value = current.snapshot.paramMap.get(name);
    if (value) {
      return value;
    }
  }

  const fromTree = findParamInTree(route.root, name);
  if (fromTree) {
    return fromTree;
  }

  const fromUrl = paramFromGuestUrl(name);
  if (fromUrl) {
    return fromUrl;
  }

  return fallback;
}

/** Fresh guest params from the current URL (use at navigate time). */
export function guestRouteParams(
  router: Router,
  route?: ActivatedRoute,
  fallbackSlug = ''
): { restaurantSlug: string; tableId: string } {
  const fromUrl = router.url.match(/\/o\/([^/]+)\/([^/]+)/);
  if (fromUrl?.[1] && fromUrl[2]) {
    return { restaurantSlug: fromUrl[1], tableId: fromUrl[2] };
  }

  if (route) {
    const restaurantSlug = routeParam(route, 'restaurantSlug', fallbackSlug);
    const tableId = routeParam(route, 'tableId');
    if (restaurantSlug && tableId) {
      return { restaurantSlug, tableId };
    }
  }

  const fromWindow = windowGuestParams();
  if (fromWindow) {
    return fromWindow;
  }

  return { restaurantSlug: fallbackSlug, tableId: '' };
}

function findParamInTree(route: ActivatedRoute, name: string): string | null {
  const queue: ActivatedRoute[] = [route];
  while (queue.length) {
    const node = queue.shift()!;
    const value = node.snapshot.paramMap.get(name);
    if (value) {
      return value;
    }
    queue.push(...node.children);
  }
  return null;
}

function paramFromGuestUrl(name: string): string | null {
  const params = windowGuestParams();
  if (!params) {
    return null;
  }
  if (name === 'restaurantSlug') {
    return params.restaurantSlug;
  }
  if (name === 'tableId') {
    return params.tableId;
  }
  return null;
}

function windowGuestParams(): { restaurantSlug: string; tableId: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const match = window.location.pathname.match(/^\/o\/([^/]+)\/([^/]+)/);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { restaurantSlug: match[1], tableId: match[2] };
}
