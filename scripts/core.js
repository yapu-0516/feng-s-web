export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeLikeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function scrollToNodePosition(scrollLeft, scrollWidth, clientWidth, nodeCount) {
  if (nodeCount <= 1) return 0;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  if (maxScroll === 0) return 0;
  return clamp(scrollLeft / maxScroll, 0, 1) * (nodeCount - 1);
}

export function nodeToScrollPosition(nodeIndex, scrollWidth, clientWidth, nodeCount) {
  if (nodeCount <= 1) return 0;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  return (clamp(nodeIndex, 0, nodeCount - 1) / (nodeCount - 1)) * maxScroll;
}

function cleanText(value, maxLength) {
  return Array.from(String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim())
    .slice(0, maxLength)
    .join("");
}

export function validateMessage(payload = {}) {
  if (cleanText(payload.website, 20)) {
    return { ok: false, error: "留言没有发出，请刷新页面后重试。" };
  }

  const message = cleanText(payload.message, 61);
  const name = cleanText(payload.name, 17);

  if (!message) {
    return { ok: false, error: "写下一句话，再点亮星火。" };
  }

  if (Array.from(message).length > 60) {
    return { ok: false, error: "留言最多 60 个字。" };
  }

  if (Array.from(name).length > 16) {
    return { ok: false, error: "称呼最多 16 个字。" };
  }

  return {
    ok: true,
    value: {
      name: name || "一位后来者",
      message,
    },
  };
}
