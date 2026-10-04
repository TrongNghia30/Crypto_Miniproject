import { catalog } from "./catalog.js";
import { normalizeText, MAX_LENGTH } from "./shared/normalize.js";
import { validateProcess, ValidationError } from "./shared/validation.js";
import { renderVisualization, clearVisualization } from "./visualization.js";

const $ = (id) => document.getElementById(id);
const text = $("text"),
  key = $("key"),
  result = $("result");
let cipher = "caesar";
let busy = false;
let revision = 0;
let currentResult = null;
const mode = () => document.querySelector('input[name="mode"]:checked').value;
const resultActions = ["copy", "download", "reuse"];

for (const [id, item] of Object.entries(catalog)) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-item";
  button.dataset.cipher = id;
  const glyph = document.createElement("span");
  glyph.className = "nav-glyph";
  glyph.textContent = item.glyph;
  glyph.setAttribute("aria-hidden", "true");
  const labels = document.createElement("span");
  const name = document.createElement("span");
  name.className = "nav-name";
  name.textContent = item.short;
  const type = document.createElement("span");
  type.className = "nav-type";
  type.textContent = item.type;
  labels.append(name, type);
  const arrow = document.createElement("span");
  arrow.className = "nav-arrow";
  arrow.textContent = "›";
  arrow.setAttribute("aria-hidden", "true");
  button.append(glyph, labels, arrow);
  button.addEventListener("click", () => selectCipher(id));
  $("cipher-nav").append(button);
  const option = document.createElement("option");
  option.value = id;
  option.textContent = item.name;
  $("cipher-select").append(option);
}

function announce(message = "", error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

function clearErrors() {
  for (const field of [text, key]) {
    field.removeAttribute("aria-invalid");
    $(`${field.id}-error`).textContent = "";
  }
}

function showError(error) {
  const field = error.field === "text_length" ? "text" : error.field;
  if (["text", "key"].includes(field)) {
    $(field).setAttribute("aria-invalid", "true");
    $(`${field}-error`).textContent = error.message;
    $(field).focus();
  }
  announce(error.message, true);
}

function invalidate() {
  revision++;
  currentResult = null;
  result.value = "";
  result.hidden = true;
  $("empty-state").hidden = false;
  $("result-count").textContent = "0 chữ cái";
  $("result-badge").textContent = "Đang chờ";
  $("result-badge").classList.remove("ready");
  resultActions.forEach((id) => ($(id).disabled = true));
  clearVisualization($("visualization"), $("visualization-note"));
  clearErrors();
  announce();
}

function preview() {
  const normalized = normalizeText(text.value);
  const effective =
    cipher === "playfair" ? normalized.replace(/J/g, "I") : normalized;
  $("text-count").textContent =
    `${text.value.length.toLocaleString("vi-VN")} / 10.000`;
  $("normalized-count").textContent =
    `${effective.length.toLocaleString("vi-VN")} chữ cái`;
  $("text-preview").textContent = effective || "Chưa có văn bản";
  const numeric = ["caesar", "rail"].includes(cipher);
  let normalizedKey = numeric ? key.value.trim() : normalizeText(key.value);
  if (cipher === "playfair") normalizedKey = normalizedKey.replace(/J/g, "I");
  if (
    cipher === "caesar" &&
    /^[+-]?\d+$/.test(normalizedKey) &&
    Number.isSafeInteger(Number(normalizedKey))
  ) {
    normalizedKey = String(((Number(normalizedKey) % 26) + 26) % 26);
  }
  $("key-preview").textContent = normalizedKey || "—";
}

function refreshMode() {
  const decrypt = mode() === "decrypt";
  $("text-label").textContent = decrypt ? "Bản mã cần giải mã" : "Văn bản gốc";
  $("submit-label").textContent = busy
    ? "Đang xử lý…"
    : decrypt
      ? "Giải mã thông điệp"
      : "Mã hóa thông điệp";
  $("normalization-rule").textContent =
    "Bỏ dấu tiếng Việt, viết hoa, chỉ giữ A–Z." +
    (cipher === "playfair" ? " Gộp J→I." : "");
  $("result-note").textContent =
    cipher === "playfair"
      ? "Playfair giữ X/Q đệm khi giải mã và không thể khôi phục J, dấu hoặc khoảng trắng đã loại bỏ."
      : cipher === "otp"
        ? "Mô phỏng giáo dục. Giữ khóa bí mật, chỉ dùng một lần. Khóa sinh bằng máy tính không bảo đảm tính ngẫu nhiên tuyệt đối."
        : decrypt
          ? "Giải mã trả lại văn bản chuẩn hóa; dấu, khoảng trắng và ký tự đã bỏ không thể khôi phục."
          : "Kết quả được tính bằng thuật toán trên máy chủ. Văn bản và khóa không được lưu lại.";
}

function selectCipher(id) {
  cipher = id;
  const item = catalog[id];
  $("cipher-select").value = id;
  document
    .querySelectorAll(".nav-item")
    .forEach((button) =>
      button.setAttribute("aria-current", String(button.dataset.cipher === id)),
    );
  $("cipher-title").textContent = item.name;
  $("breadcrumb-name").textContent = item.short;
  $("cipher-description").textContent = item.description;
  $("cipher-tag").textContent = item.tag;
  $("key-label").textContent = item.keyLabel;
  $("key-hint").textContent = item.hint;
  $("key").placeholder = item.placeholder;
  key.inputMode = id === "rail" ? "numeric" : "text";
  $("generate").hidden = !["mono", "otp"].includes(id);
  $("explanation-rule").textContent = item.rule;
  key.value = "";
  invalidate();
  preview();
  refreshMode();
}

function setBusy(value) {
  busy = value;
  $("submit").disabled = value;
  $("generate").disabled = value;
  $("cipher-form").setAttribute("aria-busy", String(value));
  refreshMode();
}

async function request(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Máy chủ trả về dữ liệu không hợp lệ. Hãy thử lại.");
    }
    if (!response.ok) {
      if (data.error && typeof data.error.message === "string")
        throw new ValidationError(
          data.error.message,
          data.error.field,
          data.error.code,
        );
      throw new Error("Máy chủ không thể xử lý yêu cầu.");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error("Yêu cầu quá thời gian chờ. Hãy thử lại.");
    if (error instanceof TypeError)
      throw new Error(
        "Không thể kết nối máy chủ. Kiểm tra kết nối và thử lại.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

$("cipher-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  clearErrors();
  const payload = {
    cipher_type: cipher,
    text: text.value,
    key: key.value,
    mode: mode(),
  };
  try {
    validateProcess(payload);
  } catch (error) {
    invalidate();
    showError(error);
    return;
  }
  invalidate();
  const savedRevision = revision;
  setBusy(true);
  announce("Đang xử lý thông điệp…");
  try {
    const data = await request("/api/process", payload);
    if (savedRevision !== revision) return;
    if (
      data.status !== "success" ||
      !["result", "normalized_text", "prepared_text", "normalized_key"].every(
        (name) => typeof data[name] === "string",
      )
    ) {
      throw new Error("Kết quả từ máy chủ không hợp lệ.");
    }
    currentResult = data;
    result.value = data.result;
    result.hidden = false;
    $("empty-state").hidden = true;
    $("result-count").textContent =
      `${data.result.length.toLocaleString("vi-VN")} chữ cái`;
    $("result-badge").textContent = "Hoàn tất";
    $("result-badge").classList.add("ready");
    resultActions.forEach((id) => ($(id).disabled = false));
    renderVisualization(
      $("visualization"),
      $("visualization-note"),
      cipher,
      payload.mode,
      data,
    );
    announce(
      payload.mode === "encrypt"
        ? "Đã mã hóa thành công."
        : "Đã giải mã thành công.",
    );
  } catch (error) {
    if (savedRevision === revision) showError(error);
  } finally {
    setBusy(false);
  }
});

$("generate").addEventListener("click", async () => {
  if (busy) return;
  clearErrors();
  const length = normalizeText(text.value).length;
  if (
    cipher === "otp" &&
    (text.value.length > MAX_LENGTH || length < 1 || length > MAX_LENGTH)
  ) {
    showError(
      new ValidationError(
        "Nhập văn bản có 1–10.000 chữ cái sau chuẩn hóa và tối đa 10.000 ký tự gốc.",
        "text",
      ),
    );
    return;
  }
  invalidate();
  const savedRevision = revision;
  setBusy(true);
  announce("Đang tạo khóa…");
  try {
    const data = await request("/api/generate_key", {
      cipher_type: cipher,
      text_length: length,
    });
    if (savedRevision !== revision) return;
    if (typeof data.key !== "string")
      throw new Error("Khóa từ máy chủ không hợp lệ.");
    key.value = data.key;
    preview();
    announce("Đã tạo khóa mới.");
  } catch (error) {
    if (savedRevision === revision) showError(error);
  } finally {
    setBusy(false);
  }
});

$("example").addEventListener("click", () => {
  [text.value, key.value] = catalog[cipher].example;
  document.querySelector('input[value="encrypt"]').checked = true;
  invalidate();
  preview();
  refreshMode();
  announce("Đã nạp ví dụ. Chọn mã hóa để kiểm chứng.");
});
$("cipher-select").addEventListener("change", (event) =>
  selectCipher(event.target.value),
);
for (const field of [text, key])
  field.addEventListener("input", () => {
    invalidate();
    preview();
  });
document.querySelectorAll('input[name="mode"]').forEach((radio) =>
  radio.addEventListener("change", () => {
    invalidate();
    refreshMode();
  }),
);
$("clear").addEventListener("click", () => {
  text.value = "";
  key.value = "";
  invalidate();
  preview();
  text.focus();
});
$("reuse").addEventListener("click", () => {
  if (!currentResult) return;
  const data = currentResult;
  text.value = data.result;
  key.value = data.normalized_key;
  document.querySelector(
    `input[value="${mode() === "encrypt" ? "decrypt" : "encrypt"}"]`,
  ).checked = true;
  invalidate();
  preview();
  refreshMode();
  text.focus();
  announce("Đã chuyển kết quả sang đầu vào và đổi chiều xử lý.");
});
$("copy").addEventListener("click", async () => {
  if (!currentResult) return;
  try {
    await navigator.clipboard.writeText(currentResult.result);
    announce("Đã sao chép kết quả.");
  } catch {
    result.focus();
    result.select();
    announce(
      "Không thể truy cập clipboard. Kết quả đã được chọn; nhấn Ctrl+C hoặc sao chép thủ công.",
      true,
    );
  }
});
$("download").addEventListener("click", () => {
  if (!currentResult) return;
  const url = URL.createObjectURL(
    new Blob([currentResult.result], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${cipher}-${mode()}.txt`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce("Đã tải kết quả TXT.");
});
selectCipher("caesar");
