(function (global) {
  "use strict";

  const data = global.RandomClass.Data;
  let toastTimer;
  let resultAction = null;
  let resultFocusTarget = "#spin-button";

  function notify(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.remove("hidden");
    global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(() => toast.classList.add("hidden"), 3200);
  }

  function handleError(error) {
    console.error(error);
    notify(error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.", true);
  }

  function renderStudents() {
    const active = data.getActiveList();
    const list = document.getElementById("student-list");
    list.replaceChildren();
    document.getElementById("class-count").textContent = `${active.students.length} học sinh`;
    document.getElementById("active-list-description").textContent = "Danh sách chỉ lưu tạm trong phiên website và sẽ tự xóa khi đóng hoặc tải lại trang.";
    if (!active.students.length) {
      const empty = document.createElement("li");
      empty.className = "list-empty";
      empty.textContent = "Danh sách trống. Dán nhiều tên vào khung bên dưới để dùng ngay trong các trò chơi.";
      list.append(empty);
    }
    active.students.forEach((student, index) => {
      const item = document.createElement("li");
      item.className = "student-row";
      const number = document.createElement("span");
      number.className = "row-number";
      number.textContent = String(index + 1);
      const input = document.createElement("input");
      input.type = "text";
      input.value = student;
      input.maxLength = 80;
      input.setAttribute("aria-label", `Tên học sinh ${index + 1}`);
      input.addEventListener("change", () => {
        try { data.updateStudent(index, input.value); renderAll(); }
        catch (error) { input.value = data.getActiveList().students[index] || ""; handleError(error); }
      });
      const remove = document.createElement("button");
      remove.className = "icon-button";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Xóa ${student}`);
      remove.addEventListener("click", () => {
        try { data.removeStudent(index); renderAll(); notify(`Đã xóa ${student} khỏi danh sách.`); }
        catch (error) { handleError(error); }
      });
      item.append(number, input, remove);
      list.append(item);
    });
  }

  function renderHistory() {
    const entries = global.RandomClass.History.getAll();
    const list = document.getElementById("history-list");
    list.replaceChildren();
    document.getElementById("history-count").textContent = `${entries.length} lượt`;
    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "list-empty";
      empty.textContent = "Chưa có lượt chơi nào. Kết quả trò chơi sẽ xuất hiện tại đây.";
      list.append(empty);
    }
    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "history-row";
      const icon = document.createElement("span");
      icon.className = "history-icon";
      icon.textContent = "↻";
      const detail = document.createElement("div");
      const result = document.createElement("div");
      result.className = "history-result";
      result.textContent = `${entry.game}: ${entry.results.join(", ")}`;
      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent = entry.listName || "Danh sách lớp";
      detail.append(result, meta);
      const time = document.createElement("time");
      time.className = "history-time";
      const date = new Date(entry.createdAt);
      time.dateTime = entry.createdAt || "";
      time.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
      item.append(icon, detail, time);
      list.append(item);
    });
  }

  function renderAll() {
    renderStudents();
    renderHistory();
    global.RandomClass.Wheel.renderRoster();
    global.RandomClass.MysteryBox.render();
    global.RandomClass.FlipCard.render();
    global.RandomClass.SlotMachine.render();
    global.RandomClass.ScratchCard.render();
    global.RandomClass.TeamGenerator.render();
  }

  function setView(view) {
    const available = ["home", "games", "wheel", "mystery-box", "flip-card", "slot-machine", "scratch-card", "team-generator", "classes", "history"];
    const selected = available.includes(view) ? view : "home";
    document.querySelectorAll("[data-view]").forEach((section) => {
      section.classList.toggle("hidden", section.dataset.view !== selected);
    });
    document.querySelectorAll("[data-view-link]").forEach((link) => {
      const activeView = ["wheel", "mystery-box", "flip-card", "slot-machine", "scratch-card", "team-generator"].includes(selected) ? "games" : selected;
      link.classList.toggle("active", link.dataset.viewLink === activeView);
    });
    if (selected === "wheel") global.RandomClass.Wheel.renderRoster();
    if (selected === "mystery-box") global.RandomClass.MysteryBox.render();
    if (selected === "flip-card") global.RandomClass.FlipCard.render();
    if (selected === "slot-machine") global.RandomClass.SlotMachine.render();
    if (selected === "scratch-card") global.RandomClass.ScratchCard.render();
    if (selected === "team-generator") global.RandomClass.TeamGenerator.render();
    document.getElementById("main-nav").classList.remove("open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    global.scrollTo(0, 0);
  }

  function showResult(name, options = {}) {
    const kicker = document.getElementById("result-kicker");
    document.getElementById("result-title").textContent = name;
    document.getElementById("result-subtitle").textContent = options.subtitle || "Chúc mừng bạn được gọi tên!";
    kicker.textContent = options.kicker || "VÒNG XOAY ĐÃ DỪNG";
    const againButton = document.getElementById("result-again");
    againButton.replaceChildren(document.createTextNode(options.actionLabel || "Chơi lại"));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↻";
    againButton.append(arrow);
    resultAction = typeof options.onAgain === "function" ? options.onAgain : null;
    resultFocusTarget = options.focusTarget || "#spin-button";
    document.querySelector(".result-card").classList.add("celebrating");
    document.getElementById("result-overlay").classList.remove("hidden");
    document.getElementById("result-close").focus();
  }

  function closeResult() {
    document.getElementById("result-overlay").classList.add("hidden");
    document.querySelector(".result-card").classList.remove("celebrating");
    const focusTarget = document.querySelector(resultFocusTarget);
    if (focusTarget && !focusTarget.disabled && focusTarget.offsetParent !== null) focusTarget.focus();
    resultAction = null;
    resultFocusTarget = "#spin-button";
  }

  function bindEvents() {
    global.addEventListener("hashchange", () => setView(global.location.hash.slice(1)));
    document.getElementById("menu-toggle").addEventListener("click", (event) => {
      const nav = document.getElementById("main-nav");
      const open = nav.classList.toggle("open");
      event.currentTarget.setAttribute("aria-expanded", String(open));
    });
    document.getElementById("bulk-student-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("bulk-student-names");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("wheel-add-students-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("wheel-new-students");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách lớp đang hoạt động.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("box-add-students-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("box-new-students");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách lớp đang hoạt động.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("flip-add-students-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("flip-new-students");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách lớp đang hoạt động.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("slot-add-students-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("slot-new-students");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách lớp đang hoạt động.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("scratch-add-students-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("scratch-new-students");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách lớp đang hoạt động.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("team-add-students-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("team-new-students");
      const names = input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      try {
        data.addStudents(names);
        input.value = "";
        renderAll();
        notify(`Đã thêm ${names.length} học sinh vào danh sách lớp đang hoạt động.`);
      } catch (error) { handleError(error); }
    });
    document.getElementById("clear-students").addEventListener("click", () => {
      if (!global.confirm("Xóa toàn bộ tên trong danh sách lớp hiện tại?")) return;
      try { data.clearStudents(); global.RandomClass.Random.resetSession(); renderAll(); notify("Đã xóa toàn bộ học sinh."); }
      catch (error) { handleError(error); }
    });
    document.getElementById("clear-history").addEventListener("click", () => {
      if (!global.confirm("Xóa toàn bộ lịch sử chơi?")) return;
      try { global.RandomClass.History.clear(); renderHistory(); notify("Đã xóa lịch sử."); }
      catch (error) { handleError(error); }
    });
    document.getElementById("spin-button").addEventListener("click", global.RandomClass.Wheel.spin);
    document.getElementById("wheel-duration").addEventListener("change", (event) => {
      try { global.RandomClass.Wheel.setDuration(Number(event.currentTarget.value)); }
      catch (error) { handleError(error); event.currentTarget.value = "5"; }
    });
    document.getElementById("wheel-reset").addEventListener("click", global.RandomClass.Wheel.resetSession);
    document.getElementById("box-start").addEventListener("click", global.RandomClass.MysteryBox.start);
    document.getElementById("box-reset").addEventListener("click", global.RandomClass.MysteryBox.reset);
    document.getElementById("box-no-repeat").addEventListener("change", global.RandomClass.MysteryBox.render);
    document.getElementById("box-sound").addEventListener("change", global.RandomClass.MysteryBox.render);
    document.getElementById("flip-start").addEventListener("click", global.RandomClass.FlipCard.start);
    document.getElementById("flip-random").addEventListener("click", global.RandomClass.FlipCard.flipRandom);
    document.getElementById("flip-back").addEventListener("click", global.RandomClass.FlipCard.flipBack);
    document.getElementById("flip-reset").addEventListener("click", global.RandomClass.FlipCard.reset);
    document.getElementById("flip-no-repeat").addEventListener("change", global.RandomClass.FlipCard.render);
    document.getElementById("flip-sound").addEventListener("change", global.RandomClass.FlipCard.render);
    document.getElementById("slot-spin").addEventListener("click", global.RandomClass.SlotMachine.spin);
    document.getElementById("slot-reset").addEventListener("click", global.RandomClass.SlotMachine.reset);
    document.getElementById("slot-no-repeat").addEventListener("change", global.RandomClass.SlotMachine.render);
    document.getElementById("slot-sound").addEventListener("change", global.RandomClass.SlotMachine.render);
    document.getElementById("scratch-start").addEventListener("click", global.RandomClass.ScratchCard.start);
    document.getElementById("scratch-next").addEventListener("click", global.RandomClass.ScratchCard.next);
    document.getElementById("scratch-reveal").addEventListener("click", global.RandomClass.ScratchCard.reveal);
    document.getElementById("scratch-reset").addEventListener("click", global.RandomClass.ScratchCard.reset);
    document.getElementById("scratch-no-repeat").addEventListener("change", global.RandomClass.ScratchCard.render);
    document.getElementById("scratch-sound").addEventListener("change", global.RandomClass.ScratchCard.render);
    document.getElementById("team-start").addEventListener("click", global.RandomClass.TeamGenerator.generate);
    document.getElementById("team-shuffle").addEventListener("click", global.RandomClass.TeamGenerator.generate);
    document.getElementById("team-reset").addEventListener("click", global.RandomClass.TeamGenerator.reset);
    document.getElementById("team-export").addEventListener("click", global.RandomClass.TeamGenerator.exportResults);
    document.getElementById("team-save-config").addEventListener("click", global.RandomClass.TeamGenerator.saveConfig);
    document.getElementById("team-mode").addEventListener("change", global.RandomClass.TeamGenerator.render);
    document.getElementById("team-size").addEventListener("change", global.RandomClass.TeamGenerator.render);
    document.getElementById("team-sound").addEventListener("change", global.RandomClass.TeamGenerator.render);
    document.getElementById("result-close").addEventListener("click", closeResult);
    document.getElementById("result-again").addEventListener("click", () => {
      const action = resultAction;
      closeResult();
      global.requestAnimationFrame(action || global.RandomClass.Wheel.spin);
    });
    document.getElementById("result-overlay").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeResult();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.getElementById("result-overlay").classList.contains("hidden")) closeResult();
    });
  }

  global.RandomClass = global.RandomClass || {};
  global.RandomClass.App = { handleError, notify, renderAll, renderHistory, setView, showResult };
  try {
    bindEvents();
    renderAll();
    setView(global.location.hash.slice(1) || "home");
  } catch (error) {
    handleError(error);
  }
})(window);
