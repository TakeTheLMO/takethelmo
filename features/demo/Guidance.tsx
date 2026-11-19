"use client";
import { Badge, Panel } from "@/components/ui/DemoUI";
import { ButtonLink } from "@/components/ui/Button";

export function LedgerExamples() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg bg-white p-4 text-sm leading-7">
        <h3 className="font-semibold">예시 1 · 입고 후 일부 사용</h3>
        <p>물질명: 수입신고확인서상 명칭</p>
        <p>
          입고량 <strong>5 vial</strong> · 사용량 <strong>1 vial</strong> ·
          보관량 <strong>4 vial</strong>
        </p>
        <p>비고: 1 vial당 1 ml (용량 병기 제안)</p>
      </div>
      <div className="rounded-lg bg-white p-4 text-sm leading-7">
        <h3 className="font-semibold">예시 2 · 배양으로 수량 증가</h3>
        <p>
          입고량 <strong>1 vial</strong> · 보관량 <strong>10 vial</strong>
        </p>
        <p>비고: 배양으로 1 vial → 10 vial</p>
        <p className="mt-2 text-xs text-gray-500">
          수량 차이만으로 오류를 판정하지 않습니다. 사용량 및 해당하지 않는
          칸의 기재 방법은 기관에 확인하세요.
        </p>
      </div>
    </div>
  );
}
export function LedgerGuidance() {
  return (
    <Panel title="관리대장 작성 안내">
      <div className="flex flex-wrap gap-2">
        <Badge>모든 역할 열람 가능</Badge>
        <Badge muted>팀 작성 안내 초안</Badge>
      </div>
      <p className="mt-4 text-sm leading-7 text-gray-600">
        물질명과 수량 단위를 확인하고 작성 예시를 참고하세요. 핵심 항목을
        기록하는 화면이며 공식 관리대장 전체 서식이나 서명을 대신하지 않습니다.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          [
            "01 · 물질명",
            "수입한 LMO는 수입신고확인서상 명칭을 대조하세요. 분양·자체 제작한 LMO의 명칭 기준은 기관 서식·담당자 확인이 필요합니다.",
          ],
          [
            "02 · 수량과 단위",
            "입고량·사용량·보관량을 나누어 기록하세요. 팀 제안: 한 기록에는 같은 단위를 사용하고, 용기 수로 쓸 때 용기당 용량을 별도 칸에 적습니다. 용량을 용기 수로 자동 환산하지 않으며, 기본 단위는 기관 확인이 필요합니다.",
          ],
          [
            "03 · 비고",
            "배양 등으로 수량이 달라졌다면 작성 기준을 확인해 변동 사유를 적으세요. 팀 제안: 연구실 호칭·제품명을 비고에 함께 기록하되 기관 허용 여부를 확인합니다.",
          ],
        ].map(([title, text]) => (
          <div key={title} className="rounded-xl bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
          </div>
        ))}
      </div>
      <details className="mt-5 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-800">
          작성 예시 보기
        </summary>
        <p className="my-4 text-xs leading-6 text-gray-600">
          서로 다른 두 가지 가상 사례입니다. 실제 시설 등급·신고번호·명칭을
          뜻하지 않습니다.
        </p>
        <LedgerExamples />
      </details>
      <details className="mt-4 rounded-xl border border-gray-200 p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          나머지 항목과 기관 확인 사항
        </summary>
        <ul className="mt-4 list-disc space-y-3 pl-5 leading-6 text-gray-600">
          <li>
            숙주 생물체·삽입 유전자·공여 생물체: 관련 자료를 대조하고 정확한
            명칭을 확인합니다.
          </li>
          <li>
            매도자·수입신고번호·이동 경로: 해당 거래·이동 자료와 기관 시설번호를
            대조합니다.
          </li>
          <li>
            보관 장소·시설 등급: 실제 시설 기록을 확인합니다. 예시에서 등급을
            추정하지 않습니다.
          </li>
          <li>
            취급자·책임자 서명: 서명자와 주기는 기관 서식·담당자 확인이
            필요합니다.
          </li>
          <li>
            기관 양식, 연구자의 작성 권한, 빈 칸 표기 방법은 아직 확인되지
            않았습니다.
          </li>
        </ul>
      </details>
      <p className="mt-4 text-xs leading-6 text-gray-500">
        근거: 팀 서류작성안내 수정안 (2026.11.14), 연구자 인터뷰. 문서가 참조한
        공식 안내를 연결합니다. 최신 기준과 기관 적용 여부는 원문·담당자에게
        확인하세요.
      </p>
      <a
        className="mt-2 inline-block text-sm font-medium text-brand-700 underline underline-offset-4"
        href="https://www.lmosafety.or.kr/menu?menuId=MENU00315"
        target="_blank"
        rel="noreferrer"
      >
        공식 취급관리 안내·서식 확인 ↗
      </a>
      <p className="mt-3 text-xs text-gray-500">
        상세 링크가 열리지 않으면{" "}
        <a
          className="text-brand-700 underline"
          href="https://www.lmosafety.or.kr"
          target="_blank"
          rel="noreferrer"
        >
          LMO 정보시스템 홈페이지
        </a>
        에서 안내·서식을 찾아보세요.
      </p>
    </Panel>
  );
}

export function PreparationGuidance() {
  return (
    <Panel title="수입신고 준비서류 체크리스트">
      <Badge muted>팀 정리 초안 · 기관 확인 필요</Badge>
      <p className="my-4 text-sm leading-6 text-gray-600">
        팀이 정리한 준비 항목입니다. 실제 제출 대상과 최신 서식은 공식 안내에서
        확인하세요. 기관의 메일 체크리스트와 내부 서식은 아직 확보하지
        못했습니다.
      </p>
      <dl className="divide-y divide-gray-100 text-sm">
        {[
          ["수입신고서", "실제 신고 주체와 기관 내부 결재 순서 확인"],
          [
            "수입계약서 또는 주문서 사본",
            "거래 자료 확보 · 무상 증여 시 필요한 대체 증빙 확인",
          ],
          ["운반계획서", "공식 서식과 기관 작성 예시 유무 확인"],
          ["활용계획서", "공식 서식과 기관 작성 예시 유무 확인"],
          [
            "추가 승인·절차 해당 여부",
            "대상 물질과 실험 계획을 담당자에게 설명하고 확인",
          ],
        ].map(([title, text]) => (
          <div key={title} className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr]">
            <dt className="font-medium">{title}</dt>
            <dd className="text-gray-600">{text}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <a
          className="text-sm font-medium text-brand-700 underline underline-offset-4"
          href="https://www.lmosafety.or.kr/menu?menuId=MENU00309"
          target="_blank"
          rel="noreferrer"
        >
          공식 수입신고 안내·서식 확인 ↗
        </a>
        <ButtonLink href="/mypage/requests?kind=ibc" variant="outline">
          IBC 사전 문의 작성
        </ButtonLink>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        상세 링크가 열리지 않으면{" "}
        <a
          className="text-brand-700 underline"
          href="https://www.lmosafety.or.kr"
          target="_blank"
          rel="noreferrer"
        >
          LMO 정보시스템 홈페이지
        </a>
        에서 수입신고 안내를 확인하세요.
      </p>
    </Panel>
  );
}
