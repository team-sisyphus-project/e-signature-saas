export const mockDocuments = [
  { id: 'nda-01', title: '파트너십 비밀유지계약서', type: 'NDA', status: 'review', owner: '민서 김', updated: '오늘, 오전 10:24', progress: 72, version: '3.2' },
  { id: 'service-02', title: '2026 서비스 이용계약', type: '계약서', status: 'draft', owner: '지훈 박', updated: '어제, 오후 4:10', progress: 34, version: '1.0' },
  { id: 'vendor-03', title: '벤더 공급 조건 합의서', type: '합의서', status: 'signed', owner: '민서 김', updated: '2026. 8. 22.', progress: 100, version: '2.1' },
] as const;

export const mockMembers = [
  { name: '민서 김', role: '관리자' },
  { name: '지훈 박', role: '편집자' },
  { name: '소라 이', role: '검토자' },
] as const;
