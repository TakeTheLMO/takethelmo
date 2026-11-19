import { randomUUID } from "node:crypto";
import type { Sql } from "../local-auth/sql";
import { AccountDataStore, DataError } from "../user-management/database";
import { defaultDocument, managedMenus, postTypes, type MenuDocument, type SharedFile, type SharedPost } from "./model";
export class PortalContentStore {
  constructor(readonly db: Sql) {}
  async admin(actor: string) { await new AccountDataStore(this.db).admin(actor); }
  async document(path: string, db: Sql = this.db): Promise<MenuDocument> {
    const fallback = defaultDocument(path), row = await db.get("SELECT document,revision,updated_at FROM portal_content WHERE path=?", path);
    return row ? { ...JSON.parse(String(row.document)), path, revision: Number(row.revision), updatedAt: String(row.updated_at) } : fallback;
  }
  async published(path: string) {
    const doc = await this.document(path);
    return { ...doc, posts: doc.posts.filter(post => post.status === "published") };
  }
  async search() {
    // 메뉴마다 한 번씩 조회하지 않고 저장된 문서를 한 번에 읽는다.
    const rows = new Map((await this.db.all("SELECT path,document,revision,updated_at FROM portal_content")).map(row => [String(row.path), row]));
    return managedMenus.flatMap(menu => {
      const row = rows.get(menu.href), doc: MenuDocument = row ? { ...JSON.parse(String(row.document)), path: menu.href, revision: Number(row.revision), updatedAt: String(row.updated_at) } : defaultDocument(menu.href);
      return doc.posts.filter(post => post.status === "published").map(post => ({ ...post, path: menu.href, menu: menu.label }));
    });
  }
  async detail(actor: string, path: string) {
    await this.admin(actor);
    return { ...await this.document(path), history: await this.db.all(`SELECT h.id,h.at,u.name AS actor,h.reason,h.before_value AS "beforeValue",h.after_value AS "afterValue" FROM portal_content_history h JOIN local_users u ON h.actor_id=u.id WHERE path=? ORDER BY h.at DESC LIMIT 50`, path) };
  }
  async save(actor: string, input: MenuDocument & { reason: string }) {
    await this.admin(actor);
    defaultDocument(input.path);
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    const text = (value: unknown, limit: number, required = false): value is string => typeof value === "string" && value.length <= limit && (!required || !!value.trim());
    if (!reason || reason.length > 2000 || !input.page || !text(input.page.title, 160, true) || !text(input.page.description, 1000) || !text(input.page.body, 20000) || !Array.isArray(input.posts) || input.posts.length > 100) throw new DataError("페이지 내용과 변경 사유를 확인해 주세요.");
    const ids = new Set<string>();
    const stored = new Map((await this.db.all("SELECT id,name,size FROM portal_files")).map(file => [String(file.id), file]));
    const posts: SharedPost[] = input.posts.map(post => {
      if (!post || !/^[\w-]{1,100}$/.test(post.id) || ids.has(post.id) || !text(post.title, 200, true) || !text(post.body, 20000) || !(postTypes as readonly string[]).includes(post.type) || !["draft", "published", "archived"].includes(post.status) || !text(post.sourceUrl, 2000) || !Array.isArray(post.files) || post.files.length > 10) throw new DataError("게시물 내용을 확인해 주세요.");
      ids.add(post.id);
      if (post.sourceUrl) { try { if (!["http:", "https:"].includes(new URL(post.sourceUrl).protocol)) throw new Error(); } catch { throw new DataError("참고 링크는 http 또는 https 주소를 입력해 주세요."); } }
      const files = [...new Set(post.files.map(file => file.id))].map(id => {
        const file = stored.get(id);
        if (!file) throw new DataError("첨부 원본을 찾을 수 없습니다.");
        return { id: String(file.id), name: String(file.name), size: Number(file.size) };
      });
      return { id: post.id, title: post.title.trim(), body: post.body, type: post.type, status: post.status, sourceUrl: post.sourceUrl, files };
    });
    await this.db.tx(`portal:${input.path}`, async db => {
      const old = await this.document(input.path, db);
      if (old.revision !== input.revision) throw new DataError("다른 변경이 먼저 저장되었습니다. 작성 내용을 복사한 뒤 최신 내용을 다시 불러오세요.", 409);
      if (old.posts.some(post => !ids.has(post.id))) throw new DataError("기존 게시물은 삭제할 수 없습니다. 보관으로 변경해 주세요.");
      const document = { page: { title: input.page.title.trim(), description: input.page.description, body: input.page.body }, posts }, at = new Date().toISOString();
      await db.run("INSERT INTO portal_content(path,document,revision,updated_at) VALUES (?,?,?,?) ON CONFLICT(path) DO UPDATE SET document=excluded.document,revision=excluded.revision,updated_at=excluded.updated_at", input.path, JSON.stringify(document), old.revision + 1, at);
      await db.run("INSERT INTO portal_content_history(id,path,actor_id,at,reason,before_value,after_value) VALUES (?,?,?,?,?,?,?)", randomUUID(), input.path, actor, at, reason, JSON.stringify({ page: old.page, posts: old.posts }), JSON.stringify(document));
    });
    return this.detail(actor, input.path);
  }
  async putFile(actor: string, name: string, type: string, body: Uint8Array): Promise<SharedFile> {
    await this.admin(actor);
    if (!name || name.length > 255 || !["application/pdf", "image/png", "image/jpeg"].includes(type) || !body.length || body.length > 5 * 1024 * 1024) throw new DataError("첨부는 5MB 이하 PDF, PNG, JPG를 사용해 주세요.");
    const id = randomUUID(); await this.db.run("INSERT INTO portal_files(id,name,type,body,size,actor_id) VALUES (?,?,?,?,?,?)", id, name, type, body, body.length, actor);
    return { id, name, size: body.length };
  }
  async file(actor: string, id: string) {
    const profile = await this.db.get("SELECT username FROM local_users WHERE id=? AND active=1", actor);
    if (!profile) throw new DataError("로그인이 필요합니다.", 401);
    if (profile.username !== "admin" && !(await this.search()).some(post => post.files.some(file => file.id === id))) throw new DataError("게시된 자료의 첨부만 조회할 수 있습니다.", 403);
    const file = await this.db.get("SELECT name,type,size,body FROM portal_files WHERE id=?", id);
    if (!file) throw new DataError("첨부 원본을 찾을 수 없습니다.", 404);
    return file;
  }
}
