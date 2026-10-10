(function (global) {
  "use strict";

  const storage = global.RandomClass.Storage;
  let state = storage.load();

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function getActiveList() {
    return state.lists.find((list) => list.id === state.activeListId) || state.lists[0];
  }

  function addStudents(names) {
    if (!Array.isArray(names) || !names.length) throw new Error("Hãy nhập ít nhất một tên học sinh.");
    if (names.some((name) => typeof name !== "string" || !name.trim())) {
      throw new Error("Danh sách nhập có tên không hợp lệ. Mỗi dòng chỉ nhập một tên.");
    }

    const cleanNames = names.map((name) => name.trim());
    const tooLong = cleanNames.find((name) => name.length > 80);
    if (tooLong) throw new Error(`Tên “${tooLong.slice(0, 20)}…” dài quá 80 ký tự.`);

    const active = getActiveList();
    const seen = new Set(active.students.map((student) => student.toLocaleLowerCase()));
    const duplicate = cleanNames.find((name) => {
      const normalized = name.toLocaleLowerCase();
      if (seen.has(normalized)) return true;
      seen.add(normalized);
      return false;
    });
    if (duplicate) throw new Error(`Tên “${duplicate}” bị trùng trong danh sách hiện tại hoặc trong nội dung nhập.`);

    active.students.push(...cleanNames);
    return getState();
  }

  function updateStudent(index, name) {
    const cleanName = String(name).trim();
    const active = getActiveList();
    if (!cleanName) throw new Error("Tên học sinh không được để trống.");
    if (!Number.isInteger(index) || index < 0 || index >= active.students.length) throw new Error("Không tìm thấy học sinh cần sửa.");
    if (active.students.some((student, currentIndex) => currentIndex !== index && student.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      throw new Error(`Tên “${cleanName}” đã có trong danh sách.`);
    }
    active.students[index] = cleanName;
    return getState();
  }

  function removeStudent(index) {
    const active = getActiveList();
    if (!Number.isInteger(index) || index < 0 || index >= active.students.length) throw new Error("Không tìm thấy học sinh cần xóa.");
    active.students.splice(index, 1);
    return getState();
  }

  function clearStudents() {
    getActiveList().students = [];
    return getState();
  }

  function replaceState(nextState) {
    state = nextState;
    storage.save(state);
    return getState();
  }
  global.RandomClass.Data = {
    addStudents, clearStudents, getActiveList, getState, removeStudent, replaceState, updateStudent,
  };
})(window);
