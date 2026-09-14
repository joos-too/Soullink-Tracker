export type ActionCategory =
  | "navigation"
  | "settings"
  | "tracker"
  | "danger"
  | "lightMode"
  | "darkMode";

// Icon-only color, e.g. for icons inside labeled menu entries.
export const actionIconColorClasses: Record<ActionCategory, string> = {
  navigation: "text-blue-600 dark:text-blue-400",
  settings: "text-gray-600 dark:text-gray-300",
  tracker: "text-green-600 dark:text-green-400",
  danger: "text-red-600 dark:text-red-500",
  lightMode: "text-amber-500 dark:text-amber-400",
  darkMode: "text-indigo-600 dark:text-indigo-400",
};

// Round icon-only buttons in page headers.
export const actionIconButtonClasses: Record<ActionCategory, string> = {
  navigation:
    "p-2 rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30",
  settings:
    "p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700",
  tracker:
    "p-2 rounded-full text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30",
  danger:
    "p-2 rounded-full text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30",
  lightMode:
    "p-2 rounded-full text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30",
  darkMode:
    "p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
};

export const actionDividerVerticalClasses =
  "h-8 w-px bg-gray-300 dark:bg-gray-600";

export const actionDividerHorizontalClasses =
  "border-t border-gray-200 dark:border-gray-700";
