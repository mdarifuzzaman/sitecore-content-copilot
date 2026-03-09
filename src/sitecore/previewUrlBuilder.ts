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

export function buildPreviewUrl(options: BuildPreviewUrlOptions): string {
  const itemPath = options.itemPath.trim();
  const renderingHost = normalizeHost(options.renderingHost);
  const contentRoot = options.contentRoot.trim().replace(/\/+$/, '');

  if (!itemPath.startsWith(contentRoot)) {
    throw new Error(
      `Item path "${itemPath}" does not start with configured content root "${contentRoot}".`
    );
  }

  const relativePath = itemPath.slice(contentRoot.length);
  const segments = trimSlashes(relativePath)
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) {
    return renderingHost;
  }

  // Expected structure:
  // /sitecore/content/{site}/{home}/...
  //
  // Example:
  // /sitecore/content/siteA/home/about -> /about
  // /sitecore/content/siteA/home       -> /
  //
  // We remove:
  // 1. site name
  // 2. home item
  const [, ...routeSegmentsAfterSite] = segments;

  if (routeSegmentsAfterSite.length === 0) {
    return renderingHost;
  }

  const [, ...actualRouteSegments] = routeSegmentsAfterSite;

  const routePath =
  actualRouteSegments.length > 0
    ? `/${actualRouteSegments.map(slugify).join('/')}`
    : '/';

  return `${renderingHost}${routePath}`;
}