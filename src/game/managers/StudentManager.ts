import type { Student } from '../../types';

export interface ParsedList { students: Student[]; duplicateCount: number; }

/** Mỗi dòng là một học sinh. Bỏ dòng trống, cắt khoảng trắng thừa, tên trùng vẫn có ID riêng. */
export function parseStudentList(text: string): ParsedList {
  const names = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^"(.*)"$/, '$1').trim())
    .filter(Boolean);
  const seen = new Map<string, number>();
  let duplicateCount = 0;
  const students = names.map((name, i) => {
    const key = name.toLowerCase();
    const c = (seen.get(key) ?? 0) + 1;
    seen.set(key, c);
    if (c > 1) duplicateCount++;
    return { id: `s${i + 1}`, name };
  });
  return { students, duplicateCount };
}

/** Rút gọn tên cho đỡ chiếm chỗ: chỉ giữ chữ cuối ("Lý Thiện Nhân" -> "Nhân"). */
export function shortName(name: string): string {
  return name.split(' ').pop() ?? name;
}
