export const assessmentLabels: Record<string, string> = {
  organism: "살아 있는 생물체를 취급하거나 도입할 예정인가요?",
  modified: "유전물질의 변형 여부와 관련 자료를 확인했나요?",
  facility: "기존 시설의 신고·허가 기록과 예정 업무 범위를 확인했나요?",
  animal: "동물에게 물질을 투여하는 실험이 포함되나요?",
};
export function assessmentText(answers: Record<string, string>) {
  return Object.entries(assessmentLabels)
    .map(([id, label]) => `${label} ${answers[id] || "미응답"}`)
    .join("\n");
}
