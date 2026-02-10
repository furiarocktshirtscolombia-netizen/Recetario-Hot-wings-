
export interface Recipe {
  id_receta: string;
  familia: string;
  categoria: string;
  nombre_receta: string;
  descripcion_carta: string;
  preparacion: string;
  rendimiento: string | number;
  unidad_rendimiento: string;
  foto: string;
  // Campos financieros de la Matriz
  costo_plato?: number;
  valor_venta?: number;
}

export interface Ingredient {
  id_receta: string;
  insumo: string;
  cantidad: number | string;
  unidad: string;
  notas?: string;
  costo_linea?: number;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[];
}

declare global {
  interface Window {
    XLSX: any;
  }
}
