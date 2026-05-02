// Page size defaults shared between server queries and the page-level
// search-param parsers. Kept outside `"use server"` modules because those
// files can only export async functions.

export const STUDENTS_DEFAULT_PAGE_SIZE = 20;
export const NOTIFICATIONS_DEFAULT_PAGE_SIZE = 50;
export const ANNOUNCEMENTS_DEFAULT_PAGE_SIZE = 50;
