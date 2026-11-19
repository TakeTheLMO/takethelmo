"use client";
import { Field, inputClass } from "@/components/ui/DemoUI";
import type { InquiryDetails, inquiryStatuses } from "./model";
type InquiryStatus = (typeof inquiryStatuses)[number];
export function blankInquiry(): InquiryDetails {
  return {
    experimentType: "",
    materials: "",
    plannedStart: "",
    startUnknown: false,
    previousFiling: "모르겠어요",
    filingInfo: "",
    overview: "",
  };
}
export function InquiryNotice() {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-sm leading-7 text-gray-700">
      <p className="font-semibold text-brand-900">
        절차 확인을 위한 사전 문의입니다.
      </p>
      <p>
        접수·답변 완료는 IBC 심의 승인이나 실험 시작 허가를 의미하지 않습니다.
        필요한 심의·신고·승인과 시작 가능 여부는 기관 담당자에게 별도로
        확인하세요.
      </p>
      <p className="mt-2 text-xs leading-6 text-gray-600">
        제출한 문의는 서버에 저장되며 담당 관리자가 확인하고 답변합니다. 기관의 공식 IBC 심의·신고 시스템과는 별개이며 실제 기관 담당자·처리 기한은 확인이 필요합니다.
      </p>
    </div>
  );
}
// 사용자 피드백(2026-11-17): "답변의 의미"를 알기 어렵다 → 상태별 의미와 다음에 할 일을 함께 보여준다.
const statusGuide: { status: InquiryStatus; meaning: string; next: string }[] = [
  { status: "접수", meaning: "문의가 등록됐어요. 담당자가 아직 확인하기 전이에요.", next: "기다려 주세요. 답변 준비가 시작되면 알림으로 알려드려요." },
  { status: "답변 준비 중", meaning: "담당자가 내용을 확인하고 답변을 준비하고 있어요.", next: "기다려 주세요. 추가 정보가 필요하면 담당자가 요청해요." },
  { status: "추가 정보 요청", meaning: "답변하려면 정보가 더 필요하다고 담당자가 요청했어요.", next: "요청 내용을 읽고 이 화면에서 추가 정보를 제출해 주세요." },
  { status: "답변 완료", meaning: "담당자가 절차 안내 답변을 남겼어요. IBC 승인이나 실험 시작 허가는 아니에요.", next: "답변에 안내된 정식 심의·신고 절차를 기관 담당자와 진행해 주세요." },
];
export function InquiryStatusGuide({ current }: { current?: string }) {
  const now = statusGuide.find((s) => s.status === current);
  return (
    <div className="rounded-xl border border-gray-200 p-4 text-sm">
      <h3 className="font-semibold text-gray-900">
        {now ? `지금 상태: ${now.status}` : "사전 문의는 이렇게 진행돼요"}
      </h3>
      {now && (
        <p className="mt-2 leading-6 text-gray-700">
          {now.meaning} <strong className="font-semibold text-brand-800">다음 할 일:</strong> {now.next}
        </p>
      )}
      <details className="mt-3" open={!now}>
        <summary className="cursor-pointer text-xs font-medium text-brand-700">
          상태별 의미 보기
        </summary>
        <ol className="mt-3 space-y-2">
          {statusGuide.map((s, i) => (
            <li
              key={s.status}
              aria-current={s.status === current ? "step" : undefined}
              className={`rounded-lg p-3 leading-6 ${s.status === current ? "bg-brand-50" : "bg-gray-50"}`}
            >
              <p className="text-xs font-semibold text-gray-900">
                {i + 1}. {s.status}
              </p>
              <p className="text-xs text-gray-600">{s.meaning}</p>
              <p className="text-xs text-gray-600">다음 할 일: {s.next}</p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
export function InquiryPreparation() {
  return (
    <details className="rounded-xl border border-gray-200 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-gray-900">
        작성 전에 준비하면 좋은 정보
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-6 text-gray-600">
        <li>실험 유형: 무엇을 하려는지 한 줄로 적어요. 정해지지 않은 부분은 미정이라고 적어도 돼요.</li>
        <li>사용 물질: 생물체·유전물질·시약의 이름이나 제품명, 관련 자료(분양 문서, 제품 설명서 등)가 있는지 적어요.</li>
        <li>예정 시작 시기: 날짜를 모르면 &lsquo;시작 시기 미정&rsquo;을 선택해요.</li>
        <li>기존 LMO 신고 여부: 모르면 &lsquo;모르겠어요&rsquo;를 그대로 두세요. 담당자가 확인해요.</li>
        <li>문의 사항: 확인받고 싶은 절차와 이해하기 어려운 점을 구체적으로 적어요.</li>
      </ul>
      <p className="mt-3 text-xs leading-6 text-gray-500">
        LMO 확인 지원에서 질문에 답하면 응답이 이 문의에 함께 붙어요.
      </p>
    </details>
  );
}
export function InquiryFields({
  value,
  onChange,
}: {
  value: InquiryDetails;
  onChange: (next: InquiryDetails) => void;
}) {
  function patch(change: Partial<InquiryDetails>) {
    onChange({ ...value, ...change });
  }
  return (
    <div className="space-y-5">
      <Field
        label="1. 실험 유형"
        hint="계획한 유형을 적어 주세요. 미정인 부분을 설명해도 됩니다."
      >
        <input
          className={inputClass}
          required
          maxLength={200}
          value={value.experimentType}
          onChange={(e) => patch({ experimentType: e.target.value })}
          placeholder="예: 동물 대상 실험 계획 (가상 예시)"
        />
      </Field>
      <Field
        label="2. 사용 물질"
        hint="확인한 물질명·제품명과 자료 유무를 적어 주세요. 모르는 정보는 확인 필요로 적으세요."
      >
        <textarea
          className={inputClass}
          required
          rows={2}
          maxLength={1500}
          value={value.materials}
          onChange={(e) => patch({ materials: e.target.value })}
          placeholder="예: 분양받은 세포주 1종(분양 문서 있음), 도입할 유전물질은 확인 필요 (가상 예시)"
        />
      </Field>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium text-gray-700">
          3. 예정 시작 시기
        </legend>
        <Field label="예정 시작일">
          <input
            className={inputClass}
            type="date"
            required={!value.startUnknown}
            disabled={value.startUnknown}
            value={value.plannedStart}
            onChange={(e) => patch({ plannedStart: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.startUnknown}
            onChange={(e) => patch({ startUnknown: e.target.checked })}
          />
          시작 시기 미정
        </label>
      </fieldset>
      <div className="space-y-3">
        <Field label="4. 기존 LMO 신고 여부">
          <select
            className={inputClass}
            value={value.previousFiling}
            onChange={(e) =>
              patch({
                previousFiling: e.target
                  .value as InquiryDetails["previousFiling"],
              })
            }
          >
            {["모르겠어요", "있음", "없음"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        {value.previousFiling === "있음" && (
          <Field
            label="알고 있는 신고 정보 (선택)"
            hint="신고번호·대상 등 확인한 정보만 적어 주세요."
          >
            <input
              className={inputClass}
              maxLength={300}
              value={value.filingInfo}
              onChange={(e) => patch({ filingInfo: e.target.value })}
            />
          </Field>
        )}
      </div>
      <Field label="5. 실험 개요·문의 사항">
        <textarea
          className={inputClass}
          required
          rows={5}
          maxLength={4000}
          value={value.overview}
          onChange={(e) => patch({ overview: e.target.value })}
          placeholder="확인받고 싶은 절차, 준비 상황, 이해하기 어려운 점"
        />
      </Field>
    </div>
  );
}
