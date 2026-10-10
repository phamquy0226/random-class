(function (global) {
  "use strict";

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function randomInteger(min, max, random = Math.random) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error("Khoảng số ngẫu nhiên không hợp lệ.");
    }
    return Math.floor(random() * (max - min + 1)) + min;
  }

  function createSession() {
    const selected = new Set();

    function chooseMany(items, count, noRepeat = false) {
      if (!Array.isArray(items)) throw new Error("Danh sách để chọn phải là một mảng.");
      if (!Number.isInteger(count) || count < 0) throw new Error("Số lượng cần chọn phải là số nguyên không âm.");
      const available = noRepeat ? items.filter((item) => !selected.has(item)) : [...items];
      const chosen = shuffle(available).slice(0, count);
      if (noRepeat) chosen.forEach((item) => selected.add(item));
      return chosen;
    }

    return {
      chooseOne(items, noRepeat = false) {
        return chooseMany(items, 1, noRepeat)[0] ?? null;
      },
      chooseMany,
      reset() { selected.clear(); },
      hasSelected(item) { return selected.has(item); },
      getSelected() { return [...selected]; },
    };
  }

  const session = createSession();
  global.RandomClass.Random = {
    chooseOne(items) {
      if (!Array.isArray(items)) throw new Error("Danh sách để chọn phải là một mảng.");
      return items.length ? items[randomInteger(0, items.length - 1)] : null;
    },
    chooseMany(items, count) { return createSession().chooseMany(items, count); },
    shuffle,
    randomInteger,
    createSession,
    session,
    resetSession() { session.reset(); },
  };
})(window);
