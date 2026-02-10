
import { RecipeWithIngredients, Ingredient } from '../types';

/**
 * Normalización robusta para manejar tildes, caracteres invisibles y errores de codificación.
 */
const normKey = (x: any): string => {
  let s = (x ?? "").toString().toLowerCase();
  // Quitar diacríticos
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Quitar caracteres invisibles/basura (soft hyphens, etc.)
  s = s.replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "");
  // Normalizar espacios
  return s.replace(/\s+/g, " ").trim();
};

/**
 * Filtra candidatos a título que contienen palabras clave técnicas o de etiquetas.
 */
const isBadTitleCandidate = (txt: any): boolean => {
  const t = normKey(txt);
  if (!t) return true;

  const banned = [
    "descripcion", "carta", "proceso", "elaboracion", "elaboración",
    "analisis", "análisis", "articulo", "artículo", "unidad", "unidades",
    "merma", "coste", "costo", "valor", "venta", "matriz", "ingredientes"
  ];

  return banned.some(w => t.includes(w));
};

/**
 * Encuentra el índice de una columna buscando coincidencias en una lista de nombres posibles.
 */
const findColIndex = (headerRow: any[], candidates: string[]): number => {
  const normalizedHeader = (headerRow || []).map(normKey);
  for (let i = 0; i < normalizedHeader.length; i++) {
    const cell = normalizedHeader[i];
    if (!cell) continue;
    if (candidates.some(c => cell.includes(normKey(c)))) return i;
  }
  return -1;
};

/**
 * Busca las filas que actúan como encabezado de tabla de ingredientes.
 * Versión Flexible: Artículo + (Merma OR Unidad OR Coste/Costo)
 */
const findHeaderRows = (matrix: any[][]): number[] => {
  const headerRows: number[] = [];
  for (let r = 0; r < matrix.length; r++) {
    const row = (matrix[r] || []).map(normKey);
    
    const hasArticulo = row.some(v => /art.?culo/.test(v) || v.includes("articulo") || v.includes("art culo"));
    const hasMerma = row.some(v => v.includes("merma"));
    const hasUnidad = row.some(v => v.includes("unidad") || v.includes("udm"));
    const hasCosto = row.some(v => v.includes("costo") || v.includes("coste"));
    
    if (hasArticulo && (hasMerma || hasUnidad || hasCosto)) {
      headerRows.push(r);
    }
  }
  return headerRows;
};

/**
 * Busca el nombre de la receta mirando hacia arriba y escoge el mejor texto "tipo título".
 */
const findRecipeTitle = (matrix: any[][], headerRowIdx: number): { nombre: string, titleRowIdx: number } => {
  let best = "";
  let bestRow = headerRowIdx;

  for (let r = headerRowIdx - 1; r >= Math.max(0, headerRowIdx - 15); r--) {
    const row = matrix[r] || [];
    const candidates = row
      .map(v => (v ?? "").toString().trim())
      .filter(v => v.length >= 4 && !isBadTitleCandidate(v));

    const localBest = candidates.sort((a, b) => b.length - a.length)[0];

    if (localBest) {
      best = localBest;
      bestRow = r;
      break;
    }
  }

  if (!best) {
    best = `RECETA SIN NOMBRE (FILA ${headerRowIdx + 1})`;
  }

  return { nombre: best, titleRowIdx: bestRow };
};

/**
 * Busca una etiqueta en un bloque de celdas y devuelve el valor de la celda de abajo.
 */
const getTextBelowLabelInBlock = (matrix: any[][], startRow: number, endRow: number, labels: string[]): string => {
  const targets = labels.map(normKey);
  for (let r = startRow; r <= endRow; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = normKey(row[c]);
      if (targets.some(t => cellVal.includes(t))) {
        return (matrix[r + 1]?.[c] ?? "").toString().trim();
      }
    }
  }
  return "";
};

export const parseHotWingsExcel = (arrayBuffer: ArrayBuffer): RecipeWithIngredients[] => {
  const data = new Uint8Array(arrayBuffer);
  const workbook = (window as any).XLSX.read(data, { type: 'array' });
  const allRecipes: RecipeWithIngredients[] = [];
  const excludedSheets = new Set(["INSUMOS", "MATRIZ CARTA", "DATOS", "CONFIG", "HOJA1", "MATRIZ"]);

  console.log("--- INICIO DE PROCESAMIENTO EXCEL (VERSIÓN PRO V2) ---");

  workbook.SheetNames.forEach((sheetName: string) => {
    if (excludedSheets.has(sheetName.toUpperCase())) return;

    const sheet = workbook.Sheets[sheetName];
    const matrix: any[][] = (window as any).XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    if (!matrix || matrix.length === 0) return;

    const headerRowsIdx = findHeaderRows(matrix);
    const sheetRecipes: RecipeWithIngredients[] = [];

    headerRowsIdx.forEach((hrIdx) => {
      const headerRow = matrix[hrIdx] || [];
      const { nombre, titleRowIdx } = findRecipeTitle(matrix, hrIdx);
      
      const colArticulo = findColIndex(headerRow, ["articulo", "artículo", "Articulo", "ArtÃ­culo"]);
      const colUnidad = findColIndex(headerRow, ["unidad medida", "unidad", "udm", "und"]);
      const colCant = findColIndex(headerRow, ["unidades netas", "cantidad", "cant", "unidades"]);
      const colMerma = findColIndex(headerRow, ["% merma", "merma"]);
      const colCostoLin = findColIndex(headerRow, ["coste linea", "costo linea", "subtotal", "valor total"]);

      if (colArticulo === -1) return;

      const ingredients: Ingredient[] = [];
      for (let r = hrIdx + 1; r < matrix.length; r++) {
        const articulo = (matrix[r]?.[colArticulo] ?? "").toString().trim();
        if (!articulo || normKey(articulo).includes("costo del plato") || normKey(articulo).includes("valor de venta")) break;

        const unidad = colUnidad !== -1 ? (matrix[r]?.[colUnidad] ?? "").toString().trim() : "";
        const cantidad = colCant !== -1 ? matrix[r]?.[colCant] : "";
        const merma = colMerma !== -1 ? matrix[r]?.[colMerma] : "";
        const costoLinea = colCostoLin !== -1 ? matrix[r]?.[colCostoLin] : 0;

        ingredients.push({
          id_receta: `${sheetName}::${hrIdx}::${nombre}`, // ID basado en fila header para unicidad absoluta
          insumo: articulo,
          unidad,
          cantidad: !isNaN(parseFloat(cantidad)) ? Math.round(parseFloat(cantidad) * 100) / 100 : cantidad,
          merma,
          costo_linea: typeof costoLinea === "number" ? Math.round(costoLinea) : 0
        });
      }

      const blockStart = titleRowIdx;
      const blockEnd = Math.min(matrix.length - 1, hrIdx + ingredients.length + 30);

      const descripcionCarta = getTextBelowLabelInBlock(matrix, blockStart, blockEnd, ["descripcion de la carta", "descripcion carta"]);
      const procesoElaboracion = getTextBelowLabelInBlock(matrix, blockStart, blockEnd, ["proceso de elaboracion", "proceso de elaboración", "preparacion", "preparación", "procedimiento"]);

      let costo_plato = 0;
      let valor_venta = 0;
      for (let r = hrIdx; r <= blockEnd; r++) {
        const row = matrix[r] || [];
        row.forEach((cell, cIdx) => {
          const text = normKey(cell);
          if (text.includes("costo del plato")) {
            const val = row[cIdx + 1] || row[cIdx + 2];
            if (val) costo_plato = Math.round(parseFloat(val.toString().replace(/[^0-9.]/g, '')));
          }
          if (text.includes("valor de venta")) {
            const val = row[cIdx + 1] || row[cIdx + 2];
            if (val) valor_venta = Math.round(parseFloat(val.toString().replace(/[^0-9.]/g, '')));
          }
        });
      }

      const newRecipe: RecipeWithIngredients = {
        id_receta: `${sheetName}::${hrIdx}::${nombre}`,
        nombre_receta: nombre,
        familia: sheetName,
        categoria: "CARTA",
        descripcion_carta: descripcionCarta,
        descripcionCarta: descripcionCarta,
        preparacion: procesoElaboracion,
        procesoElaboracion: procesoElaboracion,
        rendimiento: "1",
        unidad_rendimiento: "PORCIÓN",
        foto: "",
        ingredients,
        costo_plato,
        valor_venta
      };

      sheetRecipes.push(newRecipe);
    });

    // Diagnóstico específico solicitado para ENTRE PANES
    if (sheetName.toUpperCase() === "ENTRE PANES") {
      console.log(`[DIAGNÓSTICO] Hoja 'ENTRE PANES' detectó ${sheetRecipes.length} recetas.`);
      console.table(sheetRecipes.map(r => ({ nombre: r.nombre_receta, id: r.id_receta })));
    }

    allRecipes.push(...sheetRecipes);
  });

  console.log(`--- FIN PROCESAMIENTO: ${allRecipes.length} recetas totales ---`);
  return allRecipes;
};
