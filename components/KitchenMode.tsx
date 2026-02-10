
import React, { useEffect, useState } from 'react';
import { X, ListCheck, BookOpen, CheckCircle2, Circle, Clock, ChefHat } from 'lucide-react';
import { RecipeWithIngredients } from '../types';

interface KitchenModeProps {
  recipe: RecipeWithIngredients;
  onExit: () => void;
}

const KitchenMode: React.FC<KitchenModeProps> = ({ recipe, onExit }) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  
  // Intentar mantener la pantalla activa (Wake Lock API)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log("Wake Lock activo: La pantalla no se dormirá.");
        }
      } catch (err) {
        console.warn("No se pudo activar el Wake Lock:", err);
      }
    };
    
    requestWakeLock();
    
    // Re-activar si el usuario cambia de pestaña y vuelve
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const steps = recipe.preparacion ? recipe.preparacion.split('\n').filter(s => s.trim() !== '') : [];

  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col overflow-hidden select-none">
      {/* Barra Superior de Control */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Cocinando ahora</span>
            <h2 className="text-lg font-bold truncate max-w-[180px] sm:max-w-md">{recipe.nombre_receta}</h2>
          </div>
        </div>
        <button 
          onClick={onExit}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-red-600 text-gray-400 hover:text-white px-4 py-2 rounded-full transition-all active:scale-90"
        >
          <span className="text-sm font-bold">Salir</span>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selectores de Modo (Tabs Grandes) */}
      <div className="flex p-3 gap-3 bg-zinc-950">
        <button 
          onClick={() => setActiveTab('ingredients')}
          className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-lg transition-all ${
            activeTab === 'ingredients' 
            ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] scale-[1.02]' 
            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          <ListCheck className="w-6 h-6" />
          Insumos
        </button>
        <button 
          onClick={() => setActiveTab('steps')}
          className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-lg transition-all ${
            activeTab === 'steps' 
            ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] scale-[1.02]' 
            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          <BookOpen className="w-6 h-6" />
          Pasos
        </button>
      </div>

      {/* Área de Contenido Principal */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 pb-24">
        {activeTab === 'ingredients' ? (
          <div className="grid grid-cols-1 gap-3">
            {recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((ing, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleIngredient(idx)}
                  className={`flex items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
                    checkedIngredients.includes(idx) 
                    ? 'bg-zinc-900/50 border-zinc-800 opacity-30 scale-95' 
                    : 'bg-zinc-900 border-zinc-700 shadow-xl'
                  }`}
                >
                  {checkedIngredients.includes(idx) ? (
                    <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-10 h-10 text-orange-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="block text-2xl font-black text-white mb-1 uppercase tracking-tight">{ing.insumo}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-mono text-orange-400 font-black">{ing.cantidad}</span>
                      <span className="text-xl text-zinc-400 font-bold uppercase">{ing.unidad}</span>
                    </div>
                    {ing.notas && <p className="text-zinc-500 italic mt-1 text-lg">💡 {ing.notas}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-zinc-600">No hay ingredientes registrados.</div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {steps.length > 0 ? (
              steps.map((step, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`flex gap-6 p-8 rounded-[2rem] border-2 transition-all cursor-pointer active:scale-[0.99] ${
                    completedSteps.includes(idx) 
                    ? 'bg-zinc-900/50 border-zinc-800 opacity-30' 
                    : 'bg-zinc-900 border-zinc-700 shadow-xl'
                  }`}
                >
                  <div className={`flex-shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center font-black text-3xl shadow-lg ${
                    completedSteps.includes(idx) ? 'bg-zinc-800 text-zinc-600' : 'bg-orange-600 text-white'
                  }`}>
                    {idx + 1}
                  </div>
                  <p className={`text-3xl leading-snug font-bold ${
                    completedSteps.includes(idx) ? 'line-through text-zinc-600' : 'text-zinc-100'
                  }`}>
                    {step}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-zinc-600">No hay pasos de preparación registrados.</div>
            )}
          </div>
        )}
      </div>

      {/* Footer de Progreso */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-between items-center px-8">
        <div className="flex flex-col">
          <span className="text-zinc-500 text-[10px] font-bold uppercase">Progreso actual</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
               <div 
                className="h-full bg-orange-600 transition-all duration-500" 
                style={{ width: `${activeTab === 'ingredients' 
                  ? (checkedIngredients.length / recipe.ingredients.length) * 100 
                  : (completedSteps.length / steps.length) * 100}%` 
                }}
              ></div>
            </div>
            <span className="text-orange-500 font-black text-sm">
              {activeTab === 'ingredients' 
                ? `${checkedIngredients.length}/${recipe.ingredients.length}` 
                : `${completedSteps.length}/${steps.length}`
              }
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-zinc-500">
           <div className="flex flex-col items-end">
             <span className="text-[10px] uppercase font-bold">Rendimiento</span>
             <span className="text-white font-bold">{recipe.rendimiento} {recipe.unidad_rendimiento}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenMode;
