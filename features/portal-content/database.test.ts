import { afterEach, describe, expect, it } from "vitest";
import { createSqlite } from "../local-auth/sqlite";
import { LocalAuthStore } from "../local-auth/database";
import { PortalContentStore } from "./database";
import { defaultDocument, managedMenus, belongsToMenu, type SharedPost } from "./model";
import { navigation } from "@/config/navigation";
let auth: LocalAuthStore;
afterEach(() => auth?.db.close());
async function setup() {
  auth = new LocalAuthStore(createSqlite(":memory:")); await auth.ensureAdmin();
  return { admin: await auth.login("admin", "admin"), owner: await auth.register("연구자", "reader@example.test", "password123", "safety_admin"), store: new PortalContentStore(auth.db) };
}
function post(status: SharedPost["status"] = "draft"): SharedPost { return { id: "one", title: "게시 검증 안내", type: "안내", body: "확인된 기관 안내 내용", status, sourceUrl: "https://example.test/reference", files: [] }; }
describe("portal menu content", () => {
  it("covers every non-admin menu without changing routes", async () => {
    const { store } = await setup();
    for (const group of navigation.filter(group => !group.adminOnly)) for (const item of group.items) expect((await store.published(item.href)).path).toBe(item.href);
    expect(new Set(managedMenus.map(menu => menu.href)).size).toBe(managedMenus.length);
    await expect(store.published("/api/account-data")).rejects.toThrow();
    const certificate = { category: "enrollments" as const, key: "one", title: "교육 증빙", data: {}, example: false };
    expect(belongsToMenu("/library/training", certificate)).toBe(true);
    expect(belongsToMenu("/library/msds", certificate)).toBe(false);
  });
  it("publishes, corrects, archives, and records every content revision", async () => {
    const { admin, store } = await setup(), doc = defaultDocument("/library/forms");
    const first = await store.save(admin.id, { ...doc, posts: [post()], reason: "초안 작성" });
    expect((await store.published(doc.path)).posts).toHaveLength(0);
    const published = await store.save(admin.id, { ...first, posts: [post("published")], reason: "내용 확인 후 게시" });
    expect((await store.search())[0].title).toBe("게시 검증 안내");
    const changed = await store.save(admin.id, { ...published, page: { ...published.page, title: "기관 공통 서식" }, posts: [{ ...post("published"), body: "정정된 안내" }], reason: "담당자 확인" });
    expect((await store.published(doc.path)).page.title).toBe("기관 공통 서식");
    expect((await store.published(doc.path)).posts[0].body).toBe("정정된 안내");
    await store.save(admin.id, { ...changed, posts: [post("archived")], reason: "개정으로 게시 중단" });
    expect(await store.search()).toHaveLength(0);
    expect((await store.detail(admin.id, doc.path)).history).toHaveLength(4);
  });
  it("rejects non-admin changes, stale writes, invalid links and hard deletion", async () => {
    const { admin, owner, store } = await setup(), doc = defaultDocument("/community/notices");
    await expect(store.detail(owner.id, doc.path)).rejects.toThrow("관리자");
    await expect(store.save(owner.id, { ...doc, reason: "권한 위조" })).rejects.toThrow("관리자");
    await expect(store.save(admin.id, { ...doc, posts: [{ ...post(), sourceUrl: "javascript:alert(1)" }], reason: "링크 확인" })).rejects.toThrow("http");
    const saved = await store.save(admin.id, { ...doc, posts: [post()], reason: "저장" });
    await expect(store.save(admin.id, { ...doc, reason: "오래된 내용" })).rejects.toThrow("다른 변경");
    await expect(store.save(admin.id, { ...saved, posts: [], reason: "삭제 시도" })).rejects.toThrow("보관");
    expect((await store.detail(admin.id, doc.path)).revision).toBe(1);
  });
  it("serves shared files only when their content is published and keeps private files separate", async () => {
    const { admin, owner, store } = await setup(), doc = defaultDocument("/library/msds"), bytes = Buffer.from("shared test");
    await expect(store.putFile(owner.id, "test.pdf", "application/pdf", bytes)).rejects.toThrow("관리자");
    const file = await store.putFile(admin.id, "test.pdf", "application/pdf", bytes);
    const draft = await store.save(admin.id, { ...doc, posts: [{ ...post(), files: [file] }], reason: "원본 확인" });
    await expect(store.file(owner.id, file.id)).rejects.toThrow("게시된");
    const published = await store.save(admin.id, { ...draft, posts: [{ ...post("published"), files: [file] }], reason: "게시" });
    expect(Buffer.from((await store.file(owner.id, file.id)).body as Uint8Array)).toEqual(bytes);
    await store.save(admin.id, { ...published, posts: [{ ...post("archived"), files: [file] }], reason: "보관" });
    await expect(store.file(owner.id, file.id)).rejects.toThrow("게시된");
    expect((await store.file(admin.id, file.id)).name).toBe("test.pdf");
  });
});
