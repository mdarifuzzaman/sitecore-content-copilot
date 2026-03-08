export type SitecoreField = {
  name: string;
  value: string;
};

export type SitecoreItem = {
  id: string;
  name: string;
  path: string;
  hasChildren?: boolean;
  fields?: SitecoreField[];
};

export type ItemByPathResponse = {
  item: SitecoreItem | null;
};

export type ItemChildrenResponse = {
  item: {
    id: string;
    name: string;
    path: string;
    hasChildren?: boolean;
    children?: {
      results: SitecoreItem[];
    };
  } | null;
};