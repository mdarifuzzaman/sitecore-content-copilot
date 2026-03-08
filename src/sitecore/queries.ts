export const ITEM_BY_PATH_QUERY = `
query ItemByPath($path: String!, $language: String!) {
  item(path: $path, language: $language) {
    id
    name
    path
    fields {
      name
      value
    }
  }
}
`;

export const ITEM_CHILDREN_QUERY = `
query ItemChildren($path: String!, $language: String!) {
  item(path: $path, language: $language) {
    id
    name
    path
    hasChildren
    children {
      results {
        id
        name
        path
        hasChildren
      }
    }
  }
}
`;