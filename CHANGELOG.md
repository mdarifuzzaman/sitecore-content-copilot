# Change Log

All notable changes to the **Sitecore Content Copilot** extension will be documented in this file.

This project follows semantic versioning.

---

## [0.1.0] - Initial Release

### Added

#### Sitecore Explorer
- Browse Sitecore content tree directly inside VS Code
- Expand content nodes from `/sitecore/content`
- Open item JSON in editor

#### GraphQL Explorer
- Run GraphQL queries against Sitecore endpoint
- Query editor and variables editor
- Result viewer
- Copy query and copy result
- Format variables
- Prettify GraphQL query
- Clear result
- Run query using **Ctrl/Cmd + Enter**

#### Query History
- Save queries to local history
- Load previous queries
- History persisted across sessions

#### GraphQL Integration with Content Explorer
- Right-click Sitecore item → **Open Item in GraphQL Explorer**
- Automatically generates starter query
- Prefills query variables with item path and language

#### Code Generators
- Generate **TypeScript interface** from Sitecore fields
- Generate **JSS field model**
- Generate **React / Next.js component** from Sitecore fields
- Generate **GraphQL query snippet**

#### Developer Productivity
- Copy GraphQL query from Sitecore item
- Inspect Sitecore item fields quickly

### Configuration

- Extension settings:
- sitecoreCopilot.endpoint
- sitecoreCopilot.apiKey
- sitecoreCopilot.language
- sitecoreCopilot.templatesRoot


### Known Limitations

- Template Explorer currently disabled due to GraphQL endpoint limitations
- Template access requires search queries instead of item queries

---

## Future Roadmap

Planned improvements:

- Template Explorer using search API
- GraphQL query formatter
- Run queries from `.graphql` files
- Generate components from templates
- GraphQL schema introspection
- Saved named queries
- AI-assisted content and component generation