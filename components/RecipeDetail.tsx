
import React from 'react';
import { ChevronLeft, Play, UtensilsCrossed, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { RecipeWithIngredients } from '../types';

interface RecipeDetailProps {
  recipe: RecipeWithIngredients;
  onBack: () => void;
  onEnterKitchenMode: () => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack, onEnterKitchenMode }) => {
  const imageUrl = recipe.foto ? recipe.foto : `https://picsum.photos/seed/${recipe.id_receta}/800/600`;
  const steps = recipe.preparacion.split('\n').filter(s => s.trim() !== '');

  const margin = recipe.valor_venta && recipe.costo_plato 
    ? ((recipe.valor_venta - recipe.costo_plato) / recipe.valor_venta * 100).toFixed(1) 
    : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-orange-600 font-bold transition group">
          <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100 group-hover:bg-orange-50">
            <ChevronLeft className="w-5 h-5" />
          </div>
          Volver al Menú
        </button>
        <button onClick={onEnterKitchenMode} className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-700 hover:scale-105 active:scale-95 transition">
          <Play className="w-5 h-5 fill-current" />
          MODO COCINA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-square bg-gray-100 border-8 border-white">
             <img src={imageUrl} alt={recipe.nombre_receta} className="w-full h-full object-cover" />
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
            <div>
              <span className="text-xs font-black text-orange-500 uppercase tracking-[0.3em]">{recipe.familia}</span>
              <h2 className="text-3xl font-black text-gray-900 leading-none mt-1 uppercase tracking-tighter">{recipe.nombre_receta}</h2>
            </div>

            {recipe.valor_venta && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-orange-400 uppercase">Costo Matriz</span>
                  <span className="text-xl font-black text-orange-700">${recipe.costo_plato?.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-orange-400 uppercase">Venta Sugerida</span>
                  <span className="text-xl font-black text-orange-900">${recipe.valor_venta?.toLocaleString()}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-orange-200 flex items-center justify-between">
                  <span className="text-[10px] font-black text-orange-500 uppercase">Margen Bruto</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="font-black text-green-700">{margin}%</span>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-gray-500 leading-relaxed italic text-sm">"{recipe.descripcion_carta}"</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-orange-600 rounded-full"></div>
              MATRIZ DE INGREDIENTES
            </h3>
            <div className="overflow-hidden rounded-2xl border border-gray-50">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-gray-400 uppercase text-[10px] font-black tracking-widest">
                    <th className="py-4 px-4">Artículo / Insumo</th>
                    <th className="py-4 px-4 text-right">Cant.</th>
                    <th className="py-4 px-4">Unidad</th>
                    {recipe.ingredients[0]?.costo_linea && <th className="py-4 px-4 text-right">Costo</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recipe.ingredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-4 px-4 font-black text-gray-700">{ing.insumo}</td>
                      <td className="py-4 px-4 text-right font-mono text-orange-600 font-black text-lg">{ing.cantidad}</td>
                      <td className="py-4 px-4 text-gray-500 font-bold uppercase text-xs">{ing.unidad}</td>
                      {ing.costo_linea && (
                        <td className="py-4 px-4 text-right font-mono text-gray-400 text-sm">
                          ${ing.costo_linea.toLocaleString()}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-zinc-900 rounded-full"></div>
              PROCESO DE ELABORACIÓN
            </h3>
            <div className="grid gap-4">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                  <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shadow-lg">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
              {steps.length === 0 && <p className="text-gray-400 italic bg-gray-50 p-6 rounded-2xl text-center">No se ha registrado el proceso detallado para esta receta.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
