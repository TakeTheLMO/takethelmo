"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PRIVILEGED_ROLES } from "@/config/roles";
import { isUuid } from "@/lib/format";
import { nextPublishedAt, parseNoticeInput, type NoticeActionResult } from "./schema";

// 서버 검사(requireRole) → 사용자 세션 client 로 쓰기 → DB RLS(is_org_admin) 가 기관 범위를 다시 검사.
const SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const NOT_FOUND = "공지를 찾을 수 없거나 수정할 권한이 없습니다.";

function revalidateNotices(id?: string) {
  revalidatePath("/");
  revalidatePath("/community/notices");
  if (id) revalidatePath(`/community/notices/${id}`);
  revalidatePath("/admin/notices");
}

export async function createNotice(raw: unknown): Promise<NoticeActionResult> {
  const user = await requireRole(PRIVILEGED_ROLES, "/admin/notices/new");
  const parsed = parseNoticeInput(raw);
  if (!parsed.ok) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };

  // super_admin 은 기관을 고를 수 있고, safety_admin 은 항상 본인 소속 기관
  const requestedOrg = (raw as { organizationId?: unknown } | null)?.organizationId;
  const organizationId =
    user.profile.role === "super_admin" && isUuid(requestedOrg) ? requestedOrg : user.profile.organization_id;
  if (!organizationId) {
    return {
      ok: false,
      message: "소속 기관이 지정되지 않아 공지를 작성할 수 없습니다.",
      fieldErrors: { organizationId: "기관을 선택해 주세요." },
    };
  }

  const { title, body, isPinned, publish } = parsed.value;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notices")
      .insert({
        organization_id: organizationId,
        title,
        body,
        is_pinned: isPinned,
        published_at: publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: SAVE_FAILED };
    revalidateNotices(data.id);
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function updateNotice(id: string, raw: unknown): Promise<NoticeActionResult> {
  await requireRole(PRIVILEGED_ROLES, "/admin/notices");
  if (!isUuid(id)) return { ok: false, message: NOT_FOUND };
  const parsed = parseNoticeInput(raw);
  if (!parsed.ok) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };

  const { title, body, isPinned, publish } = parsed.value;
  try {
    const supabase = await createClient();
    const { data: current, error: readError } = await supabase
      .from("notices").select("published_at").eq("id", id).maybeSingle();
    if (readError) return { ok: false, message: SAVE_FAILED };
    if (!current) return { ok: false, message: NOT_FOUND };

    const { data, error } = await supabase
      .from("notices")
      .update({ title, body, is_pinned: isPinned, published_at: nextPublishedAt(current.published_at, publish) })
      .eq("id", id)
      .select("id");
    if (error) return { ok: false, message: SAVE_FAILED };
    if (!data || data.length === 0) return { ok: false, message: NOT_FOUND };
    revalidateNotices(id);
    return { ok: true, id };
  } catch {
    return { ok: false, message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/** 게시중단(inactive) / 다시 게시(active). 삭제는 하지 않는다. */
export async function setNoticeStatus(id: string, status: "active" | "inactive"): Promise<NoticeActionResult> {
  await requireRole(PRIVILEGED_ROLES, "/admin/notices");
  if (!isUuid(id) || (status !== "active" && status !== "inactive")) return { ok: false, message: NOT_FOUND };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("notices").update({ status }).eq("id", id).select("id");
    if (error) return { ok: false, message: SAVE_FAILED };
    if (!data || data.length === 0) return { ok: false, message: NOT_FOUND };
    revalidateNotices(id);
    return { ok: true, id };
  } catch {
    return { ok: false, message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
