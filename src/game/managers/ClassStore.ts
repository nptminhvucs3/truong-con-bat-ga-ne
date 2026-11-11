export interface ClassItem { id: string; name: string; text: string; updatedAt: number; }
export interface ClassData { classes: ClassItem[]; selectedId: string; }

const KEY = 'tcbg.classes.v1';
const OLD_KEY = 'tcbg.students'; // bản cũ chỉ lưu một danh sách duy nhất

const uid = (): string => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newClass(name: string, text = ''): ClassItem {
  return { id: uid(), name: name.trim() || 'Lớp mới', text, updatedAt: Date.now() };
}

export function loadClassData(): ClassData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as ClassData;
      if (Array.isArray(d.classes) && d.classes.length > 0) {
        const ok = d.classes.some((c) => c.id === d.selectedId);
        return { classes: d.classes, selectedId: ok ? d.selectedId : d.classes[0].id };
      }
    }
    const old = localStorage.getItem(OLD_KEY) ?? '';
    const c = newClass(old.trim() ? 'Lớp của tôi' : 'Lớp 1', old);
    return { classes: [c], selectedId: c.id };
  } catch {
    const c = newClass('Lớp 1');
    return { classes: [c], selectedId: c.id };
  }
}

export function saveClassData(d: ClassData): void {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* bỏ qua */ }
}

/** Sao lưu toàn bộ lớp ra JSON (để chép sang máy/trình duyệt khác). */
export function exportClasses(d: ClassData): string {
  return JSON.stringify({ app: 'truong-con-bat-ga', version: 1, classes: d.classes.map((c) => ({ name: c.name, text: c.text })) }, null, 2);
}

export function parseImport(json: string): ClassItem[] | null {
  try {
    const o = JSON.parse(json) as { classes?: Array<{ name?: unknown; text?: unknown }> };
    if (!Array.isArray(o.classes)) return null;
    const list = o.classes
      .filter((c) => typeof c.name === 'string' && typeof c.text === 'string')
      .map((c) => newClass(c.name as string, c.text as string));
    return list.length > 0 ? list : null;
  } catch { return null; }
}
