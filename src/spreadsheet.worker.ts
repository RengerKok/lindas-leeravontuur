import ExcelJS from 'exceljs';
import Papa from 'papaparse';
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const file = event.data; if (file.size > 15 * 1024 * 1024) throw new Error('Kies een bestand van maximaal 15 MB.');
    let sheets: { name: string; rows: string[][] }[];
    if (file.name.toLowerCase().endsWith('.csv')) {
      const result = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' });
      if (result.errors.some(error => error.type === 'Quotes')) throw new Error('De CSV bevat ongeldige aanhalingstekens.');
      sheets = [{ name: 'CSV', rows: result.data }];
    } else if (file.name.toLowerCase().endsWith('.xlsx')) {
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
      sheets = workbook.worksheets.map(sheet => {
        if (sheet.rowCount > 10001 || sheet.columnCount > 100) throw new Error('Maximaal 10.000 rijen en 100 kolommen per werkblad.');
        const rows: string[][] = [];
        sheet.eachRow({ includeEmpty: true }, row => { const values: string[] = []; for (let column = 1; column <= sheet.columnCount; column++) { const cell = row.getCell(column); values.push(cell.type === ExcelJS.ValueType.Formula ? String(cell.result ?? '') : cell.text); } rows.push(values); });
        return { name: sheet.name, rows };
      });
    } else throw new Error('Kies een .xlsx- of .csv-bestand.');
    if (sheets.some(sheet => sheet.rows.length > 10001)) throw new Error('Maximaal 10.000 vragen per werkblad.');
    if (!sheets.length || !sheets.some(sheet => sheet.rows.length > 1)) throw new Error('Geen vragen gevonden. De eerste rij moet kolomnamen bevatten.');
    self.postMessage({ sheets });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Dit bestand kon niet worden gelezen.' }); }
};