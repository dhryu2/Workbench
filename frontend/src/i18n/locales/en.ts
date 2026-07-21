// English shell UI strings. Tool/category names and descriptions live in catalog.ts as per-language maps.
import type { ShellStrings } from './ko'

export const en: ShellStrings = {
  // Top bar
  search_global: 'Search tools…',
  lang_switch: 'Switch language',
  // Sidebar sections
  fav: 'Favorites',
  recent: 'Recent',
  collapse: 'Collapse sidebar',
  expand: 'Expand sidebar',
  // Launcher
  launcher_title: 'Toolbox',
  launcher_sub: 'Pick a tool and run it right away · {{count}} total',
  launcher_search: 'Search this list…',
  all: 'All',
  count: '{{count}}',
  // Command palette
  palette_ph: 'Search by tool name…',
  palette_nav: 'Navigate',
  palette_sel: 'Select',
  palette_close: 'Close',
  palette_empty: 'No matching tools',
  // Tool frame
  tool_placeholder_title: 'Tool content area',
  tool_placeholder_body: "This tool's screen will render here.",
  back: 'Launcher',
  // Favorite toggle
  fav_add: 'Add favorite',
  fav_remove: 'Remove favorite',
  // Empty states
  empty_title: 'No tools yet',
  empty_body: 'Tools will appear here, grouped by category, once added.',
  noresult_title: 'No results',
  noresult_body: 'Nothing matches “{{query}}”.',
  clear_search: 'Clear search',
}
