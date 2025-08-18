(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: reader.result });
      reader.onerror = reject;
      reader.readAsText(file);
    });

  function extractJsonItems(text) {
    const results = [];
    if (!text) return results;
    const regex = /\[[\s\S]*?\]|\{[\s\S]*?\}/g;
    const matches = text.match(regex);
    if (!matches) return results;

    for (let m of matches) {
      try {
        const cleaned = m.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) results.push(...parsed);
        else results.push(parsed);
      } catch (e) {
        console.warn("Skip malformed JSON block:", e.message);
      }
    }
    return results;
  }

  function findEntryDateKey(obj) {
    if (!obj) return null;
    const keys = Object.keys(obj);
    for (const k of keys) {
      const lk = k.toLowerCase();
      if (lk.includes("entry") && lk.includes("date")) return k;
    }
    for (const k of keys) {
      const lk = k.toLowerCase();
      if (
        lk.includes("date") ||
        lk.includes("time") ||
        lk.includes("timestamp")
      )
        return k;
    }
    return null;
  }

  function toTimestamp(val) {
    if (val == null) return NaN;
    if (typeof val === "number") return val;
    if (/^\d+$/.test(String(val).trim())) return parseInt(val);
    const p = Date.parse(String(val));
    return isNaN(p) ? NaN : p;
  }

  async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return [];
    $("status").textContent = `Đang đọc ${fileList.length} file...`;
    try {
      const readers = Array.from(fileList).map(readFileAsText);
      const contents = await Promise.all(readers);
      const all = [];
      for (const c of contents) {
        const items = extractJsonItems(c.text);
        if (items.length === 0) console.warn("No JSON blocks found in", c.name);
        all.push(...items);
      }
      $(
        "status"
      ).textContent = `✅ Loaded ${all.length} trades từ ${fileList.length} file(s).`;
      return all;
    } catch (err) {
      console.error(err);
      $("status").textContent = `❌ Lỗi khi đọc file: ${err.message || err}`;
      return [];
    }
  }

  function computeSummaries(trades) {
    const summaries = {
      bySymbol: {},
      rrByMonthTop: {},
      monthsSet: new Set(),
      yearsSet: new Set(),
    };

    for (const t of trades) {
      const dKey = findEntryDateKey(t);
      const ts = dKey ? toTimestamp(t[dKey]) : NaN;
      if (isNaN(ts)) continue;
      const d = new Date(ts);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const yearKey = d.getFullYear();
      summaries.monthsSet.add(monthKey);
      summaries.yearsSet.add(yearKey);

      const rr = parseFloat(t["Actual RR"]) || 0;
      const symbol = t["Symbol"] || "N/A";

      summaries.bySymbol[symbol] = (summaries.bySymbol[symbol] || 0) + rr;

      summaries.rrByMonthTop[monthKey] = summaries.rrByMonthTop[monthKey] || {};
      summaries.rrByMonthTop[monthKey][symbol] =
        (summaries.rrByMonthTop[monthKey][symbol] || 0) + rr;
    }
    return summaries;
  }

  function render(trades, selectedYear = "", selectedMonth = "") {
    if (!Array.isArray(trades) || trades.length === 0) {
      $("tableContainer").innerHTML = "<p>Không có dữ liệu hợp lệ.</p>";
      return;
    }
    window.allTradesRaw = trades;

    const summaries = computeSummaries(trades);
    let html = "";

    // ✅ Global filter Năm + Tháng
    const years = Array.from(summaries.yearsSet).sort((a, b) => a - b);
    const monthsForSelectedYear = Array.from(summaries.monthsSet)
      .filter((m) => !selectedYear || m.startsWith(selectedYear))
      .sort();

    html += `<div style="margin-bottom:15px;">
                    <label><b>📅 Năm:</b></label>
                    <select id="yearFilter">
                        <option value="">-- Tất cả --</option>
                        ${years
                          .map(
                            (y) =>
                              `<option value="${y}" ${
                                y == selectedYear ? "selected" : ""
                              }>${y}</option>`
                          )
                          .join("")}
                    </select>
                    <label style="margin-left:10px;"><b>📆 Tháng:</b></label>
                    <select id="monthFilter">
                        <option value="">-- Tất cả --</option>
                        ${monthsForSelectedYear
                          .map((m) => {
                            const monthName = m.split("-")[1];
                            return `<option value="${m}" ${
                              m === selectedMonth ? "selected" : ""
                            }>${m}</option>`;
                          })
                          .join("")}
                    </select>
                 </div>`;

    // ✅ Thống kê tổng theo coin (không filter)
    const symbolsSorted = Object.keys(summaries.bySymbol).sort(
      (a, b) => summaries.bySymbol[b] - summaries.bySymbol[a]
    );
    html += "<h2>💰 Thống kê RR theo Coin (Toàn bộ dữ liệu)</h2>";
    html += "<table><tr><th>Coin</th><th>Total Actual RR</th></tr>";
    let grandSym = 0;
    for (const s of symbolsSorted) {
      const v = summaries.bySymbol[s];
      grandSym += v;
      html += `<tr><td>${s}</td><td>${v.toFixed(3)}</td></tr>`;
    }
    html += `<tr><td style="font-weight:bold;">Tổng cộng</td><td style="font-weight:bold;">${grandSym.toFixed(
      3
    )}</td></tr></table><br/>`;

    // ✅ Chi tiết theo tháng
    const months = monthsForSelectedYear.filter(
      (m) => !selectedMonth || m === selectedMonth
    );
    html += "<h2>🗓️ Thống kê theo tháng (Chi tiết)</h2>";
    for (const m of months) {
      html += `<h3>📅 ${m}</h3>`;
      const rows = trades.filter((t) => {
        const k = findEntryDateKey(t);
        const ts = k ? toTimestamp(t[k]) : NaN;
        if (isNaN(ts)) return false;
        const d = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        return key === m;
      });

      const uniqueCoins = [
        ...new Set(rows.map((r) => r["Symbol"] || "N/A")),
      ].sort();

      // ✅ Dropdown filter coin trong tháng
      html += `<div style="margin-bottom:10px;">
                        <label><b>🎯 Coin:</b></label>
                        <select class="coinSelector" data-month="${m}">
                            <option value="">-- Tất cả --</option>
                            ${uniqueCoins
                              .map((c) => `<option value="${c}">${c}</option>`)
                              .join("")}
                        </select>
                     </div>`;

      if (rows.length === 0) {
        html += "<p>Không có trade cho tháng này.</p>";
        continue;
      }

      // ✅ Bảng chi tiết
      html +=
        "<table><tr>" +
        Object.keys(rows[0])
          .map((c) => `<th>${c}</th>`)
          .join("") +
        "</tr>";
      let groupRR = 0;
      for (const r of rows) {
        html +=
          "<tr>" +
          Object.keys(r)
            .map((col) => {
              let value = r[col];
              if (col.toLowerCase().includes("date")) {
                const ts = toTimestamp(value);
                value = isNaN(ts) ? value : new Date(ts).toLocaleString();
              }
              return `<td>${value}</td>`;
            })
            .join("") +
          "</tr>";
        groupRR += parseFloat(r["Actual RR"]) || 0;
      }
      const colSpan = Object.keys(rows[0]).length;
      html += `<tr><td colspan="${colSpan}" style="font-weight:bold; text-align:right;">📊 Total Actual RR: ${groupRR.toFixed(
        3
      )}</td></tr></table>`;

      // ✅ Top 20 coin trong tháng
      const coinRR = summaries.rrByMonthTop[m];
      const topCoins = Object.keys(coinRR)
        .sort((a, b) => coinRR[b] - coinRR[a])
        .slice(0, 20);
      html += `<h4>🏆 Top 20 Coin (${m})</h4>
                     <table><tr><th>Coin</th><th>Total RR</th></tr>`;
      for (const c of topCoins) {
        html += `<tr><td>${c}</td><td>${coinRR[c].toFixed(3)}</td></tr>`;
      }
      html += "</table><br/>";
    }

    $("tableContainer").innerHTML = html;

    // ✅ Event filter năm và tháng
    $("yearFilter").addEventListener("change", () => {
      render(trades, $("yearFilter").value, "");
    });

    $("monthFilter").addEventListener("change", () => {
      render(trades, $("yearFilter").value, $("monthFilter").value);
    });

    // ✅ Event filter coin trong block
    document.querySelectorAll(".coinSelector").forEach((selector) => {
      selector.addEventListener("change", function () {
        const month = this.dataset.month;
        const selectedCoin = this.value;
        const trades = window.allTradesRaw || [];
        const filtered = trades.filter((t) => {
          const k = findEntryDateKey(t);
          const ts = k ? toTimestamp(t[k]) : NaN;
          if (isNaN(ts)) return false;
          const d = new Date(ts);
          const keyMonth = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}`;
          const coin = t["Symbol"] || "N/A";
          return (
            keyMonth === month && (selectedCoin === "" || coin === selectedCoin)
          );
        });

        render(filtered, $("yearFilter").value, $("monthFilter").value);
      });
    });
  }

  $("fileInput").addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const trades = await handleFiles(files);
    render(trades);
  });

  window._THV = { extractJsonItems, findEntryDateKey, toTimestamp };
})();
