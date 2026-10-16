export const CATEGORY_META = {
  상의: { label: '상의', tone: 'bg-teal-50 text-teal-800' },
  하의: { label: '하의', tone: 'bg-sky-50 text-sky-800' },
  아우터: { label: '아우터', tone: 'bg-amber-50 text-amber-900' },
  원피스: { label: '원피스', tone: 'bg-rose-50 text-rose-800' },
  잡화: { label: '잡화', tone: 'bg-violet-50 text-violet-800' },
  기타: { label: '기타', tone: 'bg-slate-100 text-slate-700' },
}

export function categoryTone(category) {
  return CATEGORY_META[category]?.tone ?? CATEGORY_META['기타'].tone
}
