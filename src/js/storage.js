(function (global) {
  "use strict";

  const KEY = "random-class-state-v1";

  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") return global.crypto.randomUUID();
    return `list-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createDefaultState() {
    const listId = createId();
    return {
      version: 1,
      activeListId: listId,
      lists: [{ id: listId, name: "Danh sách tạm thời", students: [] }],
      history: [],
    };
  }

  function normalizeState(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.lists)) {
      throw new Error("Dữ liệu Random Class không hợp lệ.");
    }
    const lists = value.lists
      .filter((list) => list && typeof list.name === "string" && Array.isArray(list.students))
      .map((list) => ({
        id: typeof list.id === "string" ? list.id : createId(),
        name: list.name.trim() || "Danh sách chưa đặt tên",
        students: list.students.filter((name) => typeof name === "string").map((name) => name.trim()).filter(Boolean),
      }));
    if (!lists.length) return createDefaultState();
    const activeListId = lists.some((list) => list.id === value.activeListId) ? value.activeListId : lists[0].id;
    const history = Array.isArray(value.history)
      ? value.history.filter((item) => item && typeof item === "object" && typeof item.game === "string" && Array.isArray(item.results)).slice(0, 200)
      : [];
    return { version: 1, activeListId, lists, history };
  }

  function load() {
    const raw = global.localStorage.getItem(KEY);
    if (raw === null) return createDefaultState();
    try {
      const storedState = normalizeState(JSON.parse(raw));
      const state = createDefaultState();
      state.history = storedState.history;
      save(state);
      return state;
    } catch (error) {
      console.error("Không thể đọc dữ liệu đã lưu của Random Class.", error);
      throw new Error("Không đọc được dữ liệu đã lưu. Hãy kiểm tra dữ liệu trình duyệt trước khi tiếp tục.");
    }
  }

  function save(state) {
    try {
      const normalized = normalizeState(state);
      const storedState = {
        version: 1,
        activeListId: "temporary",
        lists: [{ id: "temporary", name: "Danh sách tạm thời", students: [] }],
        history: normalized.history,
      };
      global.localStorage.setItem(KEY, JSON.stringify(storedState));
    } catch (error) {
      console.error("Không thể lưu dữ liệu Random Class.", error);
      if (error && error.name === "QuotaExceededError") throw new Error("Bộ nhớ trình duyệt đã đầy. Hãy xóa dữ liệu cũ hoặc xuất bản sao lưu.");
      throw new Error("Không thể lưu dữ liệu. Hãy kiểm tra cài đặt quyền riêng tư của trình duyệt.");
    }
  }

  global.RandomClass = global.RandomClass || {};
  global.RandomClass.Storage = { createId, createDefaultState, load, save };
})(window);
