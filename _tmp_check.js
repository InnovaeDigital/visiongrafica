
      const materialStorageKey = "vision.materialPresets";
      const quotesStorageKey = "vision.savedQuotes";
      const fields = {};
      const itemList = document.getElementById("items");
      const previewRows = document.getElementById("previewRows");
      const statusMessage = document.getElementById("statusMessage");
      const calcIds = ["materialPreset", "calcWidth", "calcHeight", "calcQuantity", "calcCost", "calcPrice"];
      const calcFields = {};
      let pixRequestId = 0;
      let pixTimer = null;
      const previewTargets = [...document.querySelectorAll("[data-preview]")]
        .reduce((acc, node) => {
          acc[node.dataset.preview] = node;
          return acc;
        }, {});

      const defaults = {
        clientName: "",
        discount: "0"
      };

      const company = {
        providerName: "Liendre Saavedra Caixeta",
        phone: "(61) 99573-0013",
        pixKey: "+5561995730013",
        pixDisplayKey: "61995730013",
        city: "LuziÃ¢nia/GO",
        email: "viisiongrafica@gmail.com",
        social: "@visionluziania",
        pixName: "LIENDRE SAAVEDRA CAIXETA",
        pixCity: "LUZIANIA"
      };

      const defaultMaterials = [
        "CartÃ£o de visita",
        "Flyer",
        "Folder",
        "Banner",
        "Adesivo vinil",
        "Adesivo recorte",
        "Placa ACM",
        "Panfleto",
        "Etiquetas",
        "Envelope personalizado",
        "ImpressÃ£o digital",
        "Plotagem",
        "SinalizaÃ§Ã£o interna",
        "Adesivo para carro",
        "Papelaria corporativa"
      ];

      let materialPresets = loadMaterialPresets();

      let items = [
        { description: "", quantity: 1, unitPrice: 0 }
      ];

      function byId(id) {
        return document.getElementById(id);
      }

      function money(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        });
      }

      function plainMoney(value) {
        return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
      }

      function formatQuantity(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4
        });
      }

      function cleanNumber(value) {
        const number = Number(String(value).replace(",", "."));
        return Number.isFinite(number) ? number : 0;
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function formatPixAmount(value) {
        return Number(value || 0).toFixed(2);
      }

      function tlv(id, value) {
        const text = String(value);
        return `${id}${String(text.length).padStart(2, "0")}${text}`;
      }

      function crc16(payload) {
        let crc = 0xffff;
        for (let i = 0; i < payload.length; i += 1) {
          crc ^= payload.charCodeAt(i) << 8;
          for (let bit = 0; bit < 8; bit += 1) {
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xffff;
          }
        }
        return crc.toString(16).toUpperCase().padStart(4, "0");
      }

      function createPixPayload(data) {
        const amount = formatPixAmount(data.total);
        const txid = pixReference(data.clientName || data.invoiceNumber || String(Date.now()));
        const merchantAccount = [
          tlv("00", "br.gov.bcb.pix"),
          tlv("01", company.pixKey),
          tlv("02", `Orcamento ${data.invoiceNumber}`.slice(0, 72))
        ].join("");
        const payload = [
          tlv("00", "01"),
          tlv("26", merchantAccount),
          tlv("52", "0000"),
          tlv("53", "986"),
          tlv("54", amount),
          tlv("58", "BR"),
          tlv("59", company.pixName.slice(0, 25)),
          tlv("60", company.pixCity.slice(0, 15)),
          tlv("62", tlv("05", txid))
        ].join("");
        const withCrc = `${payload}6304`;
        return `${withCrc}${crc16(withCrc)}`;
      }

      function qrCodeUrl(payload) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(payload)}`;
      }

      function pixPlaceholder() {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect width="220" height="220" fill="#fff200"/><rect x="16" y="16" width="188" height="188" fill="#ffffff" stroke="#050505" stroke-width="4"/><text x="110" y="104" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#050505">Gerando Pix</text><text x="110" y="130" text-anchor="middle" font-family="Arial" font-size="12" fill="#050505">GerarPix.com.br</text></svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }

      function pixReference(invoiceNumber) {
        return String(invoiceNumber || "ORCAMENTO").replace(/[^a-z0-9]/gi, "").slice(0, 20) || "ORCAMENTO";
      }

      function loadGerarPix(data) {
        previewTargets.pixPayload.textContent = data.pixPayload;
        previewTargets.pixQr.src = qrCodeUrl(data.pixPayload);
      }

      function scheduleGerarPix(data) {
        // Generate QR locally immediately; avoid external API to prevent failures
        loadGerarPix(data);
      }

      function getFormData() {
        const data = {};
        Object.keys(defaults).forEach((key) => {
          data[key] = fields[key].value;
        });
        data.discount = cleanNumber(data.discount);
        data.items = items.map((item) => ({
          description: item.description.trim() || "-",
          quantity: cleanNumber(item.quantity),
          unitPrice: cleanNumber(item.unitPrice)
        }));
        data.invoiceNumber = `ORCAMENTO-${Date.now()}`;
        data.subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        data.total = Math.max(0, data.subtotal - data.discount);
        data.providerName = company.providerName;
        data.phone = company.phone;
        data.city = company.city;
        data.email = company.email;
        data.social = company.social;
        data.paymentTitle = "FORMA DE PAGAMENTO:";
        data.paymentLines = [
          `Pix Celular - ${company.pixDisplayKey} - ${company.pixName}`,
          `Valor fixado: ${money(data.total)}`,
          `${company.social} â€¢ ${company.city}`
        ];
        data.pixPayload = createPixPayload(data);
        return data;
      }

      function setStatus(message) {
        statusMessage.textContent = message;
      }

      function loadMaterialPresets() {
        try {
          const saved = JSON.parse(localStorage.getItem(materialStorageKey) || "[]");
          const list = Array.isArray(saved) ? saved : [];
          return [...new Set([...defaultMaterials, ...list].map((item) => String(item).trim()).filter(Boolean))];
        } catch {
          return [...defaultMaterials];
        }
      }

      function saveMaterialPresets() {
        localStorage.setItem(materialStorageKey, JSON.stringify(materialPresets));
      }

      function renderMaterialPresets(selected = "") {
        const select = byId("materialPreset");
        select.innerHTML = "";
        materialPresets.forEach((material) => {
          const option = document.createElement("option");
          option.value = material;
          option.textContent = material;
          select.appendChild(option);
        });
        select.value = selected && materialPresets.includes(selected) ? selected : materialPresets[0];
      }

      function addMaterialPreset() {
        const input = byId("newMaterial");
        const material = input.value.trim();
        if (!material) {
          input.focus();
          return;
        }
        const exists = materialPresets.some((item) => item.toLowerCase() === material.toLowerCase());
        if (!exists) {
          materialPresets.push(material);
          materialPresets.sort((a, b) => a.localeCompare(b, "pt-BR"));
          saveMaterialPresets();
        }
        renderMaterialPresets(material);
        input.value = "";
        renderCalculator();
        setStatus(`${material} salvo como tipo de material.`);
      }

      function loadSavedQuotes() {
        try {
          const saved = JSON.parse(localStorage.getItem(quotesStorageKey) || "[]");
          return Array.isArray(saved) ? saved : [];
        } catch {
          return [];
        }
      }

      function saveQuoteRecord(data) {
        const quotes = loadSavedQuotes();
        const record = {
          id: `${data.invoiceNumber}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          invoiceNumber: data.invoiceNumber,
          clientName: data.clientName,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          items: data.items
        };
        quotes.unshift(record);
        localStorage.setItem(quotesStorageKey, JSON.stringify(quotes.slice(0, 500)));
        renderDbStats();
      }

      function renderDbStats() {
        byId("savedQuotesCount").textContent = loadSavedQuotes().length;
        byId("savedMaterialsCount").textContent = materialPresets.length;
      }

      function exportDatabase() {
        const payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          materialPresets,
          quotes: loadSavedQuotes()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `backup-vision-orcamentos-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        setStatus("Backup exportado.");
      }

      function importDatabaseFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const payload = JSON.parse(reader.result);
            if (!payload || typeof payload !== "object") throw new Error("Arquivo invÃ¡lido");
            if (Array.isArray(payload.materialPresets)) {
              materialPresets = [...new Set([...defaultMaterials, ...payload.materialPresets].map((item) => String(item).trim()).filter(Boolean))];
              saveMaterialPresets();
              renderMaterialPresets();
            }
            if (Array.isArray(payload.quotes)) {
              localStorage.setItem(quotesStorageKey, JSON.stringify(payload.quotes.slice(0, 500)));
            }
            renderDbStats();
            renderCalculator();
            renderPreview();
            setStatus("Backup importado com sucesso.");
          } catch {
            alert("NÃ£o foi possÃ­vel importar esse arquivo de backup.");
          }
        };
        reader.readAsText(file);
      }

      function clearDatabase() {
        if (!confirm("Tem certeza que deseja limpar histÃ³rico e materiais salvos deste navegador?")) return;
        localStorage.removeItem(materialStorageKey);
        localStorage.removeItem(quotesStorageKey);
        materialPresets = loadMaterialPresets();
        renderMaterialPresets();
        renderDbStats();
        setStatus("Banco local limpo. A numeraÃ§Ã£o atual foi mantida.");
      }

      function formatArea(value) {
        return `${Number(value || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} mÂ²`;
      }

      function getCalcData() {
        const width = cleanNumber(calcFields.calcWidth.value);
        const height = cleanNumber(calcFields.calcHeight.value);
        const quantity = Math.max(1, cleanNumber(calcFields.calcQuantity.value));
        const cost = cleanNumber(calcFields.calcCost.value);
        const price = cleanNumber(calcFields.calcPrice.value);
        const unitArea = width * height;
        const totalArea = unitArea * quantity;
        const totalCost = totalArea * cost;
        const clientTotal = totalArea * price;
        return {
          description: calcFields.materialPreset.value || "Material em mÂ²",
          width,
          height,
          quantity,
          cost,
          price,
          unitArea,
          totalArea,
          totalCost,
          clientTotal,
          profit: clientTotal - totalCost
        };
      }

      function renderCalculator() {
        const data = getCalcData();
        byId("calcArea").textContent = formatArea(data.totalArea);
        byId("calcTotalCost").textContent = money(data.totalCost);
        byId("calcClientTotal").textContent = money(data.clientTotal);
        byId("calcProfit").textContent = money(data.profit);
      }

      function addCalculatorItem() {
        const data = getCalcData();
        if (!data.width || !data.height || !data.clientTotal) {
          alert("Informe largura, altura e valor final por mÂ² para adicionar ao orÃ§amento.");
          return;
        }
        items.push({
          description: `${data.description}\n${data.width.toString().replace(".", ",")}m x ${data.height.toString().replace(".", ",")}m | ${data.quantity} un.`,
          quantity: Number(data.totalArea.toFixed(4)),
          unitPrice: Number(data.price.toFixed(2))
        });
        renderItems();
        renderPreview();
        setStatus(`${data.description} adicionado ao orÃ§amento com venda de ${money(data.clientTotal)}.`);
      }

      function renderItems() {
        itemList.innerHTML = "";
        items.forEach((item, index) => {
          const wrapper = document.createElement("div");
          wrapper.className = "item-editor";
          wrapper.innerHTML = `
            <div class="item-grid">
              <div class="field">
                <label>DescriÃ§Ã£o</label>
                <textarea data-field="description" data-index="${index}">${escapeHtml(item.description)}</textarea>
              </div>
              <div class="field">
                <label>Qtd</label>
                <input data-field="quantity" data-index="${index}" type="number" min="0" step="0.01" value="${item.quantity}">
              </div>
              <div class="field">
                <label>PreÃ§o unitÃ¡rio</label>
                <input data-field="unitPrice" data-index="${index}" type="number" min="0" step="0.01" value="${item.unitPrice}">
              </div>
            </div>
            <div class="item-footer">
              <span data-total="${index}">Total do item: ${money(cleanNumber(item.quantity) * cleanNumber(item.unitPrice))}</span>
              <button class="btn danger" data-remove="${index}" type="button">Remover</button>
            </div>
          `;
          itemList.appendChild(wrapper);
        });
      }

      function updateItemTotal(index) {
        const total = itemList.querySelector(`[data-total="${index}"]`);
        if (!total || !items[index]) return;
        total.textContent = `Total do item: ${money(cleanNumber(items[index].quantity) * cleanNumber(items[index].unitPrice))}`;
      }

      function renderPreview() {
        const data = getFormData();
        previewTargets.clientName.textContent = data.clientName || "-";
        previewTargets.providerName.textContent = data.providerName || "-";
        previewTargets.phone.textContent = data.phone || "-";
        previewTargets.email.textContent = data.email || "-";
        previewTargets.social.textContent = data.social || "";
        previewTargets.phoneCity.textContent = `${data.phone || "-"} â€” ${data.city || "-"}`;
        previewTargets.paymentTitle.textContent = data.paymentTitle || "FORMA DE PAGAMENTO:";
        previewTargets.grandTotal.textContent = money(data.total);

        const lines = [...data.paymentLines, "", ""];
        previewTargets.paymentLine1.textContent = lines[0] || "";
        previewTargets.paymentLine2.textContent = lines[1] || "";
        previewTargets.paymentLine3.textContent = lines[2] || "";
        previewTargets.pixPayload.textContent = data.pixPayload;
        previewTargets.pixQr.src = qrCodeUrl(data.pixPayload);

        previewRows.innerHTML = "";
        data.items.forEach((item) => {
          const tr = document.createElement("tr");
          const [main, ...small] = item.description.split(/\r?\n/);
          tr.innerHTML = `
            <td>${escapeHtml(main || "-")}${small.length ? `<br><small>${escapeHtml(small.join(" "))}</small>` : ""}</td>
            <td class="right">${item.quantity ? formatQuantity(item.quantity) : "-"}</td>
            <td class="right">${money(item.unitPrice)}</td>
            <td class="right">${money(item.quantity * item.unitPrice)}</td>
          `;
          previewRows.appendChild(tr);
        });

        if (data.discount > 0) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>DESCONTO</td>
            <td class="right">-</td>
            <td class="right">-</td>
            <td class="right">${money(data.discount)}</td>
          `;
          previewRows.appendChild(tr);
        }
      }

      function incrementInvoiceNumber(value) {
        const match = String(value).trim().match(/^(\d+)(.*)$/);
        if (!match) return value;
        return `${Number(match[1]) + 1}${match[2]}`;
      }

      function sanitizeFileName(value) {
        return String(value || "cliente")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9-]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "cliente";
      }

      function pdfEscape(value) {
        const map = {
          "â‚¬": 128, "â€š": 130, "Æ’": 131, "â€ž": 132, "â€¦": 133, "â€ ": 134, "â€¡": 135,
          "Ë†": 136, "â€°": 137, "Å ": 138, "â€¹": 139, "Å’": 140, "Å½": 142,
          "â€˜": 145, "â€™": 146, "â€œ": 147, "â€": 148, "â€¢": 149, "â€“": 150, "â€”": 151,
          "Ëœ": 152, "â„¢": 153, "Å¡": 154, "â€º": 155, "Å“": 156, "Å¾": 158, "Å¸": 159
        };
        let output = "";
        for (const char of String(value)) {
          const code = map[char] || char.charCodeAt(0);
          if (char === "(" || char === ")" || char === "\\") {
            output += "\\" + char;
          } else if (code < 32 || code > 255) {
            output += "?";
          } else {
            output += String.fromCharCode(code);
          }
        }
        return output;
      }

      function createPdf(data) {
        const pageW = 595.28;
        const pageH = 841.89;
        const margin = 40;
        const contentWidth = pageW - margin * 2;
        const stream = [];

        const y = (top) => pageH - top;
        const cmd = (line) => stream.push(line);
        const rect = (x, top, w, h, color, stroke = false) => {
          cmd(`${color} ${stroke ? "RG" : "rg"}`);
          cmd(`${x.toFixed(2)} ${y(top + h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${stroke ? "S" : "f"}`);
        };
        const text = (value, x, top, size = 10, font = "F1", align = "left", maxW = 0) => {
          const safe = pdfEscape(value);
          let tx = x;
          if (align !== "left" && maxW) {
            const approx = safe.length * size * 0.48;
            tx = align === "right" ? x + maxW - approx : x + (maxW - approx) / 2;
          }
          cmd(`BT /${font} ${size} Tf 0 0 0 rg ${tx.toFixed(2)} ${y(top).toFixed(2)} Td (${safe}) Tj ET`);
        };
        const wrap = (value, maxChars) => {
          const lines = [];
          String(value).split(/\r?\n/).forEach((paragraph) => {
            let current = "";
            paragraph.split(/\s+/).filter(Boolean).forEach((word) => {
              if ((current + " " + word).trim().length > maxChars) {
                if (current) lines.push(current);
                current = word;
              } else {
                current = `${current} ${word}`.trim();
              }
            });
            if (current) lines.push(current);
          });
          return lines.length ? lines : ["-"];
        };

        const yellow = "1 0.831 0";
        const dark = "0.047 0.066 0.145";
        const soft = "0.9 0.91 0.94";
        const border = "0.65 0.7 0.78";

        rect(margin, 40, contentWidth, 110, dark);
        rect(margin + 16, 58, 120, 40, yellow);
        text("VISION GRÃFICA RÃPIDA", margin + 150, 78, 16, "F2");
        text("OrÃ§amento Profissional", margin + 150, 98, 10, "F1");
        text(`Telefone: ${data.phone || "-"}`, margin + 16, 118, 9, "F1");
        text(`E-mail: ${data.email || "-"}`, margin + 190, 118, 9, "F1");

        let top = 170;
        rect(margin, top, contentWidth, 72, soft);
        text("Dados do cliente", margin + 12, top + 20, 10, "F2");
        text(`Cliente: ${data.clientName || "-"}`, margin + 12, top + 36, 9);
        text(`Prestador: ${data.providerName || "-"}`, margin + 12, top + 52, 9);
        text(`Rede social: ${data.social || "-"}`, margin + 290, top + 36, 9);
        text(`Cidade: ${data.city || "-"}`, margin + 290, top + 52, 9);

        top += 100;
        const tableX = margin;
        const cols = [0, 280, 360, 455, 555];
        const headerH = 32;
        const rowH = 48;

        rect(tableX, top, contentWidth, headerH, yellow);
        ["DESCRIÃ‡ÃƒO", "QTD", "PREÃ‡O UNIT.", "TOTAL"].forEach((label, index) => {
          text(label, tableX + cols[index] + 8, top + 20, 9, "F2");
        });
        top += headerH;

        data.items.forEach((item) => {
          const lines = wrap(item.description, 32);
          rect(tableX, top, contentWidth, rowH, "1 1 1", true);
          text(lines[0], tableX + 8, top + 18, 9);
          if (lines[1]) text(lines.slice(1).join(" "), tableX + 8, top + 30, 8);
          text(item.quantity ? formatQuantity(item.quantity) : "-", tableX + cols[1] + 8, top + 20, 9, "F1", "right", cols[2] - cols[1] - 12);
          text(plainMoney(item.unitPrice), tableX + cols[2] + 8, top + 20, 9, "F1", "right", cols[3] - cols[2] - 12);
          text(plainMoney(item.quantity * item.unitPrice), tableX + cols[3] + 8, top + 20, 9, "F1", "right", cols[4] - cols[3] - 12);
          top += rowH;
        });

        if (data.discount > 0) {
          rect(tableX, top, contentWidth, rowH, "1 1 1", true);
          text("DESCONTO", tableX + 8, top + 20, 9, "F2");
          text(plainMoney(data.discount), tableX + cols[3] + 8, top + 20, 9, "F1", "right", cols[4] - cols[3] - 12);
          top += rowH;
        }

        rect(tableX, top, contentWidth, 38, soft);
        text("TOTAL C/ DESCONTO APLICADO", tableX + 8, top + 24, 10, "F2");
        text(plainMoney(data.total), tableX + cols[3] + 8, top + 24, 11, "F2", "right", cols[4] - cols[3] - 12);

        top += 72;
        rect(margin, top, contentWidth, 156, dark);
        text("Dados de pagamento", margin + 12, top + 24, 11, "F2");
        text(data.paymentLines[0] || "", margin + 12, top + 42, 9);
        text(data.paymentLines[1] || "", margin + 12, top + 58, 9);
        text(data.paymentLines[2] || "", margin + 12, top + 74, 9);
        text("Chave Pix: 61995730013", margin + 12, top + 94, 9);
        text("Favorecido: LIENDRE SAAVEDRA CAIXETA", margin + 12, top + 110, 9);
        rect(pageW - margin - 170, top + 18, 130, 130, "1 1 1");
        text("QR Code", pageW - margin - 170 + 10, top + 20, 9, "F2");
        const logoTop = pageH - margin - 28;
        rect(margin, logoTop - 12, contentWidth, 16, soft);
        text("VISION GRÃFICA RÃPIDA â€” OrÃ§amento criado para uso profissional.", margin + 8, logoTop, 9, "F1");

        const objects = [];
        const add = (body) => {
          objects.push(body);
          return objects.length;
        };
        const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
        add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>");
        add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        const content = stream.join("\n");
        add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

        let pdf = "%PDF-1.4\n";
        const offsets = [0];
        objects.forEach((body, index) => {
          offsets.push(pdf.length);
          pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
        });
        const xref = pdf.length;
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach((offset) => {
          pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
        });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
        return new Blob([Uint8Array.from(pdf, (char) => char.charCodeAt(0))], { type: "application/pdf" });
      }

      function downloadPdf() {
        const data = getFormData();
        if (!data.clientName.trim()) {
          alert("Informe o nome do cliente antes de gerar o PDF.");
          fields.clientName.focus();
          return;
        }
        if (!data.items.some((item) => item.description !== "-" && item.quantity > 0 && item.unitPrice >= 0)) {
          alert("Adicione pelo menos um item vÃ¡lido ao orÃ§amento.");
          return;
        }
        saveQuoteRecord(data);
        window.print();
        renderPreview();
        setStatus(`OrÃ§amento enviado para impressÃ£o e salvo em histÃ³rico.`);
      }

      function printPdf() {
        const data = getFormData();
        if (!data.clientName.trim()) {
          alert("Informe o nome do cliente antes de imprimir/salvar.");
          fields.clientName.focus();
          return;
        }
        window.print();
      }

      function downloadPdfFile() {
        const data = getFormData();
        if (!data.clientName.trim()) {
          alert("Informe o nome do cliente antes de gerar o PDF.");
          fields.clientName.focus();
          return;
        }
        if (!data.items.some((item) => item.description !== "-" && item.quantity > 0 && item.unitPrice >= 0)) {
          alert("Adicione pelo menos um item vÃ¡lido ao orÃ§amento.");
          return;
        }
        saveQuoteRecord(data);
        const blob = createPdf(data);
        const filename = `${sanitizeFileName(data.clientName)}-${new Date().toISOString().slice(0, 10)}.pdf`;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        renderPreview();
        setStatus(`PDF gerado para download.`);
      }

      function bind() {
        Object.keys(defaults).forEach((key) => {
          fields[key] = byId(key);
          fields[key].value = defaults[key];
          fields[key].addEventListener("input", renderPreview);
        });

        renderMaterialPresets();
        calcIds.forEach((id) => {
          calcFields[id] = byId(id);
          calcFields[id].addEventListener("input", renderCalculator);
          calcFields[id].addEventListener("change", renderCalculator);
        });
        byId("saveMaterial").addEventListener("click", addMaterialPreset);
        byId("newMaterial").addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addMaterialPreset();
          }
        });

        itemList.addEventListener("input", (event) => {
          const index = Number(event.target.dataset.index);
          const field = event.target.dataset.field;
          if (!field || !items[index]) return;
          items[index][field] = event.target.value;
          updateItemTotal(index);
          renderPreview();
          setStatus("");
        });

        itemList.addEventListener("click", (event) => {
          const index = event.target.dataset.remove;
          if (index === undefined) return;
          items.splice(Number(index), 1);
          if (!items.length) items.push({ description: "", quantity: 1, unitPrice: 0 });
          renderItems();
          renderPreview();
          setStatus("");
        });

        byId("addItem").addEventListener("click", () => {
          items.push({ description: "", quantity: 1, unitPrice: 0 });
          renderItems();
          renderPreview();
          setStatus("");
        });
        byId("addCalcItem").addEventListener("click", addCalculatorItem);

        byId("downloadPdf").addEventListener("click", downloadPdf);
        byId("downloadPdfFile").addEventListener("click", downloadPdfFile);
        byId("printPdf").addEventListener("click", printPdf);
        byId("resetForm").addEventListener("click", () => {
          fields.clientName.value = "";
          fields.discount.value = "0";
          items = [{ description: "", quantity: 1, unitPrice: 0 }];
          renderItems();
          renderPreview();
          setStatus("FormulÃ¡rio limpo.");
        });
      }

      bind();
      renderCalculator();
      renderItems();
      renderPreview();
    