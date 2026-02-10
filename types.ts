
export interface Recipe {
  id_receta: string;
  familia: string;
  categoria: string;
  nombre_receta: string;
  descripcion_carta: string;
  descripcionCarta?: string; 
  preparacion: string;
  procesoElaboracion?: string;
  rendimiento: string | number;
  unidad_rendimiento: string;
  foto: string;
  costo_plato?: number;
  valor_venta?: number;
}

export interface Ingredient {
  id_receta: string;
  insumo: string;
  cantidad: number | string;
  unidad: string;
  merma?: string | number;
  costo_linea?: number;
  notas?: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[];
}

declare global {
  interface Window {
    XLSX: any;
  }
}
