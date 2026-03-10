type BuildPreviewUrlOptions = {
  itemPath: string;
  renderingHost: string;
  contentRoot: string;
};

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function normalizeHost(host: string): string {
  return host.replace(/\/+$/, '');
}

function slugify(segment: string): string {
  return encodeURIComponent(segment.replace(/\s+/g, '-'));
}

export function buildRoutePath(itemPath: string, contentRoot: string): string {
  const normalizedItemPath = itemPath.trim();
  const normalizedContentRoot = contentRoot.trim().replace(/\/+$/, '');

  if (!normalizedItemPath.startsWith(normalizedContentRoot)) {
    throw new Error(
      `Item path "${normalizedItemPath}" does not start with configured content root "${normalizedContentRoot}".`
    );
  }

  const relativePath = normalizedItemPath.slice(normalizedContentRoot.length);

  const segments = trimSlashes(relativePath)
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  // /sitecore/content/{site}/{home}/...
  const [, ...routeSegmentsAfterSite] = segments;

  if (routeSegmentsAfterSite.length === 0) {
    return '/';
  }

  const [, ...actualRouteSegments] = routeSegmentsAfterSite;

  return actualRouteSegments.length > 0
    ? `/${actualRouteSegments.map(slugify).join('/')}`
    : '/';
}

export function buildPreviewUrl(options: BuildPreviewUrlOptions): string {
  const renderingHost = normalizeHost(options.renderingHost);
  const routePath = buildRoutePath(options.itemPath, options.contentRoot);

  return routePath === '/'
    ? renderingHost
    : `${renderingHost}${routePath}`;
}