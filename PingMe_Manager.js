// 2026/05/14
// PingMe 账号管理脚本（Loon）
// 使用同一个 persistentStore key：pingme_accounts_v1
// action 支持：list / del:3 / rename:1:主号 / clear

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

function parseArgument() {
  if (typeof $argument === 'undefined' || !$argument) return {};
  if (typeof $argument === 'object') return $argument;
  const obj = {};
  String($argument).split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx);
    const v = pair.slice(idx + 1);
    obj[k] = decodeURIComponent(v || '');
  });
  return obj;
}

const ARG = parseArgument();
const action = String(ARG.action || '').trim();

function notify(title, body) {
  $notification.post(scriptName, title, body);
}

function loadStore() {
  const raw = $persistentStore.read(storeKey);
  if (!raw) return { version: 1, accounts: {}, order: [] };
  try {
    const obj = JSON.parse(raw);
    if (!obj.accounts) obj.accounts = {};
    if (!Array.isArray(obj.order)) obj.order = Object.keys(obj.accounts);
    return obj;
  } catch (e) {
    return { version: 1, accounts: {}, order: [] };
  }
}

function saveStore(store) {
  $persistentStore.write(JSON.stringify(store), storeKey);
}

function idsOf(store) {
  return (store.order || []).filter(id => store.accounts && store.accounts[id]);
}

function accountListText(store) {
  const ids = idsOf(store);
  if (!ids.length) return '当前没有账号';
  return ids.map((id, i) => {
    const acc = store.accounts[id];
    const alias = acc.alias || `账号${i + 1}`;
    const updated = acc.updatedAt ? new Date(acc.updatedAt).toLocaleString() : '未知';
    return `${i + 1}. ${alias}\n   id: ${acc.id}\n   更新: ${updated}`;
  }).join('\n');
}

function main() {
  const store = loadStore();
  const ids = idsOf(store);

  if (!action || action === '{manager_action}' || action === 'undefined' || action === 'null') {
    notify('⚠️ 未填写管理指令', '支持：\nlist\ndel:3\nrename:1:主号\nclear');
    return $done();
  }

  if (action === 'list') {
    notify('📋 PingMe账号列表', accountListText(store));
    return $done();
  }

  if (action === 'clear') {
    saveStore({ version: 1, accounts: {}, order: [] });
    notify('✅ 清空成功', '已清空全部 PingMe 账号数据');
    return $done();
  }

  if (/^del:\d+$/.test(action)) {
    const idx = Number(action.split(':')[1]);
    if (!Number.isInteger(idx) || idx < 1 || idx > ids.length) {
      notify('⚠️ 删除失败', `序号无效：${idx}\n当前账号：\n${accountListText(store)}`);
      return $done();
    }
    const id = ids[idx - 1];
    const alias = store.accounts[id].alias || id;
    delete store.accounts[id];
    store.order = store.order.filter(x => x !== id);
    saveStore(store);
    notify('✅ 删除成功', `已删除第 ${idx} 个账号：${alias}\n剩余账号：\n${accountListText(store)}`);
    return $done();
  }

  if (/^rename:\d+:.+/.test(action)) {
    const parts = action.split(':');
    const idx = Number(parts[1]);
    const name = parts.slice(2).join(':').trim();
    if (!Number.isInteger(idx) || idx < 1 || idx > ids.length || !name) {
      notify('⚠️ 备注失败', `格式：rename:序号:备注名\n例如：rename:1:主号\n当前账号：\n${accountListText(store)}`);
      return $done();
    }
    const id = ids[idx - 1];
    store.accounts[id].alias = name;
    store.accounts[id].updatedAt = Date.now();
    saveStore(store);
    notify('✅ 备注成功', `第 ${idx} 个账号已改为：${name}\n当前账号：\n${accountListText(store)}`);
    return $done();
  }

  notify('⚠️ 管理指令无效', `支持：\nlist\ndel:3\nrename:1:主号\nclear\n当前填写：${action}`);
  $done();
}

main();
