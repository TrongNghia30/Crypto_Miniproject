import { ALPHABET, playfairMatrix, railAt } from "./shared/normalize.js";

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function table(container, rows) {
  const node = element("table", undefined, "trace-table");
  for (const [label, values] of rows) {
    const row = element("tr");
    const heading = element("th", label);
    heading.scope = "row";
    row.append(heading);
    for (const value of values) row.append(element("td", value));
    node.append(row);
  }
  container.append(node);
}

export function renderVisualization(container, note, cipher, mode, data) {
  container.replaceChildren();
  const text = data.prepared_text;
  const key = data.normalized_key;
  const output = data.result;
  const limit = Math.min(text.length, cipher === "rail" ? 32 : 12);
  const sample = [...text.slice(0, limit)];
  note.textContent = `Minh họa ${limit}/${text.length} chữ cái đầu. ${mode === "encrypt" ? "Chiều mã hóa." : "Chiều giải mã."}`;
  if (cipher === "caesar" || cipher === "vigenere" || cipher === "otp") {
    container.append(
      element(
        "div",
        mode === "encrypt" ? "C = (P + K) mod 26" : "P = (C − K) mod 26",
        "formula",
      ),
    );
    table(container, [
      ["Đầu vào", sample],
      ["Giá trị", sample.map((char) => ALPHABET.indexOf(char))],
      [
        "Độ dịch K",
        sample.map((_, i) =>
          cipher === "caesar" ? key : ALPHABET.indexOf(key[i % key.length]),
        ),
      ],
      ["Kết quả", [...output.slice(0, limit)]],
    ]);
  } else if (cipher === "mono") {
    table(container, [
      ["A–Z", [...ALPHABET]],
      ["Khóa", [...key]],
    ]);
    table(container, [
      ["Đầu vào", sample],
      ["Kết quả", [...output.slice(0, limit)]],
    ]);
  } else if (cipher === "playfair") {
    const wrapper = element("div", undefined, "matrix-and-pairs");
    const matrix = element("div", undefined, "matrix");
    matrix.setAttribute("aria-label", "Ma trận Playfair 5 × 5");
    for (const char of playfairMatrix(key))
      matrix.append(element("span", char));
    wrapper.append(matrix);
    const pairs = element("div", undefined, "pair-flow");
    for (let i = 0; i < limit; i += 2) {
      const pair = element("div", undefined, "pair");
      pair.append(
        element("span", text.slice(i, i + 2)),
        element("span", "→"),
        element("b", output.slice(i, i + 2)),
      );
      pairs.append(pair);
    }
    wrapper.append(pairs);
    container.append(wrapper);
    note.textContent += " J→I. Bản rõ giải mã giữ nguyên X/Q đệm.";
  } else {
    const rails = Number(key);
    // For decrypt, display the reconstructed plaintext along the zigzag path.
    const pathText = mode === "encrypt" ? text : output;
    const visibleRows = Math.min(rails, limit);
    const grid = element("div", undefined, "rail-grid");
    grid.style.gridTemplateColumns = `repeat(${limit}, 24px)`;
    grid.setAttribute("aria-label", "Đường zigzag của bản rõ");
    for (let row = 0; row < visibleRows; row++) {
      for (let i = 0; i < limit; i++) {
        const occupied = railAt(i, rails) === row;
        grid.append(
          element(
            "span",
            occupied ? pathText[i] : "·",
            occupied ? "rail-letter" : "",
          ),
        );
      }
    }
    container.append(
      grid,
      element(
        "div",
        `Bản mã (đọc theo hàng): ${mode === "encrypt" ? output.slice(0, 40) : text.slice(0, 40)}${text.length > 40 ? "…" : ""}`,
        "rail-summary",
      ),
    );
    note.textContent += ` ${rails} rail; hiển thị ${visibleRows} hàng có thể xuất hiện trong đoạn đầu.`;
  }
}

export function clearVisualization(container, note) {
  container.replaceChildren(
    element("div", "A  B  C  · · ·  X  Y  Z", "visual-placeholder"),
  );
  note.textContent = "Minh họa xuất hiện sau khi bạn xử lý một thông điệp.";
}
