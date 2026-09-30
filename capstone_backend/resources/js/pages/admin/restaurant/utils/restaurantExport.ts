/**
 * Restaurant Reports — Shared XLSX Export Utilities
 *
 * Shared export functions para sa lahat ng restaurant reports.
 * Hindi na kailangan mag-duplicate ng code sa bawat report file.
 *
 * Header layout:
 *   Row 1: Company name (merged across all columns)
 *   Row 2: Report title (merged across all columns)
 *   Row 3: Filter info (merged A to N-1) + Generated date (last col)
 *   Row 4: Empty spacer
 *   Row 5: Column headers (UPPERCASE)
 *   Row 6+: Data rows
 *   Last: Totals row
 *
 * May borders sa lahat ng cells.
 */

import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const XLSX_MIME =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Border style — manipis na gray
const THIN_BORDER = {
    top: { style: "thin", color: { rgb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { rgb: "FFD1D5DB" } },
    left: { style: "thin", color: { rgb: "FFD1D5DB" } },
    right: { style: "thin", color: { rgb: "FFD1D5DB" } },
};

// Border style — para sa headers at totals (mas madilim)
const HEADER_BORDER = {
    top: { style: "thin", color: { rgb: "FFEA580C" } },
    bottom: { style: "thin", color: { rgb: "FFEA580C" } },
    left: { style: "thin", color: { rgb: "FFEA580C" } },
    right: { style: "thin", color: { rgb: "FFEA580C" } },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ColumnDef = {
    header: string;
    width: number;
    numberFormat?: "integer" | "currency" | "text";
};

type ExportOptions = {
    companyName?: string;
    reportTitle: string;
    filterLabel?: string;
    columns: ColumnDef[];
    rows: (string | number)[][];
    totalsRow?: (string | number)[];
    sheetName: string;
    filenamePrefix: string;
};

// ---------------------------------------------------------------------------
// Helper — lagyan ng border ang isang cell
// ---------------------------------------------------------------------------
function applyBorder(
    worksheet: XLSX.WorkSheet,
    row: number,
    col: number,
    style = THIN_BORDER,
): void {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[addr];
    if (!cell) return;

    cell.s = {
        ...(cell.s || {}),
        border: style,
    };
}

// ---------------------------------------------------------------------------
// Low-level helper — gumagawa at nag-download ng styled XLSX file
// ---------------------------------------------------------------------------
function buildAndDownloadXLSX(options: ExportOptions): void {
    const {
        companyName = "Lyn Enia's Restaurant",
        reportTitle,
        filterLabel,
        columns,
        rows,
        totalsRow,
        sheetName,
        filenamePrefix,
    } = options;

    const numCols = columns.length;

    // -------------------------------------------------------------------
    // 1. Header section
    // -------------------------------------------------------------------
    const today = new Date().toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    // Row 1: Company name (merged)
    const rowCompany = [companyName];
    while (rowCompany.length < numCols) rowCompany.push("");

    // Row 2: Report title (merged)
    const rowTitle = [reportTitle];
    while (rowTitle.length < numCols) rowTitle.push("");

    // Row 3: Filter label sa column A (at i-merge sa cols 0 to numCols-2)
    //        + Generated date sa last column
    const rowInfo: (string | number)[] = new Array(numCols).fill("");
    rowInfo[0] = filterLabel ?? "";
    rowInfo[numCols - 1] = `Generated: ${today}`;

    // Row 4: Spacer
    const rowSpacer = new Array(numCols).fill("");

    // Row 5: Column headers (UPPERCASE)
    const rowHeaders = columns.map((c) => c.header.toUpperCase());

    // -------------------------------------------------------------------
    // 2. Combine lahat
    // -------------------------------------------------------------------
    const worksheetData = [
        rowCompany, // Row 1 (index 0)
        rowTitle, // Row 2 (index 1)
        rowInfo, // Row 3 (index 2)
        rowSpacer, // Row 4 (index 3)
        rowHeaders, // Row 5 (index 4)
        ...rows, // Row 6 onwards (index 5+)
        totalsRow ?? new Array(numCols).fill(""), // Last row
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // -------------------------------------------------------------------
    // 3. Column widths
    // -------------------------------------------------------------------
    worksheet["!cols"] = columns.map((c) => ({ wch: c.width }));

    // -------------------------------------------------------------------
    // 4. Number formatting + borders sa data rows
    // -------------------------------------------------------------------
    const dataStartRow = 5; // index 5 (Row 6)
    const totalRowIndex = dataStartRow + rows.length;

    for (let r = dataStartRow; r <= totalRowIndex; r++) {
        columns.forEach((col, c) => {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = worksheet[addr];
            if (!cell) return;

            // Number format
            if (col.numberFormat === "integer" && typeof cell.v === "number") {
                cell.t = "n";
                cell.z = "0";
            } else if (
                col.numberFormat === "currency" &&
                typeof cell.v === "number"
            ) {
                cell.t = "n";
                cell.z = '"₱"#,##0.00';
            }

            // Border — lahat ng data cells at totals
            const isTotalRow = r === totalRowIndex;
            applyBorder(
                worksheet,
                r,
                c,
                isTotalRow ? HEADER_BORDER : THIN_BORDER,
            );
        });
    }

    // -------------------------------------------------------------------
    // 5. Border sa headers (Row 5)
    // -------------------------------------------------------------------
    for (let c = 0; c < numCols; c++) {
        applyBorder(worksheet, 4, c, HEADER_BORDER);
    }

    // -------------------------------------------------------------------
    // 6. Merge cells
    //
    //   Row 1: Company name (merge A1:(N)1) — buong width
    //   Row 2: Report title (merge A2:(N)2) — buong width
    //   Row 3: Filter label (merge A3:(N-1)3) — hanggang pangalawang-huling col
    //          HINDI kasama ang huling column (N), kasi nasa doon ang "Generated"
    // -------------------------------------------------------------------
    const merges: XLSX.Range[] = [];

    if (numCols > 1) {
        // Row 1 — Company name (buong width)
        merges.push({
            s: { r: 0, c: 0 },
            e: { r: 0, c: numCols - 1 },
        });

        // Row 2 — Report title (buong width)
        merges.push({
            s: { r: 1, c: 0 },
            e: { r: 1, c: numCols - 1 },
        });

        // Row 3 — Filter label (A hanggang pangalawang-huling column)
        // Sinisiguro na may at least 2 columns na kasama sa merge.
        if (numCols >= 2) {
            merges.push({
                s: { r: 2, c: 0 },
                e: { r: 2, c: numCols - 2 },
            });
        }
    }

    worksheet["!merges"] = merges;

    // -------------------------------------------------------------------
    // 7. Workbook
    // -------------------------------------------------------------------
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // -------------------------------------------------------------------
    // 8. Download via Blob — garantisadong .xlsx
    // -------------------------------------------------------------------
    const wbout = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
    });

    const blob = new Blob([wbout], { type: XLSX_MIME });

    const todayFile = new Date().toISOString().split("T")[0];
    const fullName = `${filenamePrefix}_${todayFile}.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fullName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// EXPORT 1: Sales Report (OrdersReport.tsx)
// ---------------------------------------------------------------------------
export function exportOrdersReport(
    items: any[],
    options?: { filter?: string; dateRange?: string },
): void {
    if (items.length === 0) {
        alert("Walang laman ang report. Wala kang ma-export.");
        return;
    }

    const { filter = "all", dateRange = "all" } = options ?? {};

    const columns: ColumnDef[] = [
        { header: "Order #", width: 18 },
        { header: "Product", width: 25 },
        { header: "Category", width: 14 },
        { header: "Quantity", width: 10, numberFormat: "integer" },
        { header: "Subtotal", width: 16, numberFormat: "currency" },
        { header: "Status", width: 12 },
        { header: "Date", width: 22 },
        { header: "Customer", width: 20 },
        { header: "Table", width: 10 },
    ];

    const rows = items.map((item: any) => [
        `#${item.order_id ?? "-"}`,
        item.menu_item?.name ?? "-",
        item.menu_item?.category ?? "-",
        Number(item.quantity ?? 0),
        Number(item.subtotal ?? 0),
        (item.status ?? "-").toUpperCase(),
        item.order_date
            ? new Date(item.order_date).toLocaleString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
              })
            : "-",
        item.customer_name ?? "Guest",
        item.table_number ?? "-",
    ]);

    const totalQty = items.reduce(
        (s: number, i: any) => s + Number(i.quantity ?? 0),
        0,
    );
    const totalRevenue = items.reduce(
        (s: number, i: any) => s + Number(i.subtotal ?? 0),
        0,
    );

    const totalsRow = [
        "",
        "",
        "TOTAL",
        totalQty,
        totalRevenue,
        "",
        "",
        "",
        "",
    ];

    buildAndDownloadXLSX({
        companyName: "Lyn Enia's Restaurant",
        reportTitle: "Sales Report",
        filterLabel: `Category: ${filter} | Date Range: ${dateRange}`,
        columns,
        rows,
        totalsRow,
        sheetName: "Sales Report",
        filenamePrefix: `sales-report_${filter}_${dateRange}`,
    });
}

// ---------------------------------------------------------------------------
// EXPORT 2: Orders Transaction Report (OrdersTransactionReport.tsx)
// ---------------------------------------------------------------------------
export function exportTransactionsReport(
    payments: any[],
    options?: { statusFilter?: string },
): void {
    if (payments.length === 0) {
        alert("Walang laman ang report. Wala kang ma-export.");
        return;
    }

    const { statusFilter = "all" } = options ?? {};

    const columns: ColumnDef[] = [
        { header: "Reference", width: 36 },
        { header: "Order #", width: 22 },
        { header: "Cashier", width: 22 },
        { header: "Method", width: 12 },
        { header: "Status", width: 12 },
        { header: "Payment Date", width: 22 },
        { header: "Amount", width: 16, numberFormat: "currency" },
    ];

    const rows = payments.map((p: any) => {
        const cashierName = p.order?.cashier?.first_name
            ? `${p.order.cashier.first_name} ${
                  p.order.cashier.last_name ?? ""
              }`.trim()
            : "-";

        return [
            p.gcash_reference ?? "no reference",
            `#${p.order?.order_number ?? p.order_id ?? "-"}`,
            cashierName,
            (p.payment_method ?? "unknown").toUpperCase(),
            (p.payment_status ?? "unknown").toUpperCase(),
            p.payment_date
                ? new Date(p.payment_date).toLocaleString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                  })
                : "-",
            Number(p.amount ?? 0),
        ];
    });

    const totalAmount = payments.reduce(
        (s: number, p: any) => s + Number(p.amount ?? 0),
        0,
    );

    const totalsRow = ["", "", "", "", "TOTAL", "", totalAmount];

    buildAndDownloadXLSX({
        companyName: "Lyn Enia's Restaurant",
        reportTitle: "Orders Transaction Report",
        filterLabel: `Status Filter: ${statusFilter}`,
        columns,
        rows,
        totalsRow,
        sheetName: "Transactions",
        filenamePrefix: `orders-transaction-report_${statusFilter}`,
    });
}