
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

  // Palabras que NO pueden ser nombre de receta
  const banned = [
    "descripcion", "carta",
    "proceso", "elaboracion", "elaboración",
    "analisis", "análisis",
    "articulo", "artículo",
    "unidad", "unidades",
    "merma", "coste", "costo",
    "valor", "venta",
    "matriz", "ingredientes"
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
 */
const findHeaderRows = (matrix: any[][]): number[] => {
  const headerRows: number[] = [];
  for (let r = 0; r < matrix.length; r++) {
    const row = (matrix[r] || []).map(normKey);
    // Regex para detectar "Artículo" incluso con mojibake (ArtÃ­culo)
    const hasArticulo = row.some(v => /art.?culo/.test(v) || v.includes("articulo") || v.includes("art culo"));
    const hasMerma = row.some(v => v.includes("merma"));
    
    if (hasArticulo && hasMerma) {
      headerRows.push(r);
    }
  }
  return headerRows;
};

/**
 * Versión PRO de findRecipeTitle: Busca hacia arriba y escoge el mejor texto "tipo título"
 * filtrando etiquetas técnicas indeseadas.
 */
const findRecipeTitle = (matrix: any[][], headerRowIdx: number): { nombre: string, titleRowIdx: number } => {
  let best = "";
  let bestRow = headerRowIdx;

  for (let r = headerRowIdx - 1; r >= Math.max(0, headerRowIdx - 15); r--) {
    const row = matrix[r] || [];

    // Tomamos solo textos con longitud razonable que no sean etiquetas técnicas
    const candidates = row
      .map(v => (v ?? "").toString().trim())
      .filter(v => v.length >= 4 && !isBadTitleCandidate(v));

    // Preferencia: el más largo (suele ser el nombre completo)
    const localBest = candidates.sort((a, b) => b.length - a.length)[0];

    if (localBest) {
      best = localBest;
      bestRow = r;
      break; // primer match bueno hacia arriba
    }
  }

  // Fallback si no encuentra
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
        // El valor está justo debajo
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

  console.log("--- PROCESANDO EXCEL (VERSIÓN PRO) ---");
  console.log("Hojas detectadas:", workbook.SheetNames);

  workbook.SheetNames.forEach((sheetName: string) => {
    if (excludedSheets.has(sheetName.toUpperCase())) return;

    const sheet = workbook.Sheets[sheetName];
    const matrix: any[][] = (window as any).XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    if (!matrix || matrix.length === 0) return;

    const headerRowsIdx = findHeaderRows(matrix);
    console.log(`🔎 Hoja [${sheetName}]: ${headerRowsIdx.length} bloques detectados.`);

    headerRowsIdx.forEach((hrIdx) => {
      const headerRow = matrix[hrIdx] || [];
      const { nombre, titleRowIdx } = findRecipeTitle(matrix, hrIdx);
      
      console.log("📌 Título detectado:", nombre, "en hoja:", sheetName, "headerRow:", hrIdx+1);

      // Identificación dinámica de columnas
      const colArticulo = findColIndex(headerRow, ["articulo", "artículo", "Articulo", "ArtÃ­culo"]);
      const colUnidad = findColIndex(headerRow, ["unidad medida", "unidad", "udm", "und"]);
      const colCant = findColIndex(headerRow, ["unidades netas", "cantidad", "cant", "unidades"]);
      const colMerma = findColIndex(headerRow, ["% merma", "merma"]);
      const colCostoLin = findColIndex(headerRow, ["coste linea", "costo linea", "subtotal", "valor total"]);

      if (colArticulo === -1) {
        console.warn(`No se encontró columna 'Artículo' en receta ${nombre}. Saltando bloque.`);
        return;
      }

      const ingredients: Ingredient[] = [];
      // Leer ingredientes hacia abajo hasta encontrar fin de bloque
      for (let r = hrIdx + 1; r < matrix.length; r++) {
        const articulo = (matrix[r]?.[colArticulo] ?? "").toString().trim();
        // Fin de ingredientes si Artículo está vacío o es un totalizador
        if (!articulo || normKey(articulo).includes("costo del plato") || normKey(articulo).includes("valor de venta")) break;

        const unidad = colUnidad !== -1 ? (matrix[r]?.[colUnidad] ?? "").toString().trim() : "";
        const cantidad = colCant !== -1 ? matrix[r]?.[colCant] : "";
        const merma = colMerma !== -1 ? matrix[r]?.[colMerma] : "";
        const costoLinea = colCostoLin !== -1 ? matrix[r]?.[colCostoLin] : 0;

        ingredients.push({
          id_receta: `R-${sheetName}-${titleRowIdx}`,
          insumo: articulo,
          unidad: unidad,
          cantidad: !isNaN(parseFloat(cantidad)) ? Math.round(parseFloat(cantidad) * 100) / 100 : cantidad,
          merma: merma,
          costo_linea: typeof costoLinea === "number" ? Math.round(costoLinea) : 0
        });
      }

      // Definir rango de búsqueda para metadatos del bloque
      const blockStart = titleRowIdx;
      const blockEnd = Math.min(matrix.length - 1, hrIdx + ingredients.length + 30);

      const descripcionCarta = getTextBelowLabelInBlock(
        matrix, 
        blockStart, 
        blockEnd, 
        ["descripcion de la carta", "descripcion carta"]
      );

      const procesoElaboracion = getTextBelowLabelInBlock(
        matrix, 
        blockStart, 
        blockEnd, 
        ["proceso de elaboracion", "proceso de elaboración", "preparacion", "preparación", "procedimiento"]
      );

      // Extraer costos del plato
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

      // Fix: Removing 'nombreReceta' and 'nombre' properties to comply with RecipeWithIngredients interface
      allRecipes.push({
        id_receta: `R-${sheetName}-${titleRowIdx}-${hrIdx}`,
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
      });
    });
  });

  const recipesTotal = allRecipes.length;
  const familiesTotal = [...new Set(allRecipes.map(r => r.familia))].length;
  console.log(`✅ ÉXITO: ${recipesTotal} recetas cargadas en ${familiesTotal} familias.`);

  return allRecipes;
};
