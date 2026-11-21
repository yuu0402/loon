// WeSync Pro 解锁 —— 订阅状态响应改写
// 拦截 /api/subscription/status，把免费状态改写成 Pro 激活
(function () {
  const DEBUG = false;
  let body = $response.body || '';

  function log(msg) {
    if (DEBUG) console.log('[WeSyncPro] ' + msg);
  }

  try {
    const obj = JSON.parse(body);
    const d = obj && obj.data;
    if (d && typeof d === 'object') {
      // 核心开关：免费响应里实测存在的两个字段
      d.is_active = true;
      d.auto_renew = true;

      // 兼容性补强：这些字段在应用二进制里都出现过，存在就翻，不存在就补
      d.pro_entitled = true;

      // 到期时间推到 2099（付费用户的响应里带 expires_at，字符串日期）
      const FAR = '2099-12-31T23:59:59.000Z';
      d.expires_at = FAR;

      // 试用相关字段：如果服务器下发了就一并刷成激活状态
      if ('trial_granted' in d) d.trial_granted = true;
      if (typeof d.trial_expires_at === 'string' || d.trial_expires_at == null) {
        d.trial_expires_at = FAR;
      }
      if (typeof d.status === 'string') d.status = 'active';
      if ('sub_trial' in d && d.sub_trial && typeof d.sub_trial === 'object') {
        if ('is_active' in d.sub_trial) d.sub_trial.is_active = true;
        if (typeof d.sub_trial.expires_at === 'string') d.sub_trial.expires_at = FAR;
      }
      body = JSON.stringify(obj);
      log('rewritten: ' + body);
    } else {
      log('data 字段不是对象，原样放行');
    }
  } catch (e) {
    // 非 JSON 兜底：同长度文本替换，不动 Content-Length
    body = body
      .replace(/"is_active"\s*:\s*false/g, '"is_active":true ')
      .replace(/"pro_entitled"\s*:\s*false/g, '"pro_entitled":true ')
      .replace(/"auto_renew"\s*:\s*false/g, '"auto_renew":true ');
    log('fallback text replace, err: ' + e);
  }
  $done({ body });
})();
