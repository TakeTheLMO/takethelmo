import { afterEach, describe, expect, it } from "vitest";
import { LocalAuthStore } from "../local-auth/database";
import { PortalContentStore } from "./database";
import { defaultDocument, managedMenus, belongsToMenu, type SharedPost } from "./model";
import { navigation } from "@/config/navigation";
let auth: LocalAuthStore;
afterEach(() => auth?.db.close());
function setup() {
  auth = new LocalAuthStore(":memory:"); auth.ensureAdmin();
  return { admin: auth.login("admin", "admin"), owner: auth.register("연구자", "reader@example.test", "password123", "safety_admin"), store: new PortalContentStore(auth.db) };
}
function post(status: SharedPost["status"] = "draft"): SharedPost { return { id: "one", title: "게시 검증 안내", type: "안내", body: "확인된 기관 안내 내용", status, sourceUrl: "https://example.test/reference", files: [] }; }
describe("portal menu content", () => {
  it("covers every non-admin menu without changing routes", () => {
    const { store } = setup();
    for (const group of navigation.filter(group => !group.adminOnly)) for (const item of group.items) expect(store.published(item.href).path).toBe(item.href);
    expect(new Set(managedMenus.map(menu => menu.href)).size).toBe(managedMenus.length);
    expect(() => store.published("/api/account-data")).toThrow();
    const certificate = { category: "enrollments" as const, key: "one", title: "교육 증빙", data: {}, example: false };
    expect(belongsToMenu("/library/training", certificate)).toBe(true);
    expect(belongsToMenu("/library/msds", certificate)).toBe(false);
  });
  it("publishes, corrects, archives, and records every content revision", () => {
    const { admin, store } = setup(), doc = defaultDocument("/library/forms");
    const first = store.save(admin.id, { ...doc, posts: [post()], reason: "초안 작성" });
    expect(store.published(doc.path).posts).toHaveLength(0);
    const published = store.save(admin.id, { ...first, posts: [post("published")], reason: "내용 확인 후 게시" });
    expect(store.search()[0].title).toBe("게시 검증 안내");
    const changed = store.save(admin.id, { ...published, page: { ...published.page, title: "기관 공통 서식" }, posts: [{ ...post("published"), body: "정정된 안내" }], reason: "담당자 확인" });
    expect(store.published(doc.path).page.title).toBe("기관 공통 서식");
    expect(store.published(doc.path).posts[0].body).toBe("정정된 안내");
    store.save(admin.id, { ...changed, posts: [post("archived")], reason: "개정으로 게시 중단" });
    expect(store.search()).toHaveLength(0);
    expect(store.detail(admin.id, doc.path).history).toHaveLength(4);
  });
  it("rejects non-admin changes, stale writes, invalid links and hard deletion", () => {
    const { admin, owner, store } = setup(), doc = defaultDocument("/community/notices");
    expect(() => store.detail(owner.id, doc.path)).toThrow("관리자");
    expect(() => store.save(owner.id, { ...doc, reason: "권한 위조" })).toThrow("관리자");
    expect(() => store.save(admin.id, { ...doc, posts: [{ ...post(), sourceUrl: "javascript:alert(1)" }], reason: "링크 확인" })).toThrow("http");
    const saved = store.save(admin.id, { ...doc, posts: [post()], reason: "저장" });
    expect(() => store.save(admin.id, { ...doc, reason: "오래된 내용" })).toThrow("다른 변경");
    expect(() => store.save(admin.id, { ...saved, posts: [], reason: "삭제 시도" })).toThrow("보관");
    expect(store.detail(admin.id, doc.path).revision).toBe(1);
  });
  it("serves shared files only when their content is published and keeps private files separate", () => {
    const { admin, owner, store } = setup(), doc = defaultDocument("/library/msds"), bytes = Buffer.from("shared test");
    expect(() => store.putFile(owner.id, "test.pdf", "application/pdf", bytes)).toThrow("관리자");
    const file = store.putFile(admin.id, "test.pdf", "application/pdf", bytes);
    const draft = store.save(admin.id, { ...doc, posts: [{ ...post(), files: [file] }], reason: "원본 확인" });
    expect(() => store.file(owner.id, file.id)).toThrow("게시된");
    const published = store.save(admin.id, { ...draft, posts: [{ ...post("published"), files: [file] }], reason: "게시" });
    expect(Buffer.from(store.file(owner.id, file.id).body as Uint8Array)).toEqual(bytes);
    store.save(admin.id, { ...published, posts: [{ ...post("archived"), files: [file] }], reason: "보관" });
    expect(() => store.file(owner.id, file.id)).toThrow("게시된");
    expect(store.file(admin.id, file.id).name).toBe("test.pdf");
  });
});
