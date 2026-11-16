"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Empty,
  Field,
  inputClass,
  Panel,
  Timeline,
} from "@/components/ui/DemoUI";
import {
  canReview,
  history,
  profiles,
  timeLabel,
  transitionRequest,
  uid,
  INQUIRY_KIND,
  inquiryBody,
  isInquiry,
  requestComplete,
  requestNeedsOwner,
  requestNeedsReviewer,
  validateInquiry,
  type RequestItem,
  type RequestStatus,
} from "./model";
import { pushNotification, useDemo } from "./Store";
import { blankInquiry, InquiryFields, InquiryNotice } from "./InquiryForm";
import { latestDraftKind, assessmentText } from "./continuity";
import type { RequestDraft as Draft } from "./model";
const kindFromQuery = (kind?: string) =>
  kind === "ibc"
    ? INQUIRY_KIND
    : kind === "lmo"
      ? "LMO 시설 변경"
      : "연구실 출입";
export function Requests({ initialKind }: { initialKind?: string }) {
  const { state, update, notify } = useDemo();
  const restoredKind = latestDraftKind(state.requestDrafts, state.role);
  const [creating, setCreating] = useState(!!initialKind || !!restoredKind);
  const [filter, setFilter] = useState("전체");
  const [kind, setKind] = useState(
    initialKind ? kindFromQuery(initialKind) : restoredKind || "연구실 출입",
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    state.requestDrafts || {},
  );
  useEffect(() => {
    if (initialKind) {
      setKind(kindFromQuery(initialKind));
      setCreating(true);
    }
  }, [initialKind]);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => setDrafts(state.requestDrafts || {}), [state.requestDrafts]);
  const draftKey = `${state.role}:${kind}`;
  const draft = drafts[draftKey] || {
    updatedAt: "",
    title: "",
    body: "",
    inquiry: blankInquiry(),
  };
  const inquiry = kind === INQUIRY_KIND;
  function patchDraft(change: Partial<Draft>) {
    const next = { ...draft, ...change, updatedAt: new Date().toISOString() };
    setDrafts((all) => ({ ...all, [draftKey]: next }));
    setSaveFailed(
      !update((s) => ({
        ...s,
        requestDrafts: { ...s.requestDrafts, [draftKey]: next },
      })),
    );
  }
  const rows = state.requests
    .filter((r) => r.owner === state.role || canReview(state.role, r))
    .filter(
      (r) =>
        filter === "전체" ||
        (filter === "내 신청"
          ? r.owner === state.role
          : filter === "검토 대기"
            ? canReview(state.role, r) && requestNeedsReviewer(r)
            : requestComplete(r)),
    );
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">
              신청과 사전 문의의 진행 상황을 확인하세요
            </h2>
            <p className="mt-2 text-xs leading-6 text-gray-500">
              일반 신청은 내부 검토 흐름, IBC 사전 문의는 접수 → 답변 준비 →
              답변 확인 흐름을 체험합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setKind(INQUIRY_KIND);
                setCreating(true);
              }}
            >
              IBC 사전 문의 작성
            </Button>
            <Button
              onClick={() => setCreating(!creating)}
              aria-expanded={creating}
            >
              {creating ? "작성 닫기" : "+ 새 신청서"}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs leading-6 text-gray-500">
          데모 문의 수신함: LMO 담당자·기관 안전관리자·시스템 관리자 역할에서
          확인할 수 있습니다 (본인 작성 건 제외). 실제 기관 담당자 지정은 확인이
          필요합니다. 일반 신청의 승인 역시 가상 내부 처리입니다.
        </p>
      </Panel>
      {creating && (
        <Panel title={inquiry ? "새 IBC 사전 문의" : "새 검토 요청"}>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const title = draft.title.trim();
              try {
                if (inquiry) validateInquiry(draft.inquiry);
              } catch (error) {
                notify((error as Error).message, true);
                return;
              }
              const body = inquiry
                ? inquiryBody(draft.inquiry)
                : draft.body.trim();
              if (!title || !body) {
                notify("제목과 내용을 공백 없이 입력해 주세요.", true);
                return;
              }
              const item: RequestItem = {
                id: `REQ-${uid().slice(0, 8)}`,
                title,
                kind,
                body,
                owner: state.role,
                status: inquiry ? "접수" : "제출",
                history: [
                  history(
                    state.role,
                    inquiry ? "접수" : "제출",
                    inquiry
                      ? "사전 문의 제출 체험 · 실제 기관 전송 없음"
                      : "내부 검토를 요청합니다.",
                  ),
                ],
                ...(inquiry
                  ? {
                      inquiry: {
                        ...draft.inquiry,
                        filingInfo:
                          draft.inquiry.previousFiling === "있음"
                            ? draft.inquiry.filingInfo
                            : "",
                      },
                    }
                  : {}),
              };
              if (
                update(
                  (s) => {
                    const remaining = { ...s.requestDrafts };
                    delete remaining[draftKey];
                    return {
                      ...s,
                      requests: [item, ...s.requests],
                      requestDrafts: remaining,
                    };
                  },
                  inquiry
                    ? `사전 문의를 이 브라우저에 저장했습니다. ${state.role === "lmo_manager" ? "기관 안전관리자 또는 시스템 관리자" : "LMO 담당자"} 역할에서 답변 흐름을 체험하세요.`
                    : "신청서를 제출했습니다. 담당자 역할에서 검토할 수 있습니다.",
                )
              ) {
                setCreating(false);
                setDrafts((all) => {
                  const next = { ...all };
                  delete next[draftKey];
                  return next;
                });
              }
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="신청 유형">
                <select
                  className={inputClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  {[
                    "연구실 출입",
                    "LMO 시설 변경",
                    "문서 검토",
                    "기타 안전 업무",
                    INQUIRY_KIND,
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="신청 제목">
                <input
                  className={inputClass}
                  required
                  maxLength={100}
                  value={draft.title}
                  onChange={(e) => patchDraft({ title: e.target.value })}
                  placeholder={
                    inquiry
                      ? "문의할 내용을 간단히 적어 주세요"
                      : "검토받을 내용을 간단히 적어 주세요"
                  }
                />
              </Field>
            </div>
            {inquiry ? (
              <>
                <InquiryNotice />
                {draft.inquiry.assessment && (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold">
                      연결된 LMO 확인 결과
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                      {assessmentText(draft.inquiry.assessment)}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      문의에 포함할 응답 사본입니다. 실험 유형·신고 여부는
                      자동으로 판정하지 않습니다.
                    </p>
                  </div>
                )}

                <InquiryFields
                  value={draft.inquiry}
                  onChange={(value) => patchDraft({ inquiry: value })}
                />
              </>
            ) : (
              <Field label="신청 내용">
                <textarea
                  className={inputClass}
                  required
                  maxLength={4000}
                  rows={5}
                  value={draft.body}
                  onChange={(e) => patchDraft({ body: e.target.value })}
                  placeholder="현재 상황, 변경 내용, 확인받고 싶은 사항"
                />
              </Field>
            )}
            <p className="text-xs leading-6 text-gray-500">
              {saveFailed
                ? "초안 저장 실패 · 입력 내용은 현재 화면에만 남아 있습니다."
                : draft.updatedAt
                  ? "초안 자동 저장됨 · 새로고침·화면 이동 후에도 이 브라우저에서 복원됩니다."
                  : "입력하면 초안을 이 브라우저에 자동 저장합니다."}
            </p>
            <Button type="submit">
              {inquiry ? "사전 문의 제출 (체험)" : "검토 요청 제출"}
            </Button>
          </form>
        </Panel>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="신청 필터">
        {["전체", "내 신청", "검토 대기", "처리 완료"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-4 py-2 text-xs ${filter === f ? "border-brand-700 bg-brand-700 text-white" : "border-gray-200 bg-white text-gray-500"}`}
          >
            {f === "검토 대기" ? "검토 대기 · 문의 답변 대기" : f}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {rows.map((r) => (
          <RequestCard
            key={`${r.id}-${state.role}-${r.history.length}`}
            item={r}
          />
        ))}
        {!rows.length && (
          <Empty>이 조건에 해당하는 신청·문의가 없습니다.</Empty>
        )}
      </div>
    </div>
  );
}
function RequestCard({ item }: { item: RequestItem }) {
  const { state, update } = useDemo();
  const inquiry = isInquiry(item);
  const [note, setNote] = useState("");
  const [body, setBody] = useState(item.body);
  const [details, setDetails] = useState(item.inquiry || blankInquiry());
  const [decision, setDecision] = useState<RequestStatus>(
    inquiry ? "답변 완료" : "승인",
  );
  const review = canReview(state.role, item);
  const resubmit = item.owner === state.role && requestNeedsOwner(item);
  const latestReply = inquiry
    ? [...item.history]
        .reverse()
        .find((h) => ["답변 완료", "추가 정보 요청"].includes(h.event))
    : undefined;
  const earlierInfoRequest =
    latestReply?.event === "추가 정보 요청" && item.status !== "추가 정보 요청";
  function change(to: RequestStatus, comment = note) {
    if (
      update(
        (s) => {
          const current = s.requests.find((r) => r.id === item.id);
          if (!current) throw new Error("요청을 찾지 못했습니다.");
          const next = transitionRequest(
            current,
            s.role,
            to,
            comment,
            resubmit ? body : undefined,
            resubmit && inquiry
              ? {
                  ...details,
                  filingInfo:
                    details.previousFiling === "있음" ? details.filingInfo : "",
                }
              : undefined,
          );
          const updated = {
            ...s,
            requests: s.requests.map((r) => (r.id === item.id ? next : r)),
          };
          return resubmit
            ? updated
            : pushNotification(updated, {
                title: `${item.title} · ${to}`,
                detail: comment,
                href: "/demo/requests",
                target: item.owner,
              });
        },
        inquiry
          ? `문의 상태를 '${to}'로 변경했습니다. 실제 기관 전송은 없습니다.`
          : `신청 상태를 '${resubmit ? "재제출" : to}'로 변경했습니다.`,
      )
    )
      setNote("");
  }
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge muted>{item.kind}</Badge>
            <Badge>{item.status}</Badge>
          </div>
          <h2 className="break-words font-semibold">{item.title}</h2>
          <p className="mt-2 text-xs text-gray-500">
            {item.id} · {profiles[item.owner].name} ·{" "}
            {timeLabel(item.history[0].at)}
          </p>
        </div>
        {review && item.status === (inquiry ? "접수" : "제출") && (
          <Button
            onClick={() =>
              change(
                inquiry ? "답변 준비 중" : "검토 중",
                inquiry
                  ? "문의 내용을 확인하고 답변을 준비합니다."
                  : "신청 내용을 확인하기 시작했습니다.",
              )
            }
          >
            {inquiry ? "답변 준비 시작" : "검토 시작"}
          </Button>
        )}
      </div>
      {inquiry && (
        <div className="mt-5">
          <InquiryNotice />
        </div>
      )}
      {latestReply && (
        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <h3 className="text-sm font-semibold text-brand-900">
            {earlierInfoRequest
              ? "이전 추가 정보 요청 · 답변 대기"
              : `담당자 답변 · ${latestReply.event}`}
          </h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
            {latestReply.note}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {latestReply.actor} · {timeLabel(latestReply.at)}
          </p>
          {earlierInfoRequest && (
            <p className="mt-3 text-xs leading-6 text-gray-600">
              추가 정보를 이미 제출했습니다. 담당자의 다음 답변을 기다려 주세요.
            </p>
          )}
          {item.status === "답변 완료" && (
            <p className="mt-3 text-xs leading-6 text-gray-600">
              절차 안내 답변입니다. IBC 승인이나 실험 시작 허가가 아닙니다.
              기관의 정식 절차를 별도로 확인하세요.
            </p>
          )}
        </div>
      )}
      <p className="mt-5 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-600">
        {inquiry && item.inquiry ? inquiryBody(item.inquiry) : item.body}
      </p>
      {(resubmit ||
        (review && item.status === (inquiry ? "답변 준비 중" : "검토 중"))) && (
        <form
          className="mt-5 space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            change(resubmit ? (inquiry ? "접수" : "제출") : decision);
          }}
        >
          <h3 className="text-sm font-semibold">
            {resubmit
              ? inquiry
                ? "추가 정보 작성"
                : "보완 후 재제출"
              : inquiry
                ? "문의 답변 작성"
                : "검토 결과 작성"}
          </h3>
          {resubmit ? (
            inquiry ? (
              <InquiryFields value={details} onChange={setDetails} />
            ) : (
              <Field label="보완한 신청 내용">
                <textarea
                  rows={4}
                  className={inputClass}
                  required
                  maxLength={4000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </Field>
            )
          ) : (
            <Field label={inquiry ? "문의 처리 상태" : "처리 결과"}>
              <select
                className={inputClass}
                value={decision}
                onChange={(e) => setDecision(e.target.value as RequestStatus)}
              >
                {(inquiry
                  ? ["답변 완료", "추가 정보 요청"]
                  : ["승인", "보완 요청", "반려"]
                ).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          )}
          <Field
            label={
              resubmit
                ? inquiry
                  ? "추가 정보 설명"
                  : "보완 설명"
                : inquiry
                  ? "담당자 답변"
                  : "검토 의견"
            }
          >
            <textarea
              className={inputClass}
              required
              maxLength={2000}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                inquiry
                  ? "확인이 필요한 정보 또는 안내할 절차를 적어 주세요"
                  : "검토 의견을 구체적으로 적어 주세요"
              }
            />
          </Field>
          <Button
            disabled={!note.trim() || (resubmit && !inquiry && !body.trim())}
            type="submit"
          >
            {resubmit
              ? inquiry
                ? "추가 정보 제출 (체험)"
                : "보완 후 재제출"
              : inquiry
                ? "문의 답변 저장"
                : "검토 결과 저장"}
          </Button>
        </form>
      )}
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium text-brand-700">
          {inquiry ? "문의 처리 이력" : "처리 이력"} ({item.history.length})
        </summary>
        <div className="mt-5">
          <Timeline items={item.history} />
        </div>
      </details>
    </Panel>
  );
}
