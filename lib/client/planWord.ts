import type { ItineraryDay, TravelPlanCreateInput } from "@/types/plan";

type WordPlanInput = Omit<TravelPlanCreateInput, "password">;

type ZipEntry = {
  path: string;
  content: string;
};

const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value =
        value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function setUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function setUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      ((date.getHours() & 31) << 11) |
      ((date.getMinutes() & 63) << 5) |
      (Math.floor(date.getSeconds() / 2) & 31),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

function createStoredZip(entries: ZipEntry[]): Uint8Array {
  const timestamp = dosDateTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content);
    const checksum = crc32(data);

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    setUint32(localView, 0, 0x04034b50);
    setUint16(localView, 4, 20);
    setUint16(localView, 6, 0x0800);
    setUint16(localView, 8, 0);
    setUint16(localView, 10, timestamp.time);
    setUint16(localView, 12, timestamp.date);
    setUint32(localView, 14, checksum);
    setUint32(localView, 18, data.length);
    setUint32(localView, 22, data.length);
    setUint16(localView, 26, name.length);
    setUint16(localView, 28, 0);

    const localPart = concatBytes([localHeader, name, data]);
    localParts.push(localPart);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    setUint32(centralView, 0, 0x02014b50);
    setUint16(centralView, 4, 20);
    setUint16(centralView, 6, 20);
    setUint16(centralView, 8, 0x0800);
    setUint16(centralView, 10, 0);
    setUint16(centralView, 12, timestamp.time);
    setUint16(centralView, 14, timestamp.date);
    setUint32(centralView, 16, checksum);
    setUint32(centralView, 20, data.length);
    setUint32(centralView, 24, data.length);
    setUint16(centralView, 28, name.length);
    setUint16(centralView, 30, 0);
    setUint16(centralView, 32, 0);
    setUint16(centralView, 34, 0);
    setUint16(centralView, 36, 0);
    setUint32(centralView, 38, 0);
    setUint32(centralView, 42, localOffset);

    centralParts.push(concatBytes([centralHeader, name]));
    localOffset += localPart.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  setUint32(endView, 0, 0x06054b50);
  setUint16(endView, 4, 0);
  setUint16(endView, 6, 0);
  setUint16(endView, 8, entries.length);
  setUint16(endView, 10, entries.length);
  setUint32(endView, 12, centralDirectory.length);
  setUint32(endView, 16, localOffset);
  setUint16(endView, 20, 0);

  return concatBytes([...localParts, centralDirectory, endRecord]);
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textRuns(value: string, options?: { bold?: boolean; color?: string; size?: number }) {
  const properties = [
    '<w:rFonts w:ascii="Malgun Gothic" w:eastAsia="맑은 고딕" w:hAnsi="Malgun Gothic"/>',
    options?.bold ? "<w:b/>" : "",
    options?.color ? `<w:color w:val="${options.color}"/>` : "",
    options?.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : "",
  ].join("");
  const lines = String(value ?? "").split(/\r?\n/);

  return lines
    .map(
      (line, index) =>
        `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t>${
          index < lines.length - 1 ? "<w:br/>" : ""
        }</w:r>`,
    )
    .join("");
}

function paragraph(
  value: string,
  options?: {
    bold?: boolean;
    color?: string;
    size?: number;
    align?: "left" | "center";
    before?: number;
    after?: number;
  },
) {
  return `<w:p><w:pPr><w:jc w:val="${options?.align ?? "left"}"/><w:spacing w:before="${
    options?.before ?? 0
  }" w:after="${options?.after ?? 80}"/></w:pPr>${textRuns(value, options)}</w:p>`;
}

function tableCell(value: string, options?: { bold?: boolean; fill?: string; width?: number }) {
  return `<w:tc><w:tcPr>${
    options?.width ? `<w:tcW w:w="${options.width}" w:type="dxa"/>` : ""
  }${options?.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.fill}"/>` : ""}<w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(
    value,
    { bold: options?.bold, size: 20, after: 0 },
  )}</w:tc>`;
}

function tableRow(cells: string[]) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function table(rows: string[]) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8C4D1"/><w:left w:val="single" w:sz="4" w:color="B8C4D1"/><w:bottom w:val="single" w:sz="4" w:color="B8C4D1"/><w:right w:val="single" w:sz="4" w:color="B8C4D1"/><w:insideH w:val="single" w:sz="4" w:color="D9E1E8"/><w:insideV w:val="single" w:sz="4" w:color="D9E1E8"/></w:tblBorders></w:tblPr>${rows.join(
    "",
  )}</w:tbl>`;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일` : value;
}

function buildDay(day: ItineraryDay, index: number) {
  const rows = [
    tableRow([
      tableCell("시간", { bold: true, fill: "DCEAF7", width: 1200 }),
      tableCell("분류", { bold: true, fill: "DCEAF7", width: 1100 }),
      tableCell("장소·일정", { bold: true, fill: "DCEAF7", width: 2800 }),
      tableCell("상세 메모", { bold: true, fill: "DCEAF7", width: 4400 }),
    ]),
    ...day.items.map((item) =>
      tableRow([
        tableCell(item.time || "-", { width: 1200 }),
        tableCell(item.category || "기타", { width: 1100 }),
        tableCell(item.place || "-", { width: 2800 }),
        tableCell(item.notes || "", { width: 4400 }),
      ]),
    ),
  ];

  return [
    paragraph(`DAY ${index + 1}  ${day.title || `${index + 1}일차`}`, {
      bold: true,
      color: "174B70",
      size: 28,
      before: 260,
      after: 60,
    }),
    paragraph(formatDate(day.date), { color: "5A6772", size: 19, after: 100 }),
    table(rows),
  ].join("");
}

function buildDocumentXml(plan: WordPlanInput) {
  const budget =
    plan.budget === null || plan.budget === undefined
      ? "미입력"
      : `${Number(plan.budget).toLocaleString("ko-KR")}원`;
  const basicRows = [
    tableRow([
      tableCell("여행지", { bold: true, fill: "EAF2F8", width: 1800 }),
      tableCell(plan.destination || "-", { width: 7600 }),
    ]),
    tableRow([
      tableCell("여행 기간", { bold: true, fill: "EAF2F8", width: 1800 }),
      tableCell(`${formatDate(plan.startDate)} ~ ${formatDate(plan.endDate)}`, {
        width: 7600,
      }),
    ]),
    tableRow([
      tableCell("여행 인원", { bold: true, fill: "EAF2F8", width: 1800 }),
      tableCell(`${plan.travelers || 0}명`, { width: 7600 }),
    ]),
    tableRow([
      tableCell("예산", { bold: true, fill: "EAF2F8", width: 1800 }),
      tableCell(budget, { width: 7600 }),
    ]),
    tableRow([
      tableCell("여행 성향", { bold: true, fill: "EAF2F8", width: 1800 }),
      tableCell(plan.travelStyle || "-", { width: 7600 }),
    ]),
  ];

  const body = [
    paragraph("JOURNEY VAULT AI", {
      bold: true,
      color: "2788C7",
      size: 22,
      align: "center",
      after: 90,
    }),
    paragraph(plan.title || `${plan.destination} 여행계획`, {
      bold: true,
      color: "132638",
      size: 38,
      align: "center",
      after: 220,
    }),
    table(basicRows),
    paragraph("여행 개요", {
      bold: true,
      color: "174B70",
      size: 28,
      before: 280,
      after: 80,
    }),
    paragraph(plan.summary || "별도 메모 없음", { size: 21, after: 180 }),
    paragraph("일자별 일정", {
      bold: true,
      color: "174B70",
      size: 30,
      before: 180,
      after: 80,
    }),
    ...(plan.days || []).map(buildDay),
    paragraph(
      "※ 교통시간·영업시간·요금·예약 가능 여부는 변경될 수 있으므로 출발 전에 공식 정보를 다시 확인하세요.",
      { color: "7A4B22", size: 18, before: 320, after: 0 },
    ),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr>',
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
}

function buildDocx(plan: WordPlanInput): Uint8Array {
  return createStoredZip([
    {
      path: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      path: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    { path: "word/document.xml", content: buildDocumentXml(plan) },
  ]);
}

function normalizeFileName(requestedFileName: string): string {
  const baseName = requestedFileName
    .trim()
    .replace(/\.docx$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);

  if (!baseName) {
    throw new Error("워드 문서 파일이름을 올바르게 입력해 주세요.");
  }

  return `${baseName}.docx`;
}

export function downloadTravelPlanWord(
  plan: WordPlanInput,
  requestedFileName: string,
): string {
  const fileName = normalizeFileName(requestedFileName);
  const bytes = buildDocx(plan);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return fileName;
}
