
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
    <div className="fixed inset-0 bg-hw-bg text-hw-text z-50 flex flex-col overflow-hidden select-none">
      {/* Barra Superior de Control */}
      <div className="flex items-center justify-between p-4 border-b border-hw-border bg-hw-surface2 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-hw-orange p-2 rounded-lg">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-hw-orange text-[10px] font-black uppercase tracking-[0.2em]">Cocinando ahora</span>
            <h2 className="text-lg font-black truncate max-w-[180px] sm:max-w-md uppercase tracking-tight">{recipe.nombre_receta}</h2>
          </div>
        </div>
        <button 
          onClick={onExit}
          className="flex items-center gap-2 bg-hw-surface hover:bg-red-600 text-hw-muted hover:text-white px-4 py-2 rounded-full transition-all active:scale-90 border border-hw-border"
        >
          <span className="text-sm font-bold">Salir</span>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selectores de Modo (Tabs Grandes) */}
      <div className="flex p-3 gap-3 bg-hw-bg">
        <button 
          onClick={() => setActiveTab('ingredients')}
          className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-lg transition-all ${
            activeTab === 'ingredients' 
            ? 'bg-hw-orange text-white shadow-[0_0_20px_rgba(255,77,45,0.3)] scale-[1.02]' 
            : 'bg-hw-surface text-hw-muted border border-hw-border'
          }`}
        >
          <ListCheck className="w-6 h-6" />
          Insumos
        </button>
        <button 
          onClick={() => setActiveTab('steps')}
          className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-lg transition-all ${
            activeTab === 'steps' 
            ? 'bg-hw-orange text-white shadow-[0_0_20px_rgba(255,77,45,0.3)] scale-[1.02]' 
            : 'bg-hw-surface text-hw-muted border border-hw-border'
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
                    ? 'bg-hw-surface2 border-hw-border opacity-30 scale-95' 
                    : 'bg-hw-surface border-hw-border shadow-xl'
                  }`}
                >
                  {checkedIngredients.includes(idx) ? (
                    <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-10 h-10 text-hw-orange flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="block text-2xl font-black text-hw-text mb-1 uppercase tracking-tight">{ing.insumo}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-mono text-hw-orange font-black">{ing.cantidad}</span>
                      <span className="text-xl text-hw-muted font-bold uppercase">{ing.unidad}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-hw-muted font-black uppercase">No hay ingredientes registrados.</div>
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
                    ? 'bg-hw-surface2 border-hw-border opacity-30' 
                    : 'bg-hw-surface border-hw-border shadow-xl'
                  }`}
                >
                  <div className={`flex-shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center font-black text-3xl shadow-lg ${
                    completedSteps.includes(idx) ? 'bg-hw-surface2 text-hw-muted' : 'bg-hw-orange text-white'
                  }`}>
                    {idx + 1}
                  </div>
                  <p className={`text-3xl leading-snug font-black ${
                    completedSteps.includes(idx) ? 'line-through text-hw-muted' : 'text-hw-text'
                  }`}>
                    {step}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-hw-muted font-black uppercase">No hay pasos de preparación registrados.</div>
            )}
          </div>
        )}
      </div>

      {/* Footer de Progreso */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-hw-surface2/90 backdrop-blur-md border-t border-hw-border flex justify-between items-center px-8">
        <div className="flex flex-col">
          <span className="text-hw-muted text-[10px] font-bold uppercase tracking-widest">Progreso actual</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-hw-bg rounded-full overflow-hidden border border-hw-border">
               <div 
                className="h-full bg-hw-orange transition-all duration-500 shadow-[0_0_10px_rgba(255,77,45,0.5)]" 
                style={{ width: `${activeTab === 'ingredients' 
                  ? (checkedIngredients.length / (recipe.ingredients.length || 1)) * 100 
                  : (completedSteps.length / (steps.length || 1)) * 100}%` 
                }}
              ></div>
            </div>
            <span className="text-hw-orange font-black text-sm">
              {activeTab === 'ingredients' 
                ? `${checkedIngredients.length}/${recipe.ingredients.length}` 
                : `${completedSteps.length}/${steps.length}`
              }
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-hw-muted">
           <div className="flex flex-col items-end">
             <span className="text-[10px] uppercase font-bold tracking-widest">Rendimiento</span>
             <span className="text-hw-text font-black uppercase">{recipe.rendimiento} {recipe.unidad_rendimiento}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenMode;
