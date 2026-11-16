"use client";
import { Field, inputClass } from "@/components/ui/DemoUI";
import type { InquiryDetails } from "./model";
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
        제출 체험: 이 브라우저에만 저장되며 실제 기관에 전송되지 않습니다. 데모
        수신·답변 역할은 LMO 담당자이며 기관·시스템 관리자가 보조합니다. 실제
        기관의 담당자·처리 기한은 확인이 필요합니다.
      </p>
    </div>
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
