# docs — taketheLMO 명세서 모음

AI 에게 작업을 시킬 때는 "AGENTS.md 와 docs/ 를 먼저 읽고, docs/pages/<페이지>.md 를 구현해 줘" 라고 요청한다.

| 파일 | 내용 | 언제 갱신 |
|---|---|---|
| `01-product-spec.md` | 통합 제품 명세 (원본 2개를 합치고 결정사항 반영) | 요구사항이 바뀔 때 |
| `02-current-status.md` | 구현 완료 / 미구현 현황 | **작업이 끝날 때마다** |
| `03-roadmap.md` | 단계별 작업 순서와 완료 기준 | 단계가 끝나거나 순서가 바뀔 때 |
| `04-conventions.md` | 폴더 구조, 권한 3중 검사, DB·마이그레이션 규칙, 코드 템플릿 | 규칙이 바뀔 때 |
| `05-decisions.md` | 결정된 사항과 아직 결정해야 할 사항 | 결정할 때 |
| `pages/_TEMPLATE.md` | 페이지 명세 양식 | — |
| `pages/*.md` | 페이지별 명세 (구현 전에 먼저 작성) | 구현 전 |
| `original-specs/` | 최초 요구사항 원본 (수정하지 않음) | — |

## AI 에게 요청하는 예시
```
AGENTS.md 와 docs/02-current-status.md, docs/pages/community-notices.md 를 읽고
공지사항 기능을 구현해 줘. 마이그레이션은 0003 으로 추가하고,
끝나면 lint/typecheck/test 를 통과시키고 02-current-status.md 를 갱신해 줘.
```
