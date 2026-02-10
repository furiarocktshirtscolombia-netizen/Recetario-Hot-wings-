
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
    return `/images/${foto}`;
  };

  const imageUrl = resolveImageUrl(recipe.foto);

  return (
    <div 
      onClick={onClick}
      className="group bg-hw-surface rounded-[2rem] overflow-hidden border border-hw-border shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-56 overflow-hidden bg-hw-surface2">
        <img 
          src={imageUrl} 
          alt={recipe.nombre_receta}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=400&auto=format&fit=crop';
          }}
        />
        <div className="absolute top-4 left-4 bg-hw-orange text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
          {recipe.familia}
        </div>
        {recipe.valor_venta && recipe.valor_venta > 0 && (
          <div className="absolute bottom-4 right-4 bg-hw-bg/90 backdrop-blur-md text-hw-text px-3 py-1.5 rounded-xl text-xs font-black shadow-xl border border-hw-border">
            ${recipe.valor_venta.toLocaleString()}
          </div>
        )}
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-lg font-black text-hw-text mb-2 line-clamp-2 uppercase tracking-tight leading-tight group-hover:text-hw-orange transition-colors">
          {recipe.nombre_receta}
        </h3>
        
        <div className="mt-auto pt-4 border-t border-hw-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-hw-muted uppercase">
            <Layers className="w-3.5 h-3.5 text-hw-orange" />
            <span>{recipe.ingredients.length} INSUMOS</span>
          </div>
          <div className="bg-hw-surface2 px-2 py-1 rounded-lg text-[9px] font-black text-hw-muted uppercase border border-hw-border">
            {recipe.categoria}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
