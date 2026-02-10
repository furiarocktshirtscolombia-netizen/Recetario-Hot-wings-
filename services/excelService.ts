
import { RecipeWithIngredients, Ingredient } from '../types';

/**
 * Normalización robusta para manejar tildes, caracteres invisibles y errores de codificación.
 */
function normKey(x: any): string {
  let s = (x ?? "").toString().toLowerCase();
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Leer la hoja completa con un “ref extendido” y rellenar MERGES.
 */
function sheetToFullMatrixWide(sheet: any, maxRows = 700, maxCols = 50): any[][] {
  const XLSX = (window as any).XLSX;
  const ref = sheet["!ref"] || `A1:${XLSX.utils.encode_cell({ r: maxRows - 1, c: maxCols - 1 })}`;
  const base = XLSX.utils.decode_range(ref);

  const range = {
    s: { r: 0, c: 0 },
    e: {
      r: Math.max(base.e.r, maxRows - 1),
      c: Math.max(base.e.c, maxCols - 1),
    },
  };

  const rows = range.e.r - range.s.r + 1;
  const cols = range.e.c - range.s.c + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(""));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
      matrix[r][c] = sheet[addr]?.v ?? "";
    }
  }

  const merges = sheet["!merges"] || [];
  for (const m of merges) {
    const rStart = m.s.r - range.s.r;
    const value = matrix[rStart]?.[m.s.c - range.s.c];
    for (let r = m.s.r - range.s.r; r <= m.e.r - range.s.r; r++) {
      for (let c = m.s.c - range.s.c; c <= m.e.c - range.s.c; c++) {
        if ((matrix[r]?.[c] ?? "") === "") {
          if (matrix[r]) matrix[r][c] = value;
        }
      }
    }
  }
  return matrix;
}

/**
 * Detector de headers MULTI-SEÑAL (acepta Artículo O Ingrediente).
 */
function isHeaderRow(row: any[]): boolean {
  const r = (row || []).map(normKey);
  
  const hasItem = 
    r.some(v => /art.?culo/.test(v)) || 
    r.some(v => v.includes("ingrediente"));

  const signals = [
    r.some(v => v.includes("unidad") || v === "und"),
    r.some(v => v.includes("unidades") || v.includes("cant") || v.includes("cantidad")),
    r.some(v => v.includes("merma")),
    r.some(v => v.includes("coste") || v.includes("costo") || v.includes("subtotal")),
  ].filter(Boolean).length;

  return hasItem && signals >= 1;
}

function findHeaderRows(matrix: any[][]): number[] {
  const rows: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    if (isHeaderRow(matrix[i])) rows.push(i);
  }
  return rows;
}

/**
 * Verifica si un texto NO es un buen candidato para ser el nombre de la receta.
 * Descarta palabras clave técnicas y valores que son puramente numéricos.
 */
function isBadTitleCandidate(txt: any): boolean {
  if (typeof txt === "number") return true;
  
  const t = normKey(txt);
  if (!t || t.length < 4) return true;

  // Ignorar cadenas que son puramente números (ej: "11784.63...")
  if (!isNaN(Number(t.replace(/,/g, '.')))) return true;

  const banned = [
    "descripcion", "carta", "proceso", "elaboracion", "analisis", "receta", 
    "articulo", "ingrediente", "unidad", "unidades", "und", "cant", "cantidad",
    "merma", "coste", "costo", "valor", "venta", "matriz", "ingredientes", 
    "margen", "error", "ipo", "ganancia", "subtotal", "total", "porcentual",
    "hoja de", "formato", "variables", "parametros", "preparacion"
  ];

  return banned.some(w => t.includes(w));
}

/**
 * Busca el nombre de la receta hacia arriba del encabezado.
 * Ignora números y prioriza el texto más largo que contenga letras.
 */
function findRecipeTitle(matrix: any[][], headerRowIdx: number): { nombre: string; titleRowIdx: number } {
  // Busca hacia arriba hasta 20 filas
  for (let r = headerRowIdx - 1; r >= Math.max(0, headerRowIdx - 20); r--) {
    const row = matrix[r] || [];
    
    const candidates = row
      .filter(v => typeof v === "string") // Ignora valores que ya vienen como números en Excel
      .map(v => (v ?? "").toString().trim())
      .filter(v => 
        v.length >= 4 && 
        !isBadTitleCandidate(v) &&
        /[a-zA-Z]/.test(v) // ✅ El nombre debe contener al menos una letra
      );

    if (candidates.length > 0) {
      // Prioriza el texto más largo de la fila (suele ser el nombre real)
      const best = candidates.sort((a, b) => b.length - a.length)[0];
      return { nombre: best, titleRowIdx: r };
    }
  }

  return { nombre: `RECETA SIN NOMBRE (FILA ${headerRowIdx + 1})`, titleRowIdx: headerRowIdx };
}

function getValueInColumnInRange(matrix: any[][], startRow: number, endRow: number, colIdx: number): string {
  if (colIdx === -1) return "";
  for (let r = startRow; r <= endRow; r++) {
    const v = (matrix[r]?.[colIdx] ?? "").toString().trim();
    if (v && v.length >= 3) {
      return v;
    }
  }
  return "";
}

function getTextBelowLabelInBlock(matrix: any[][], startRow: number, endRow: number, labels: string[]): string {
  const targets = labels.map(normKey);
  for (let r = startRow; r <= endRow; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = normKey(row[c]);
      if (v && targets.some(t => v.includes(t))) {
        const result = (matrix[r + 1]?.[c] || matrix[r + 2]?.[c] || "").toString().trim();
        if (result) return result;
      }
    }
  }
  return "";
}

function recipeId(sheetName: string, headerRowIdx: number, nombre: string): string {
  return `${sheetName}::${headerRowIdx + 1}::${normKey(nombre)}`.replace(/\s+/g, '-');
}

function parseFamilySheet(sheetName: string, sheet: any): RecipeWithIngredients[] {
  const matrix = sheetToFullMatrixWide(sheet, 700, 50);
  const headerRows = findHeaderRows(matrix);
  const recipes: RecipeWithIngredients[] = [];

  for (let i = 0; i < headerRows.length; i++) {
    const headerRowIdx = headerRows[i];
    const nextHeader = (i < headerRows.length - 1) ? headerRows[i + 1] : matrix.length;
    const blockEnd = nextHeader - 1;

    const { nombre, titleRowIdx } = findRecipeTitle(matrix, headerRowIdx);

    const desc = getTextBelowLabelInBlock(matrix, headerRowIdx, Math.min(matrix.length - 1, headerRowIdx + 40), ["descripcion carta"]);
    const proc = getTextBelowLabelInBlock(matrix, headerRowIdx, Math.min(matrix.length - 1, headerRowIdx + 50), ["proceso de elaboracion", "proceso de elaboración", "preparacion", "procedimiento"]);
    const costo = getTextBelowLabelInBlock(matrix, headerRowIdx, Math.min(matrix.length - 1, headerRowIdx + 30), ["costo del plato"]);
    const venta = getTextBelowLabelInBlock(matrix, headerRowIdx, Math.min(matrix.length - 1, headerRowIdx + 30), ["valor de venta"]);

    const header = matrix[headerRowIdx] || [];
    const norm = header.map(normKey);
    const colItem = norm.findIndex(v => /art.?culo/.test(v) || v.includes("ingrediente"));
    const colUnd = norm.findIndex(v => v.includes("unidad") || v === "und");
    const colCant = norm.findIndex(v => v.includes("unidades") || v.includes("cantidad") || v.includes("cant"));
    const colCostoLin = norm.findIndex(v => v.includes("coste") || v.includes("costo") || v.includes("subtotal"));
    
    let colFoto = norm.findIndex(v => v === "foto" || v.includes("foto"));
    if (colFoto === -1) colFoto = 14; 

    const blockStartSearch = Math.max(0, titleRowIdx);
    const fotoValue = getValueInColumnInRange(matrix, blockStartSearch, blockEnd, colFoto);

    if (colItem === -1) continue;

    const items: Ingredient[] = [];
    for (let r = headerRowIdx + 1; r <= blockEnd; r++) {
      const articulo = (matrix[r]?.[colItem] ?? "").toString().trim();
      if (!articulo || normKey(articulo).includes("costo del plato") || normKey(articulo).includes("valor de venta")) break;

      items.push({
        id_receta: recipeId(sheetName, headerRowIdx, nombre),
        insumo: articulo,
        unidad: colUnd !== -1 ? (matrix[r]?.[colUnd] || "UND") : "UND",
        cantidad: colCant !== -1 ? matrix[r]?.[colCant] : 0,
        costo_linea: colCostoLin !== -1 ? (Number(String(matrix[r]?.[colCostoLin]).replace(/[^\d.-]/g, "")) || 0) : 0
      });
    }

    if (items.length > 0) {
      recipes.push({
        id_receta: recipeId(sheetName, headerRowIdx, nombre),
        familia: sheetName.toUpperCase(),
        categoria: "MATRIZ",
        nombre_receta: nombre.toUpperCase(),
        descripcion_carta: desc,
        descripcionCarta: desc,
        preparacion: proc,
        procesoElaboracion: proc,
        rendimiento: "1",
        unidad_rendimiento: "PORCIÓN",
        foto: fotoValue,
        ingredients: items,
        costo_plato: Math.round(Number(costo) || 0),
        valor_venta: Math.round(Number(venta) || 0)
      });
    }
  }

  return recipes;
}

export const parseHotWingsExcel = (arrayBuffer: ArrayBuffer): RecipeWithIngredients[] => {
  const XLSX = (window as any).XLSX;
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const excludedSheets = new Set(["INSUMOS", "DATOS", "CONFIG", "MATRIZ CARTA", "PORTADA", "PARAMETROS", "VARIABLES"]);

  console.log("%c--- INICIO DE PROCESAMIENTO MATRIZ HOTWINGS ---", "color: orange; font-weight: bold; font-size: 14px;");

  const results: RecipeWithIngredients[] = [];
  workbook.SheetNames.forEach(sheetName => {
    if (excludedSheets.has(sheetName.toUpperCase())) return;
    const sheetRecipes = parseFamilySheet(sheetName, workbook.Sheets[sheetName]);
    results.push(...sheetRecipes);
  });

  console.log(`%cTOTAL RECETAS DETECTADAS: ${results.length}`, "background: #22c55e; color: white; padding: 4px 10px; font-weight: bold; border-radius: 4px;");
  return results;
};
