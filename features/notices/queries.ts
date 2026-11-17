import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, isUuid } from "@/lib/format";
import {
  ADMIN_NOTICE_PAGE_SIZE,
  NOTICE_PAGE_SIZE,
  type AdminNoticeListItem,
  type Notice,
  type NoticeListItem,
} from "./schema";

// 모두 사용자 세션 client 로 조회한다 → 기관 범위는 RLS 가 결정.
// 관리자는 RLS 상 임시저장·게시중단도 보이므로, 사용자 화면 쿼리는 게시 조건을 명시적으로 건다.

export type Paged<T> = { rows: T[]; total: number; page: number; totalPages: number };

export async function listPublishedNotices({ page, q }: { page: number; q?: string }): Promise<Paged<NoticeListItem>> {
  const supabase = await createClient();
  const from = (page - 1) * NOTICE_PAGE_SIZE;
  let query = supabase
    .from("notices")
    .select("id,title,is_pinned,published_at", { count: "exact" })
    .eq("status", "active")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString());
  const keyword = q?.trim().slice(0, 100);
  if (keyword) query = query.ilike("title", `%${escapeLike(keyword)}%`);
  const { data, count, error } = await query
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range(from, from + NOTICE_PAGE_SIZE - 1);
  if (error) throw new Error("공지사항을 불러오지 못했습니다.");
  const total = count ?? 0;
  return { rows: (data ?? []) as NoticeListItem[], total, page, totalPages: Math.max(1, Math.ceil(total / NOTICE_PAGE_SIZE)) };
}

export async function getPublishedNotice(id: string): Promise<Notice | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select("id,organization_id,title,body,is_pinned,published_at,status,created_at,updated_at")
    .eq("id", id)
    .eq("status", "active")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("공지사항을 불러오지 못했습니다.");
  return (data as Notice | null) ?? null;
}

/** 홈 "최신 공지사항". 실패해도 홈 전체가 깨지지 않도록 빈 배열. */
export async function getLatestNotices(limit = 5): Promise<NoticeListItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notices")
      .select("id,title,is_pinned,published_at")
      .eq("status", "active")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as NoticeListItem[];
  } catch {
    return [];
  }
}

export async function listNoticesForAdmin({ page }: { page: number }): Promise<Paged<AdminNoticeListItem>> {
  const supabase = await createClient();
  const from = (page - 1) * ADMIN_NOTICE_PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("notices")
    .select("id,title,is_pinned,published_at,status,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, from + ADMIN_NOTICE_PAGE_SIZE - 1);
  if (error) throw new Error("공지사항을 불러오지 못했습니다.");
  const total = count ?? 0;
  return {
    rows: (data ?? []) as AdminNoticeListItem[],
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_NOTICE_PAGE_SIZE)),
  };
}

export async function getNoticeForAdmin(id: string): Promise<Notice | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select("id,organization_id,title,body,is_pinned,published_at,status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("공지사항을 불러오지 못했습니다.");
  return (data as Notice | null) ?? null;
}

/** 공지를 쓸 수 있는 기관 목록 (RLS: super_admin 은 전체, safety_admin 은 담당 기관) */
export async function listWritableOrganizations(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("id,name").eq("status", "active").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
