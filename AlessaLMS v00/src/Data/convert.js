import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('CIE-10_27_01_2025.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
fs.writeFileSync('cie10_data.json', JSON.stringify(data, null, 2));
console.log('Conversion complete. Sample:', data.slice(0, 2));
