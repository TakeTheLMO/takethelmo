/* eslint-disable @typescript-eslint/no-require-imports -- isolated CommonJS seed bootstrap */
// Explicit, repeatable local prototype seed. Existing accounts and edits are never overwritten.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, filename) => {
  if (!filename.startsWith(path.join(root, "features") + path.sep)) throw new Error("Unexpected source file");
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText, filename);
};
const { LocalAuthStore } = require("../features/local-auth/database.ts");
const { AccountDataStore } = require("../features/user-management/database.ts");
const { createSeed } = require("../features/demo/data.ts");
const { contentRecords } = require("../features/user-management/records.ts");
const assets = Object.fromEntries(["training", "inspection", "incident"].map(name => [name, fs.readFileSync(path.join(root, "public/demo-examples", `${name}.png`))]));
const profiles = [
  ["[예시] 김민지", "sample.researcher1@example.test", "researcher"],
  ["[예시] 이도현", "sample.researcher2@example.test", "researcher"],
  ["[예시] 박서연", "sample.lab@example.test", "lab_manager"],
  ["[예시] 최유진", "sample.lmo@example.test", "lmo_manager"],
  ["[예시] 정하늘", "sample.safety@example.test", "safety_admin"],
  ["[예시] 윤지훈", "sample.inactive@example.test", "researcher"],
];
const auth = new LocalAuthStore(path.resolve(process.env.LOCAL_AUTH_DB_PATH || path.join(root, "data/local-auth.sqlite")));
try {
  const store = new AccountDataStore(auth.db);
  const admin = auth.db.prepare("SELECT id FROM local_users WHERE username='admin' AND active=1").get();
  if (!admin) throw new Error("먼저 서버에서 관리자 계정을 초기화해 주세요.");
  const database = auth.db.prepare("PRAGMA database_list").all().find(row => row.name === "main").file;
  const backup = `${database}.before-examples-${Date.now()}.sqlite`;
  auth.db.prepare("VACUUM INTO ?").run(backup);
  const at = days => new Date(Date.now() - days * 86400000).toISOString();
  const log = (name, event, note, days = 0) => ({ at: at(days), actor: name, event, note: `[예시] ${note}` });
  const summary = [];
  for (const [index, [name, email, role]] of profiles.entries()) {
    const existing = auth.db.prepare("SELECT id,name FROM local_users WHERE email=?").get(email);
    if (existing && !String(existing.name).startsWith("[예시]")) throw new Error(`기존 계정과 예시 이메일 충돌: ${email}`);
    if (existing && store.snapshot(String(existing.id)).state) {
      summary.push({ name, email, skipped: true }); continue;
    }
    const user = existing || auth.register(name, email, "Demo1234!", role);
    const state = createSeed(); state.role = role;
    state.courses = state.courses.map(course => ({ ...course, title: `[예시] ${course.title}` }));
    for (const key of ["requests", "enrollments", "inspections", "actions", "incidents", "ledger", "members"]) state[key] = [];
    const id = suffix => `EXAMPLE-${index + 1}-${suffix}`;
    function attachment(kind, suffix, label) {
      const fileId = id(suffix), filename = `[예시] ${label}.png`, body = assets[kind];
      store.putFile(String(user.id), fileId, filename, "image/png", body);
      return { id: fileId, name: filename, size: body.length, type: "image/png" };
    }
    function request(title, status, days = 1, kind = "연구실 출입") {
      const history = [log(name, "제출", "사용자가 검토를 요청한 가상 신청입니다.", days)];
      if (status !== "제출") history.push(log("[예시] 관리자", status, status === "보완 요청" ? "첨부 목록과 예상 이용 기간을 보완해 주세요." : "화면 검토용 처리 이력입니다. 실제 승인·허가가 아닙니다."));
      state.requests.push({ id: id(`request-${state.requests.length + 1}`), title: `[예시] ${title}`, kind, body: "[예시] 관리자 목록·상세·정정 기능 확인을 위한 가상 신청입니다. 실제 업무 요청이나 법정 신고가 아닙니다.", owner: role, status, history });
    }
    function education(course) {
      state.enrollments.push({ courseId: course, owner: role, status: "등록 완료", at: at(1), completedAt: at(1).slice(0, 10), file: attachment("training", `certificate-${course}`, "안전교육 이수증 샘플") });
    }
    function inspection(note, failed = false) {
      state.inspections.push({ id: id("inspection"), at: at(1), owner: role, results: { route: failed ? "부적합" : "적합", contact: "적합", document: "적합", label: "적합", record: "적합" }, note: `[예시] ${note}` });
    }
    function action(title, status, withFile) {
      state.actions.push({ id: id("action"), title: `[예시] ${title}`, note: "[예시] 안내 표지 정비 사항을 확인하는 가상 개선조치입니다.", status, owner: role, due: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        ...(withFile ? { file: attachment("inspection", "action-proof", "개선조치 증빙 샘플") } : {}), history: [log(name, status, "담당자의 확인·검토 화면 예시")] });
    }
    function incident(title, status, withFile) {
      state.incidents.push({ id: id("incident"), title: `[예시] ${title}`, kind: "아차사고", place: "[예시] 연구동 2층 복도", body: "[예시] 빈 상자가 떨어진 상황을 가정한 가상 기록입니다. 인명·물적 피해가 없으며 실제 사고 접수가 아닙니다.", occurredAt: at(2).slice(0, 16), owner: role, status,
        ...(withFile ? { file: attachment("incident", "incident-proof", "아차사고 첨부 샘플") } : {}), history: [log(name, "접수", "사고 후속 조치 화면을 확인합니다.", 2), ...(status === "접수" ? [] : [log("[예시] 관리자", status, "담당자 확인 단계 예시")])] });
    }
    if (index === 0) { request("공동장비실 출입 검토", "제출"); request("기존 신청 처리 완료", "승인", 5); education("basic"); incident("빈 상자 낙하 아차사고", "접수", false); }
    if (index === 1) { request("신규 연구원 출입 서류 보완", "보완 요청", 3); education("bio"); action("보호구 안내 표지 정비", "검토 대기", true); }
    if (index === 2) { inspection("출입·대피 통로 안내 표시 보완이 필요합니다.", true); action("출입 통로 안내 보완", "조치 중", true); state.members.push({ id: id("member"), name: "[예시] 신규 참여 연구원", role: "일반 연구원", active: true }); }
    if (index === 3) { request("LMO 시설 담당자 변경 확인", "검토 중", 2, "LMO 시설 변경"); state.ledger.push({ id: id("ledger-1"), label: "[예시] 물질 A 입고 수량 확인", type: "입고", quantity: 4, unit: "vial", at: at(1), actor: name }, { id: id("ledger-2"), label: "[예시] 물질 B 보관 수량 확인", type: "보관", quantity: 8, unit: "tube", at: at(2), actor: name }); state.assessment = { organism: "모르겠어요", modified: "모르겠어요", facility: "예" }; }
    if (index === 4) { inspection("가상 점검 항목을 모두 확인했습니다."); action("실험실 안내판 정비", "종결", true); incident("운반 동선 확인 요청", "확인 중", true); }
    if (index === 5) { request("이용 종료에 따른 신청 반려", "반려", 4); education("new"); }
    store.save(String(user.id), state, 0, String(admin.id), "[예시] 시나리오 자료 구성");
    if (index === 1) store.updateRecord(String(admin.id), String(user.id), { category: "requests", key: id("request-1"), revision: 1, fields: { body: "[예시] 관리자 정정 시나리오: 이용 기간과 첨부 목록을 구체화했습니다. 실제 사용자 요청이 아닙니다." }, reason: "[예시] 내용 정정과 수정 전후 이력 확인" });
    store.updateUser(String(admin.id), String(user.id), { original: store.detail(String(admin.id), String(user.id)).user, name, email, role, active: index !== 5, note: `[예시] ${index === 5 ? "이용 종료 상태를 확인하는 비활성 계정입니다." : "검색·자료 열람·첨부 다운로드·정정 기능을 확인하는 가상 계정입니다."}`, reason: "[예시] 관리자 참조 메모와 계정 상태 시나리오" });
    summary.push({ name, email, role, active: index !== 5, records: contentRecords(state).length, files: store.detail(String(admin.id), String(user.id)).files.length });
  }
  console.log(JSON.stringify({ backup, users: summary, unread: store.activity(String(admin.id)).unread }, null, 2));
} finally { auth.db.close(); }
