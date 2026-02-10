import { RecipeWithIngredients } from '../types';

/**
 * Carga el archivo JSON con todas las recetas e ingredientes.
 * Se utiliza cache-busting para asegurar que los cambios se vean al refrescar.
 */
export const fetchRecipesFromJson = async (): Promise<RecipeWithIngredients[]> => {
  const timestamp = new Date().getTime();
  // Usamos una ruta relativa directa para maximizar compatibilidad
  const url = `data/recetario.json?v=${timestamp}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudo encontrar el archivo de datos.`);
    }
    const data = await response.json();
    
    // Soporta tanto si el JSON es un array directo como si viene envuelto en { "recetas": [...] }
    if (Array.isArray(data)) {
      return data as RecipeWithIngredients[];
    } else if (data && data.recetas && Array.isArray(data.recetas)) {
      return data.recetas as RecipeWithIngredients[];
    }
    
    throw new Error("El formato del JSON no es válido (se esperaba un array o un objeto con la clave 'recetas')");
  } catch (error) {
    console.error("Error en dataService:", error);
    throw error;
  }
};