# Asset 360 Investigation Workspace

## Source organization

Application code is colocated by feature. The `src/asset360/` folder intentionally keeps its views, ViewModels, context, and tests together instead of adding one-file component folders or public barrel files. React component filenames use PascalCase (`TimeSeriesPanel.tsx`); hooks and context modules use camelCase with their conventional `use` prefix where applicable. New work should follow this convention unless the feature becomes large enough to justify its own subfolder.
