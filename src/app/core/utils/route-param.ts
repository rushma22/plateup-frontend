import { ActivatedRoute } from '@angular/router';

/** Read a route param from this route or any parent (for nested tabs). */
export function routeParam(
  route: ActivatedRoute,
  name: string,
  fallback = ''
): string {
  let current: ActivatedRoute | null = route;
  while (current) {
    const value = current.snapshot.paramMap.get(name);
    if (value) {
      return value;
    }
    current = current.parent;
  }
  return fallback;
}
