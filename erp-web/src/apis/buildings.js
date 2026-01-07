// 간단 Mock API – 실제로는 axios로 교체
const delay = (ms=250) => new Promise(r=>setTimeout(r, ms));

let __buildings = [
  { id: 'B-001', name: '엔플러스 본사', address: '부산시 …', use:'업무', contact:'02-123-4567' },
];

export async function getBuildings(q='') {
  await delay();
  if (!q) return __buildings;
  return __buildings.filter(b => b.name.includes(q) || b.address.includes(q));
}

export async function createBuilding(payload) {
  await delay();
  const id = `B-${String(Math.floor(Math.random()*900)+100)}`;
  const item = { id, ...payload };
  __buildings = [item, ...__buildings];
  return item;
}
