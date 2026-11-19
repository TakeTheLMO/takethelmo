import type { LocalUser } from "../local-auth/database";
import { createSeed } from "../demo/data";
import type { DemoState } from "../demo/model";
import { contentRecords } from "../user-management/records";
export function emptyWorkspace(role: DemoState["role"]): DemoState {
  return { version: 1, role, courses: [], enrollments: [], requests: [], actions: [], inspections: [], incidents: [], notifications: [],
    read: {}, bookmarks: [], guideSteps: [], ledger: [], members: [], chat: [], assessment: {} };
}
export function prepareWorkspaceState(user: Pick<LocalUser, "role" | "email">, state: DemoState): DemoState {
  if (user.email.startsWith("sample.") && user.email.endsWith("@example.test")) {
    const example = { ...state, role: user.role };
    for (const key of ["requests", "enrollments", "actions", "inspections", "incidents"] as const)
      Object.assign(example, { [key]: example[key].map(row => ({ ...row, owner: user.role })) });
    return example;
  }
  // Strip only untouched starter examples; retain user submissions, changed examples and attachments.
  const records = contentRecords(state);
  const next = { ...state, role: user.role };
  for (const key of ["requests", "enrollments", "actions", "inspections", "incidents", "ledger", "members"] as const)
    Object.assign(next, { [key]: records.filter(record => record.category === key).map(record => record.data) });
  for (const key of ["requests", "enrollments", "actions", "inspections", "incidents"] as const)
    Object.assign(next, { [key]: next[key].map(row => ({ ...row, owner: user.role })) });
  const initialCourseIds = new Set(createSeed().courses.map(course => course.id));
  next.courses = state.courses.filter(course => !initialCourseIds.has(course.id) || records.some(record => record.category === "courses" && record.key === course.id) || next.enrollments.some(record => record.courseId === course.id));
  next.notifications = state.notifications.filter(row => row.id !== "welcome");
  next.chat = state.chat.filter(row => row.id !== "intro");
  return next;
}
export function stampWorkspaceActors(previous: DemoState, next: DemoState, user: Pick<LocalUser, "name">) {
  const result = { ...next };
  for (const key of ["requests", "actions", "incidents"] as const) Object.assign(result, { [key]: next[key].map(row => {
    const old = previous[key].find(item => item.id === row.id);
    return { ...row, history: row.history.map((entry, index) => index < (old?.history.length || 0) ? entry : { ...entry, actor: user.name }) };
  }) });
  result.ledger = next.ledger.map(row => {
    const old = previous.ledger.find(item => item.id === row.id);
    return { ...row, actor: old?.actor || user.name, revisions: row.revisions?.map((entry, index) => index < (old?.revisions?.length || 0) ? entry : { ...entry, actor: user.name }) };
  });
  return result;
}
