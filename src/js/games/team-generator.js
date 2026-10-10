(function (global) {
  "use strict";

  const data = global.RandomClass.Data;
  const configKey = "random-class-team-generator-config-v1";
  const gameName = "Chia nhóm tự động";
  let groups = [];
  let rosterSignature = "";
  let generating = false;
  let generationTimer = 0;
  let generationToken = 0;
  let configLoaded = false;
  let audioContext = null;

  function getGameData() {
    const active = data.getActiveList();
    if (!active || typeof active.id !== "string" || !active.id
      || typeof active.name !== "string" || !active.name.trim()
      || !Array.isArray(active.students)) {
      throw new Error("Danh sách lớp hiện tại không hợp lệ.");
    }
    const students = active.students.map((student) => {
      if (typeof student !== "string" || !student.trim()) {
        throw new Error("Danh sách có tên học sinh không hợp lệ. Hãy sửa hoặc xóa dữ liệu lỗi trước khi chia nhóm.");
      }
      return student.trim();
    });
    if (new Set(students.map((student) => student.toLocaleLowerCase())).size !== students.length) {
      throw new Error("Danh sách có tên học sinh trùng nhau. Hãy sửa danh sách trước khi chia nhóm.");
    }
    return { id: active.id, name: active.name.trim(), students };
  }

  function loadConfig() {
    if (configLoaded) return;
    configLoaded = true;
    const raw = global.localStorage.getItem(configKey);
    if (raw === null) return;

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      throw new Error("Không đọc được cấu hình chia nhóm đã lưu. Hãy lưu cấu hình mới để thay thế.");
    }
    if (!saved || !["groups", "members"].includes(saved.mode)
      || !Number.isInteger(saved.size) || saved.size < 1 || saved.size > 999
      || typeof saved.sound !== "boolean") {
      throw new Error("Cấu hình chia nhóm đã lưu không hợp lệ. Hãy lưu cấu hình mới để thay thế.");
    }
    document.getElementById("team-mode").value = saved.mode;
    document.getElementById("team-size").value = String(saved.size);
    document.getElementById("team-sound").checked = saved.sound;
  }

  function getRequestedSize(studentCount) {
    const input = document.getElementById("team-size");
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 1 || value > studentCount) {
      throw new Error(`Hãy nhập số từ 1 đến ${studentCount}.`);
    }
    return value;
  }

  function getPlan(studentCount, mode, size) {
    if (!studentCount) return { groupCount: 0, description: "Chưa có học sinh." };
    if (mode === "groups") {
      const groupCount = Math.min(size, studentCount);
      return {
        groupCount,
        description: groupCount === size
          ? `${groupCount} nhóm, mỗi nhóm ${Math.floor(studentCount / groupCount)}–${Math.ceil(studentCount / groupCount)} học sinh.`
          : `Sĩ số ${studentCount} chỉ đủ tạo ${groupCount} nhóm; mỗi nhóm có 1 học sinh.`,
      };
    }
    const groupCount = Math.ceil(studentCount / size);
    return {
      groupCount,
      description: `${groupCount} nhóm, tối đa ${size} học sinh mỗi nhóm; kích thước được cân bằng nhất có thể.`,
    };
  }

  function renderRoster(students) {
    const list = document.getElementById("team-roster");
    list.replaceChildren();
    if (!students.length) {
      const empty = document.createElement("li");
      empty.className = "roster-empty";
      empty.textContent = "Danh sách đang trống. Nhập tên ở phía trên để bắt đầu.";
      list.append(empty);
      return;
    }
    students.forEach((student, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.className = "roster-number";
      number.textContent = String(index + 1);
      const name = document.createElement("span");
      name.textContent = student;
      item.append(number, name);
      list.append(item);
    });
  }

  function createMemberCard(student, groupIndex) {
    const member = document.createElement("li");
    member.className = "team-member";
    member.draggable = !generating;
    member.dataset.student = student;

    const name = document.createElement("span");
    name.className = "team-member-name";
    name.textContent = student;

    const moveLabel = document.createElement("label");
    moveLabel.className = "team-move-label";
    const labelText = document.createElement("span");
    labelText.className = "sr-only";
    labelText.textContent = `Chuyển ${student} sang nhóm`;
    const select = document.createElement("select");
    select.className = "team-move-select";
    select.setAttribute("aria-label", `Chuyển ${student} sang nhóm`);
    select.disabled = generating;
    groups.forEach((_, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Nhóm ${index + 1}`;
      option.selected = index === groupIndex;
      select.append(option);
    });
    select.addEventListener("change", () => moveStudent(student, Number(select.value)));
    moveLabel.append(labelText, select);
    member.append(name, moveLabel);
    member.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", student);
      event.dataTransfer.effectAllowed = "move";
      member.classList.add("is-dragging");
    });
    member.addEventListener("dragend", () => member.classList.remove("is-dragging"));
    return member;
  }

  function renderGroups(animate = false) {
    const container = document.getElementById("team-results");
    container.replaceChildren();
    if (!groups.length) {
      const empty = document.createElement("p");
      empty.className = "team-empty";
      empty.textContent = "Các nhóm sẽ xuất hiện tại đây sau khi bắt đầu chia.";
      container.append(empty);
      return;
    }

    groups.forEach((students, groupIndex) => {
      const section = document.createElement("section");
      section.className = "team-group";
      section.dataset.groupIndex = String(groupIndex);
      if (animate) {
        section.classList.add("team-group-enter");
        section.style.setProperty("--team-delay", `${Math.min(groupIndex * 55, 550)}ms`);
      }
      const heading = document.createElement("div");
      heading.className = "team-group-heading";
      const title = document.createElement("h3");
      title.textContent = `Nhóm ${groupIndex + 1}`;
      const count = document.createElement("span");
      count.textContent = `${students.length} thành viên`;
      heading.append(title, count);
      const list = document.createElement("ul");
      list.className = "team-member-list";
      list.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        section.classList.add("is-drop-target");
      });
      list.addEventListener("dragleave", (event) => {
        if (!section.contains(event.relatedTarget)) section.classList.remove("is-drop-target");
      });
      list.addEventListener("drop", (event) => {
        event.preventDefault();
        section.classList.remove("is-drop-target");
        moveStudent(event.dataTransfer.getData("text/plain"), groupIndex);
      });
      students.forEach((student) => list.append(createMemberCard(student, groupIndex)));
      section.append(heading, list);
      container.append(section);
    });
  }

  function updateControls(students) {
    const canPlay = students.length > 0 && !generating;
    document.getElementById("team-start").disabled = !canPlay;
    document.getElementById("team-shuffle").disabled = !canPlay || groups.length === 0;
    document.getElementById("team-reset").disabled = generating || groups.length === 0;
    document.getElementById("team-export").disabled = groups.length === 0;
    document.getElementById("team-mode").disabled = generating;
    document.getElementById("team-size").disabled = generating;
    document.getElementById("team-sound").disabled = generating;
    document.getElementById("team-new-students").disabled = generating;
    document.querySelector("#team-add-students-form button[type='submit']").disabled = generating;
    document.getElementById("team-save-config").disabled = generating;
    document.getElementById("team-start").textContent = generating
      ? "ĐANG CHIA..."
      : groups.length ? "CHIA LẠI" : "BẮT ĐẦU CHIA";
    document.getElementById("team-game-status").textContent = generating
      ? "Đang chia..."
      : !students.length ? "Chờ danh sách"
        : groups.length ? "Đã chia nhóm" : "Sẵn sàng";
  }

  function render() {
    try {
      loadConfig();
      const active = getGameData();
      const signature = JSON.stringify([active.id, active.students]);
      if (signature !== rosterSignature) {
        global.clearTimeout(generationTimer);
        generationTimer = 0;
        generationToken += 1;
        generating = false;
        groups = [];
        rosterSignature = signature;
        document.getElementById("team-hint").textContent = active.students.length
          ? "Sẵn sàng chia nhóm. Mỗi học sinh sẽ được phân đúng một lần."
          : "Hãy thêm ít nhất một học sinh để bắt đầu chia nhóm.";
        renderGroups();
      }
      document.getElementById("team-active-list").textContent = active.name;
      document.getElementById("team-student-count").textContent = `${active.students.length} học sinh`;
      const sizeInput = document.getElementById("team-size");
      const max = Math.max(1, active.students.length);
      sizeInput.max = active.students.length ? String(max) : "999";
      if (active.students.length && Number(sizeInput.value) > max) sizeInput.value = String(max);
      document.getElementById("team-size-label").textContent = document.getElementById("team-mode").value === "groups"
        ? "Số nhóm"
        : "Thành viên mỗi nhóm";
      const requestedSize = Number(sizeInput.value);
      const validSize = Number.isInteger(requestedSize) && requestedSize >= 1
        && requestedSize <= (active.students.length || 999);
      const plan = validSize
        ? getPlan(active.students.length, document.getElementById("team-mode").value, requestedSize)
        : null;
      document.getElementById("team-config-status").textContent = active.students.length
        ? plan
          ? `${plan.description} Mỗi học sinh xuất hiện đúng một lần trong một lượt.`
          : `Hãy nhập số nguyên từ 1 đến ${active.students.length}. Mỗi học sinh chỉ xuất hiện một lần trong một lượt.`
        : "Mỗi học sinh sẽ xuất hiện đúng một lần trong mỗi lượt chia.";
      renderRoster(active.students);
      updateControls(active.students);
    } catch (error) {
      global.clearTimeout(generationTimer);
      generationTimer = 0;
      generationToken += 1;
      generating = false;
      groups = [];
      rosterSignature = "";
      const roster = document.getElementById("team-roster");
      roster.replaceChildren();
      const errorItem = document.createElement("li");
      errorItem.className = "roster-empty roster-error";
      errorItem.textContent = error.message;
      roster.append(errorItem);
      document.getElementById("team-active-list").textContent = "Không khả dụng";
      document.getElementById("team-student-count").textContent = "Dữ liệu lỗi";
      document.getElementById("team-hint").textContent = error.message;
      document.getElementById("team-config-status").textContent = "Không thể chia nhóm khi danh sách có dữ liệu lỗi.";
      renderGroups();
      updateControls([]);
      document.getElementById("team-game-status").textContent = "Kiểm tra dữ liệu";
      global.RandomClass.App.handleError(error);
    }
  }

  function distribute(students, groupCount) {
    const shuffled = global.RandomClass.Random.shuffle(students);
    const baseSize = Math.floor(shuffled.length / groupCount);
    const remainder = shuffled.length % groupCount;
    const result = [];
    let offset = 0;
    for (let index = 0; index < groupCount; index += 1) {
      const groupSize = baseSize + (index < remainder ? 1 : 0);
      result.push(shuffled.slice(offset, offset + groupSize));
      offset += groupSize;
    }
    return result;
  }

  function playSound(groupCount) {
    const AudioContextConstructor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextConstructor) {
      global.RandomClass.App.handleError(new Error("Trình duyệt này không hỗ trợ âm thanh."));
      return;
    }
    try {
      audioContext = audioContext || new AudioContextConstructor();
      audioContext.resume().then(() => {
        for (let index = 0; index < Math.min(groupCount, 8); index += 1) {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const start = audioContext.currentTime + index * 0.09;
          oscillator.type = "sine";
          oscillator.frequency.value = 320 + index * 45;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.09, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.19);
        }
      }).catch((error) => global.RandomClass.App.handleError(error));
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function generate() {
    if (generating) return;
    try {
      const active = getGameData();
      if (!active.students.length) throw new Error("Hãy thêm ít nhất một học sinh trước khi chia nhóm.");
      const mode = document.getElementById("team-mode").value;
      if (!["groups", "members"].includes(mode)) throw new Error("Kiểu chia nhóm không hợp lệ.");
      const size = getRequestedSize(active.students.length);
      const plan = getPlan(active.students.length, mode, size);
      groups = distribute(active.students, plan.groupCount);
      const token = ++generationToken;
      generating = true;
      renderGroups(true);
      document.getElementById("team-hint").textContent = "Đang xếp học sinh vào các nhóm...";
      updateControls(active.students);
      if (document.getElementById("team-sound").checked) playSound(groups.length);

      generationTimer = global.setTimeout(() => {
        if (token !== generationToken) return;
        generating = false;
        document.querySelectorAll("#team-results .team-member").forEach((member) => {
          member.draggable = true;
        });
        document.querySelectorAll("#team-results .team-move-select").forEach((select) => {
          select.disabled = false;
        });
        document.getElementById("team-hint").textContent = `Đã chia ${active.students.length} học sinh thành ${groups.length} nhóm. Có thể kéo thả hoặc dùng menu để đổi nhóm.`;
        updateControls(active.students);
        try {
          global.RandomClass.History.add({
            game: gameName,
            listName: active.name,
            results: groups.map((members, index) => `Nhóm ${index + 1}: ${members.join(", ")}`),
          });
        } catch (error) {
          global.RandomClass.App.handleError(error);
        }
      }, Math.min(1100, 550 + groups.length * 55));
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function moveStudent(student, targetIndex) {
    if (generating || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= groups.length) return;
    const sourceIndex = groups.findIndex((group) => group.includes(student));
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    groups[sourceIndex] = groups[sourceIndex].filter((name) => name !== student);
    groups[targetIndex] = [...groups[targetIndex], student];
    renderGroups();
    document.getElementById("team-hint").textContent = `${student} đã được chuyển sang Nhóm ${targetIndex + 1}.`;
  }

  function reset() {
    if (generating) return;
    groups = [];
    document.getElementById("team-hint").textContent = "Đã đặt lại kết quả. Có thể chia lại với cấu hình hiện tại.";
    renderGroups();
    render();
  }

  function saveConfig() {
    try {
      const active = getGameData();
      const mode = document.getElementById("team-mode").value;
      if (!["groups", "members"].includes(mode)) throw new Error("Kiểu chia nhóm không hợp lệ.");
      const size = Number(document.getElementById("team-size").value);
      if (!Number.isInteger(size) || size < 1 || size > 999) {
        throw new Error("Hãy nhập một số nguyên từ 1 đến 999 cho cấu hình chia nhóm.");
      }
      global.localStorage.setItem(configKey, JSON.stringify({
        mode,
        size,
        sound: document.getElementById("team-sound").checked,
      }));
      global.RandomClass.App.notify("Đã lưu cấu hình chia nhóm trên thiết bị này.");
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function exportResults() {
    if (!groups.length) {
      global.RandomClass.App.handleError(new Error("Hãy chia nhóm trước khi xuất kết quả."));
      return;
    }
    try {
      const rows = [["Nhóm", "Học sinh"]];
      groups.forEach((members, index) => {
        members.forEach((student) => rows.push([`Nhóm ${index + 1}`, student]));
      });
      const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = global.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "random-class-chia-nhom.csv";
      link.click();
      global.setTimeout(() => global.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  global.RandomClass.TeamGenerator = { exportResults, generate, render, reset, saveConfig };
})(window);
