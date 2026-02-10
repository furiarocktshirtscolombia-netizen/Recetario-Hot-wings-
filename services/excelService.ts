
import { RecipeWithIngredients, Ingredient } from '../types';

export const parseHotWingsExcel = (arrayBuffer: ArrayBuffer): RecipeWithIngredients[] => {
  const data = new Uint8Array(arrayBuffer);
  const workbook = (window as any).XLSX.read(data, { type: 'array' });
  const allRecipes: RecipeWithIngredients[] = [];
  
  // 1. Primero buscamos si existe una hoja de "INFO" para metadata extra (Fotos/Prep)
  const infoMap = new Map<string, { foto: string, preparacion: string, descripcion: string }>();
  const infoSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('info'));
  
  if (infoSheetName) {
    const infoRows: any[][] = (window as any).XLSX.utils.sheet_to_json(workbook.Sheets[infoSheetName], { header: 1 });
    infoRows.forEach(row => {
      const nombre = row[0]?.toString().trim().toUpperCase();
      if (nombre) {
        infoMap.set(nombre, {
          foto: row[2] || "",
          preparacion: row[3] || "",
          descripcion: row[4] || ""
        });
      }
    });
  }

  workbook.SheetNames.forEach((sheetName: string) => {
    const skipSheets = ['insumos', 'matriz carta', 'hoja1', 'hoja2', 'datos', 'info', 'recetas_info'];
    if (skipSheets.some(s => sheetName.toLowerCase().includes(s))) return;

    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = (window as any).XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let currentRecipe: Partial<RecipeWithIngredients> | null = null;
    let capturingPrep = false;

    rows.forEach((row, index) => {
      const cellA = row[0]?.toString().trim();
      
      // DETECTAR NUEVA RECETA (Título en Mayúsculas, sin datos al lado)
      if (cellA && cellA.length > 3 && !row[1] && isNaN(Number(cellA))) {
        if (currentRecipe && (currentRecipe as any).ingredients?.length > 0) {
          allRecipes.push(currentRecipe as RecipeWithIngredients);
        }

        capturingPrep = false;
        const nombreUpper = cellA.toUpperCase();
        const extraInfo = infoMap.get(nombreUpper);

        currentRecipe = {
          id_receta: `R-${sheetName}-${index}`,
          nombre_receta: cellA,
          familia: sheetName,
          categoria: "CARTA",
          descripcion_carta: extraInfo?.descripcion || "Receta estándar de matriz de costos.",
          preparacion: extraInfo?.preparacion || "",
          rendimiento: "1",
          unidad_rendimiento: "PORCIÓN",
          foto: extraInfo?.foto || "",
          ingredients: []
        };
      }

      if (!currentRecipe) return;

      // DETECTAR INICIO DE PREPARACIÓN DENTRO DE LA HOJA
      const cellALower = cellA?.toLowerCase() || "";
      if (cellALower.includes('preparacion') || cellALower.includes('procedimiento') || cellALower.includes('pasos')) {
        capturingPrep = true;
        return;
      }

      // Si estamos capturando preparación y la celda A tiene texto pero no es un ingrediente (no tiene unidad en B)
      if (capturingPrep && cellA && !row[1]) {
        currentRecipe.preparacion += (currentRecipe.preparacion ? '\n' : '') + cellA;
      }

      // DETECTAR INGREDIENTES (Debe tener nombre y unidad)
      if (!capturingPrep && cellA && row[1]) {
        const lowerVal = cellA.toLowerCase();
        if (lowerVal.includes('artículo') || lowerVal.includes('ingrediente') || lowerVal.includes('insumo')) return;

        // Limpiar cantidad (redondear a 2 decimales para evitar el 19.99999)
        const rawCant = parseFloat(row[2]);
        const cantidad = !isNaN(rawCant) ? Math.round(rawCant * 100) / 100 : row[2];
        
        const rawCosto = parseFloat(row[4]);
        const costo_linea = !isNaN(rawCosto) ? Math.round(rawCosto * 100) / 100 : row[4];

        const ingredient: Ingredient = {
          id_receta: currentRecipe.id_receta!,
          insumo: cellA,
          unidad: row[1].toString(),
          cantidad: cantidad,
          costo_linea: costo_linea
        };
        
        if (!currentRecipe.ingredients) currentRecipe.ingredients = [];
        currentRecipe.ingredients.push(ingredient);
      }
    });

    if (currentRecipe && (currentRecipe as any).ingredients?.length > 0) {
      allRecipes.push(currentRecipe as RecipeWithIngredients);
    }
  });

  return allRecipes;
};

export const fetchRecipesFromExcel = async (): Promise<RecipeWithIngredients[]> => {
  const timestamp = new Date().getTime();
  const excelUrl = `./data/recetario.xlsx?v=${timestamp}`;

  try {
    const response = await fetch(excelUrl);
    if (!response.ok) throw new Error("No se encontró el Excel en /data/recetario.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    return parseHotWingsExcel(arrayBuffer);
  } catch (error) {
    throw error;
  }
};
