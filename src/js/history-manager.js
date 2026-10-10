(function (global) {
  "use strict";

  const data = global.RandomClass.Data;

  function add(entry) {
    if (!entry || typeof entry.game !== "string" || !Array.isArray(entry.results)) {
      throw new Error("Kết quả lịch sử không hợp lệ.");
    }
    const state = data.getState();
    state.history.unshift({
      id: global.RandomClass.Storage.createId(),
      game: entry.game,
      listName: entry.listName,
      results: [...entry.results],
      createdAt: new Date().toISOString(),
    });
    state.history = state.history.slice(0, 200);
    data.replaceState(state);
    return state.history[0];
  }

  function getAll() {
    return data.getState().history;
  }

  function clear() {
    const state = data.getState();
    state.history = [];
    data.replaceState(state);
  }

  global.RandomClass.History = { add, clear, getAll };
})(window);
