"use client";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Attachment,
  Badge,
  Empty,
  Field,
  FileInput,
  inputClass,
  Panel,
} from "@/components/ui/DemoUI";
import { useDemo, pushNotification } from "./Store";
import { dateLabel, deadline, timeLabel, type Course } from "./model";
import { saveFile } from "./files";
export function Training() {
  const { state } = useDemo();
  const records = state.enrollments.filter(
    (e) => e.owner === state.role && e.status === "등록 완료",
  );
  const completed = state.courses.filter((c) =>
    records.some((r) => r.courseId === c.id),
  ).length;
  return (
    <div className="space-y-6">
      <Panel
        title="나의 교육 현황"
        aside={
          <Badge>
            {completed} / {state.courses.length} 등록
          </Badge>
        }
      >
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-brand-600"
            style={{ width: `${(completed / state.courses.length) * 100}%` }}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-500">
          아래 과정과 기한은 가상 예시예요. 실제 교육 대상·시간·이수 기준은 기관
          담당자에게 확인해 주세요. 이수증 등록은 진위 확인이나 공식 이수 인정을
          뜻하지 않아요.
        </p>
      </Panel>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        {state.courses.map((c) => (
          <CourseCard key={`${state.role}-${c.id}`} course={c} />
        ))}
      </div>
      <Panel title="이수증 등록 이력">
        {!records.length ? (
          <Empty>
            등록한 이수증이 없습니다. 과정 카드에서 파일을 등록해 보세요.
          </Empty>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...records].reverse().map((r, i) => (
              <div
                key={`${r.at}-${i}`}
                className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {state.courses.find((c) => c.id === r.courseId)?.title}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    이수일 {r.completedAt} · 등록 {timeLabel(r.at)}
                  </p>
                </div>
                {r.file && <Attachment file={r.file} />}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
function CourseCard({ course }: { course: Course }) {
  const { state, update, notify } = useDemo();
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const registration = [...state.enrollments]
    .reverse()
    .find((e) => e.owner === state.role && e.courseId === course.id);
  const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE"));
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <GraduationCap size={23} className="text-brand-600" />
        <Badge muted>{registration?.status || "미신청"}</Badge>
      </div>
      <h2 className="mt-5 text-base font-semibold leading-7">{course.title}</h2>
      <p className="mt-2 text-xs text-gray-400">
        {course.duration} · {course.category}
      </p>
      <p className="mt-4 min-h-12 text-sm leading-6 text-gray-500">
        {course.description}
      </p>
      <div className="my-5 flex items-center justify-between border-y border-gray-100 py-3 text-xs text-gray-500">
        <span>예제 기한 {dateLabel(course.due)}</span>
        <Badge>{deadline(course.due)}</Badge>
      </div>
      <div className="space-y-2">
        {!registration && (
          <Button
            className="w-full"
            onClick={() =>
              update(
                (s) => ({
                  ...s,
                  enrollments: [
                    ...s.enrollments,
                    {
                      courseId: course.id,
                      owner: s.role,
                      status: "수강 예정",
                      at: new Date().toISOString(),
                    },
                  ],
                }),
                "내 수강 예정 목록에 추가했습니다.",
              )
            }
          >
            수강 예정에 추가
          </Button>
        )}
        <a
          href="https://edu.labs.go.kr/front/index.do"
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-gray-200 px-4 py-3 text-center text-sm text-gray-600"
        >
          공식 교육 사이트 열기 ↗
        </a>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {registration?.status === "등록 완료"
            ? "이수증 추가 등록"
            : "이수증 등록"}
        </Button>
      </div>
      {open && (
        <form
          className="mt-5 space-y-4 border-t border-gray-100 pt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file) return;
            const owner = state.role;
            setBusy(true);
            try {
              const attachment = await saveFile(file);
              if (
                update(
                  (s) =>
                    pushNotification(
                      {
                        ...s,
                        enrollments: [
                          ...s.enrollments.filter(
                            (r) =>
                              !(
                                r.owner === owner &&
                                r.courseId === course.id &&
                                r.status === "수강 예정"
                              ),
                          ),
                          {
                            courseId: course.id,
                            owner,
                            status: "등록 완료",
                            file: attachment,
                            completedAt: date,
                            at: new Date().toISOString(),
                          },
                        ],
                      },
                      {
                        title: `${course.title} 이수증 등록`,
                        detail:
                          "체험용 기록을 저장했습니다. 공식 이수 인증은 아닙니다.",
                        href: "/demo/training",
                        target: owner,
                      },
                    ),
                  "이수증을 등록했습니다. 나의 안전 현황에도 반영됩니다.",
                )
              ) {
                setOpen(false);
                setFile(undefined);
              }
            } catch (error) {
              notify((error as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="이수일">
            <input
              className={inputClass}
              type="date"
              required
              max={new Date().toLocaleDateString("sv-SE")}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <FileInput onChange={setFile} required />
          <Button disabled={busy || !file} className="w-full" type="submit">
            {busy ? "파일 저장 중…" : "이수 기록 저장"}
          </Button>
        </form>
      )}
    </Panel>
  );
}
