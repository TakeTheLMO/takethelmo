import type { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { validateRole } from "../local-auth/profile";
import { validState } from "../demo/validation";
import { contentRecords, editRecord, type Category } from "./records";
import type { DemoState } from "../demo/model";
import { prepareWorkspaceState } from "../workspace/state";
import { canonicalLedger, canonicalOwnerRequests, protectOwnerWorkflow, validateChangedFiles, validateRecordIds } from "./integrity";
import { newDailyActions, normalizeDaily } from "../inspections/daily";
export class DataError extends Error { constructor(message: string, public status = 400) { super(message); } }
export class AccountDataStore {
  constructor(readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS account_data(user_id TEXT PRIMARY KEY REFERENCES local_users(id),state TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS account_files(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES local_users(id),name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,body BLOB NOT NULL,PRIMARY KEY(user_id,id));
      CREATE TABLE IF NOT EXISTS account_activity(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES local_users(id),actor_id TEXT NOT NULL REFERENCES local_users(id),kind TEXT NOT NULL,title TEXT NOT NULL,at TEXT NOT NULL,read_at TEXT,before_value TEXT,after_value TEXT,reason TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS account_notes(user_id TEXT PRIMARY KEY REFERENCES local_users(id),note TEXT NOT NULL DEFAULT '');`);
  }
  admin(actor: string) {
    if (!this.db.prepare("SELECT id FROM local_users WHERE id=? AND username='admin' AND active=1").get(actor)) throw new DataError("관리자만 이용할 수 있습니다.", 403);
  }
  snapshot(user: string) {
    const row = this.db.prepare("SELECT state,revision,updated_at FROM account_data WHERE user_id=?").get(user);
    return row ? { state: JSON.parse(String(row.state)) as DemoState, revision: Number(row.revision), updatedAt: String(row.updated_at) } : { state: null, revision: 0, updatedAt: null };
  }
  event(user: string, actor: string, kind: string, title: string, before: unknown = null, after: unknown = null, reason = "") {
    this.db.prepare("INSERT INTO account_activity(id,user_id,actor_id,kind,title,at,before_value,after_value,reason) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(randomUUID(), user, actor, kind, title, new Date().toISOString(), JSON.stringify(before), JSON.stringify(after), reason);
  }
  save(user: string, state: unknown, revision: number, actor = user, reason = "") {
    if (actor !== user) this.admin(actor);
    if (!validState(state)) throw new DataError("저장 데이터 형식을 확인해 주세요.");
    const owner = this.db.prepare("SELECT role,username,name,email FROM local_users WHERE id=? AND (active=1 OR ?<>id)").get(user, actor);
    if (!owner) throw new DataError("사용자를 찾을 수 없습니다.", 404);
    const safeState = prepareWorkspaceState({ role: validateRole(String(owner.role)), email: String(owner.email) }, state);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.snapshot(user);
      if (previous.revision !== revision) throw new DataError("다른 변경이 먼저 저장되었습니다. 최신 자료를 다시 확인해 주세요.", 409);
      validateRecordIds(safeState);
      const actorName = actor === user ? String(owner.name) : String(this.db.prepare("SELECT name FROM local_users WHERE id=?").get(actor)!.name);
      if (actor === user) {
        for (const key of ["requests", "enrollments", "actions", "inspections", "incidents"] as const) Object.assign(safeState, { [key]: safeState[key].map(row => ({ ...row, owner: safeState.role })) });
        try {
          safeState.requests = canonicalOwnerRequests(safeState, previous.state);
          protectOwnerWorkflow(safeState, previous.state);
        } catch (error) { throw new DataError((error as Error).message, 403); }
        for (const key of ["requests", "actions", "incidents"] as const) Object.assign(safeState, { [key]: safeState[key].map(row => {
          const old = previous.state?.[key].find(item => item.id === row.id);
          if (old && JSON.stringify(row.history.slice(0, old.history.length)) !== JSON.stringify(old.history)) throw new DataError("기존 처리 이력은 변경할 수 없습니다.", 403);
          return { ...row, history: row.history.map((entry, index) => {
            if (index < (old?.history.length || 0)) return entry;
            const allowed = key === "requests" && old?.status === "보완 요청" ? ["보완 후 재제출"] : key === "requests" && old?.status === "추가 정보 요청" ? ["추가 정보 제출"] : [String(row.status)];
            if (!allowed.includes(entry.event)) throw new DataError("처리 이력을 확인해 주세요.", 403);
            return { ...entry, actor: String(owner.name), at: new Date().toISOString() };
          }) };
        }) });
        for (const row of safeState.requests) {
          const old = previous.state?.requests.find(item => item.id === row.id);
          if (!old && !["제출", "접수"].includes(row.status)) throw new DataError("신청·문의의 검토 결과는 관리자가 처리합니다.", 403);
          if (old) {
            const resubmit = (old.status === "보완 요청" && row.status === "제출") || (old.status === "추가 정보 요청" && row.status === "접수");
            if (resubmit && JSON.stringify(row.history.slice(0, old.history.length)) !== JSON.stringify(old.history)) throw new DataError("기존 처리 이력은 변경할 수 없습니다.", 403);
            if (!resubmit && JSON.stringify({ ...old, owner: safeState.role }) !== JSON.stringify({ ...row, owner: safeState.role })) throw new DataError("검토 중인 신청은 직접 변경할 수 없습니다. 보완 요청 후 재제출해 주세요.", 403);
          }
        }
        const actualBefore = previous.state ? contentRecords(previous.state) : [];
        const actualAfter = contentRecords(safeState);
        for (const old of actualBefore) {
          if (old.category === "assessment") continue;
          const kept = actualAfter.some(row => row.category === old.category && (old.category === "enrollments" ? row.data.courseId === old.data.courseId && row.data.at === old.data.at : row.key === old.key));
          if (!kept) throw new DataError("등록된 업무 기록은 삭제할 수 없습니다. 담당 관리자에게 확인해 주세요.", 403);
        }
        for (const [key, roles] of [["ledger", ["lmo_manager", "safety_admin", "super_admin"]], ["members", ["lab_manager", "safety_admin", "super_admin"]]] as const) {
          const before = actualBefore.filter(row => row.category === key).map(row => row.data);
          const after = contentRecords(safeState).filter(row => row.category === key).map(row => row.data);
          if (JSON.stringify(before) !== JSON.stringify(after) && !(roles as readonly string[]).includes(String(owner.role))) throw new DataError("현재 역할로 해당 관리 기록을 변경할 수 없습니다.", 403);
        }
        for (const row of safeState.actions) {
          const old = previous.state?.actions.find(item => item.id === row.id);
          if ((!old && row.status !== "조치 중") || (old && old.status !== row.status && !(old.status === "조치 중" && row.status === "검토 대기" && row.file))) throw new DataError("개선조치의 검토 결과는 관리자가 처리합니다.", 403);
        }
        for (const row of safeState.incidents) {
          const old = previous.state?.incidents.find(item => item.id === row.id);
          if ((!old && row.status !== "접수") || (old && old.status !== row.status)) throw new DataError("사고 처리 상태는 관리자가 변경합니다.", 403);
        }
      }
      try {
        validateChangedFiles(this.db, user, safeState, previous.state);
        safeState.ledger = safeState.ledger.map(row => canonicalLedger(row, previous.state?.ledger.find(old => old.id === row.id), actorName));
        safeState.inspections = safeState.inspections.map(row => normalizeDaily(row, previous.state?.inspections.find(old => old.id === row.id), { id: actor, name: actor !== user ? `${actorName} (admin 계정)` : actorName, reviewing: actor !== user }, reason));
        const generated = newDailyActions(safeState.inspections, previous.state?.inspections || [], safeState.actions, actorName);
        safeState.actions = [...generated, ...safeState.actions];
      } catch (error) { throw new DataError((error as Error).message, 403); }
      const now = new Date().toISOString();
      this.db.prepare(`INSERT INTO account_data VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,revision=excluded.revision,updated_at=excluded.updated_at`)
        .run(user, JSON.stringify(safeState), revision + 1, now);
      const before = previous.state ? contentRecords(previous.state) : [];
      const after = contentRecords(safeState);
      for (const record of after) {
        const old = before.find(row => row.category === record.category && row.key === record.key);
        if (JSON.stringify(old?.data) !== JSON.stringify(record.data)) this.event(user, actor, old ? "자료 수정" : "자료 등록", record.title, old?.data, record.data, reason);
      }
      for (const old of before) if (!after.some(row => row.category === old.category && row.key === old.key)) this.event(user, actor, "자료 초기화", old.title, old.data, null, reason);
      this.db.exec("COMMIT");
      return { revision: revision + 1, updatedAt: now, state: safeState };
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  users(actor: string, query = "") {
    this.admin(actor);
    return this.db.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,d.updated_at AS updatedAt FROM local_users u
      LEFT JOIN account_data d ON d.user_id=u.id WHERE coalesce(u.username,'')<>'admin' ORDER BY u.name`).all()
      .filter(row => `${row.name} ${row.email} ${row.role}`.toLowerCase().includes(query.toLowerCase())).map(row => ({ ...row,
        count: this.snapshot(String(row.id)).state ? contentRecords(this.snapshot(String(row.id)).state!).length : 0,
      }));
  }
  detail(actor: string, user: string) {
    this.admin(actor);
    const profile = this.db.prepare("SELECT id,name,email,role,active FROM local_users WHERE id=? AND coalesce(username,'')<>'admin'").get(user);
    if (!profile) throw new DataError("사용자를 찾을 수 없습니다.", 404);
    const snapshot = this.snapshot(user);
    return { user: profile, lab: snapshot.state?.lab || null, revision: snapshot.revision, records: snapshot.state ? contentRecords(snapshot.state) : [],
      note: this.db.prepare("SELECT note FROM account_notes WHERE user_id=?").get(user)?.note || "",
      files: this.db.prepare("SELECT id,name,type,size FROM account_files WHERE user_id=?").all(user),
      history: this.db.prepare(`SELECT a.id,a.kind,a.title,a.at,a.reason,a.before_value AS beforeValue,a.after_value AS afterValue,u.name AS actor FROM account_activity a JOIN local_users u ON a.actor_id=u.id WHERE a.user_id=? ORDER BY a.at DESC LIMIT 100`).all(user),
    };
  }
  allRecords(actor: string) {
    this.admin(actor);
    return this.db.prepare(`SELECT u.id,u.name,u.email,d.state,d.updated_at FROM local_users u JOIN account_data d ON d.user_id=u.id WHERE coalesce(u.username,'')<>'admin' ORDER BY d.updated_at DESC`).all()
      .flatMap(row => contentRecords(JSON.parse(String(row.state))).map(record => ({ ...record, userId: String(row.id), userName: String(row.name), email: String(row.email), updatedAt: String(row.updated_at) })));
  }
  allFiles(actor: string) {
    this.admin(actor);
    const records = this.allRecords(actor);
    return this.db.prepare(`SELECT f.id,f.name,f.type,f.size,f.user_id AS userId,u.name AS userName,u.email FROM account_files f JOIN local_users u ON u.id=f.user_id WHERE coalesce(u.username,'')<>'admin' ORDER BY u.name,f.name`).all().map(file => ({ ...file,
      records: records.filter(record => record.userId === file.userId && (record.data.file as { id?: string } | undefined)?.id === file.id).map(({ category, key, title }) => ({ category, key, title })),
    }));
  }
  updateUser(actor: string, user: string, input: Record<string, unknown>) {
    this.admin(actor);
    const old = this.detail(actor, user).user;
    const name = String(input.name || "").trim(), email = String(input.email || "").trim().toLowerCase();
    const role = validateRole(String(input.role || "")), reason = String(input.reason || "").trim(), note = String(input.note || "").trim();
    if (role === "super_admin" && old.role !== "super_admin") throw new DataError("시스템 관리자 역할을 일반 계정에 부여할 수 없습니다.", 403);
    if (name.length < 2 || name.length > 40 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || !reason || reason.length > 2000 || note.length > 10000 || typeof input.active !== "boolean") throw new DataError("계정 정보와 수정 사유를 확인해 주세요.");
    // Account changes use a fingerprint to prevent overwriting another administrator edit.
    if (JSON.stringify(old) !== JSON.stringify(input.original)) throw new DataError("계정 정보가 변경되었습니다. 새로 조회해 주세요.", 409);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE local_users SET name=?,email=?,role=?,active=? WHERE id=?").run(name, email, role, input.active ? 1 : 0, user);
      this.db.prepare("INSERT INTO account_notes VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET note=excluded.note").run(user, note);
      if (!input.active) this.db.prepare("DELETE FROM local_sessions WHERE user_id=?").run(user);
      const hash = (value: string) => createHash("sha256").update(value).digest("hex");
      this.event(user, actor, "계정 수정", name, { name: old.name, role: old.role, active: old.active, emailHash: hash(String(old.email)) }, { name, role, active: input.active, emailHash: hash(email) }, reason);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); if (String(error).includes("UNIQUE")) throw new DataError("이미 사용 중인 이메일입니다.", 409); throw error; }
  }
  updateRecord(actor: string, user: string, input: Record<string, unknown>) {
    this.admin(actor);
    this.detail(actor, user);
    const current = this.snapshot(user), reason = String(input.reason || "").trim();
    if (!current.state || !reason || reason.length > 2000 || !input.fields || typeof input.fields !== "object") throw new DataError("자료와 수정 사유를 확인해 주세요.");
    const original = contentRecords(current.state).find(row => row.category === input.category && row.key === String(input.key));
    if (current.revision !== Number(input.revision) && (!input.original || !original || !isDeepStrictEqual(input.original, original.data))) throw new DataError("다른 변경이 먼저 저장되었습니다. 최신 자료를 다시 확인해 주세요.", 409);
    const name = String(this.db.prepare("SELECT name FROM local_users WHERE id=?").get(actor)!.name);
    const next = editRecord(current.state, String(input.category) as Category, String(input.key), input.fields as Record<string, unknown>, name, reason);
    const record = contentRecords(next).find(row => row.category === input.category && row.key === String(input.key));
    const hrefs: Partial<Record<Category, string>> = { requests: "/mypage/requests", actions: "/safety/corrective-actions", incidents: "/safety/incidents", inspections: "/safety/inspections", ledger: "/lmo/ledger", enrollments: "/training/records", courses: "/training/courses", lab: "/labs", members: "/labs/members", assessment: "/lmo/assessment" };
    if (record) next.notifications = [{ id: randomUUID(), title: `관리자 처리 · ${record.title}`, detail: `${String(record.data.status || "자료 확인·정정")} · ${reason}`, href: hrefs[record.category] || "/mypage", target: "all", at: new Date().toISOString() }, ...next.notifications];
    return this.save(user, next, current.revision, actor, reason);
  }
  activity(actor: string) {
    this.admin(actor);
    return { unread: Number(this.db.prepare("SELECT count(*) AS count FROM account_activity WHERE actor_id<>? AND read_at IS NULL").get(actor)!.count),
      events: this.db.prepare(`SELECT a.id,a.user_id AS userId,a.kind,a.title,a.at,a.read_at AS readAt,u.name,u.email FROM account_activity a JOIN local_users u ON a.user_id=u.id WHERE a.actor_id<>? ORDER BY a.at DESC LIMIT 100`).all(actor),
    };
  }
  readActivity(actor: string, ids: string[]) {
    this.admin(actor);
    for (const id of ids.slice(0, 100)) this.db.prepare("UPDATE account_activity SET read_at=? WHERE id=?").run(new Date().toISOString(), id);
  }
  putFile(user: string, id: string, name: string, type: string, body: Uint8Array) {
    if (!/^[\w-]{1,100}$/.test(id) || !name || name.length > 255 || !["application/pdf", "image/png", "image/jpeg"].includes(type) || !body.length || body.length > 5 * 1024 * 1024) throw new DataError("첨부파일은 5MB 이하 PDF, PNG, JPG만 가능합니다.");
    const existing = this.db.prepare("SELECT body FROM account_files WHERE user_id=? AND id=?").get(user, id);
    if (existing) {
      if (!Buffer.from(existing.body as Uint8Array).equals(Buffer.from(body))) throw new DataError("다른 첨부 원본을 덮어쓸 수 없습니다.", 409);
      return;
    }
    this.db.prepare("INSERT INTO account_files VALUES (?,?,?,?,?,?)").run(id, user, name, type, body.length, body);
    this.event(user, user, "첨부 등록", name);
  }
  file(actor: string, user: string, id: string) {
    if (actor !== user) this.admin(actor);
    const file = this.db.prepare("SELECT name,type,size,body FROM account_files WHERE user_id=? AND id=?").get(user, id);
    if (!file) throw new DataError("첨부 원본을 찾을 수 없습니다.", 404);
    return file;
  }
}
