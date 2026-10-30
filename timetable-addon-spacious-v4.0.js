/* ShiftReader spacious patch retired in v4.1.
   Keep this tiny compatibility file only if index.html still loads the old filename.
   All timetable presentation now lives in timetable-addon.css. */
(() => {
  'use strict';
  document.getElementById('sr-spacious-ui-v4')?.remove();
})();
