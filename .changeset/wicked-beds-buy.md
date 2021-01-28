---
'@backstage/plugin-scaffolder-backend': minor
---

The scaffolder is updated to generate a unique workspace directory inside the temp folder which gets cleaned up afterwards.

prepare/template/publish steps is refactored to operate on known directories(`checkout/`, `template/`, `result/`) inside the generated temp directory.
Updates preparers to take the template url instead of the entire template. This is done primarly to allow for backwards compatability between v1 and v2 scaffolder templates.

Fix broken configuration GitHub actions in Create React App template.