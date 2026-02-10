
import React from 'react';
import { Layers } from 'lucide-react';
import { RecipeWithIngredients } from '../types';

interface RecipeCardProps {
  recipe: RecipeWithIngredients;
  onClick: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  // Lógica de resolución de imagen
  const resolveImageUrl = (foto: string) => {
    if (!foto || foto.trim().length < 3) {
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop';
    }
    if (foto.startsWith('http')) {
      return foto;
    }
    // Si no es URL completa, asumimos que es un archivo en la carpeta de imágenes del proyecto
    return `/images/${foto}`;
  };

  const imageUrl = resolveImageUrl(recipe.foto);

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-56 overflow-hidden bg-gray-100">
        <img 
          src={imageUrl} 
          alt={recipe.nombre_receta}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=400&auto=format&fit=crop';
          }}
        />
        <div className="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
          {recipe.familia}
        </div>
        {recipe.valor_venta && recipe.valor_venta > 0 && (
          <div className="absolute bottom-4 right-4 bg-zinc-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xl border border-zinc-700">
            ${recipe.valor_venta.toLocaleString()}
          </div>
        )}
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-lg font-black text-gray-900 mb-2 line-clamp-2 uppercase tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
          {recipe.nombre_receta}
        </h3>
        
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span>{recipe.ingredients.length} INSUMOS</span>
          </div>
          <div className="bg-gray-100 px-2 py-1 rounded-lg text-[9px] font-black text-gray-500 uppercase">
            {recipe.categoria}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
