
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChefHat, Search, Upload, ChevronRight, LayoutGrid, ArrowLeft, Utensils } from 'lucide-react';
import { RecipeWithIngredients } from './types';
import { parseHotWingsExcel } from './services/excelService';
import { fetchRecipesFromJson } from './services/dataService';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFamily, setCurrentFamily] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const data = await fetchRecipesFromJson();
        if (data && data.length > 0) setRecipes(data);
      } catch (err: any) {
        console.warn("Esperando carga manual de Excel.");
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        const data = parseHotWingsExcel(ab);
        if (data.length === 0) throw new Error("No se detectaron recetas compatibles. Revisa el formato del archivo.");
        setRecipes(data);
        setCurrentFamily(null);
        setSelectedRecipeId(null);
      } catch (err: any) {
        setError(err.message || "Error al procesar el Excel.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const families = useMemo(() => {
    const uniqueFamilies = [...new Set(recipes.map(r => r.familia))].filter(Boolean);
    return uniqueFamilies.sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        r.nombre_receta.toLowerCase().includes(searchLower) ||
        r.ingredients.some(i => (i.insumo || "").toLowerCase().includes(searchLower));
      
      const matchesFamily = r.familia === currentFamily;
      return matchesSearch && matchesFamily;
    });
  }, [recipes, searchTerm, currentFamily]);

  const selectedRecipe = useMemo(() => 
    recipes.find(r => r.id_receta === selectedRecipeId), 
  [recipes, selectedRecipeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-orange-600">
        <ChefHat className="w-20 h-20 animate-bounce mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-xs text-zinc-400">Analizando Matrix Operativa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => { setCurrentFamily(null); setSelectedRecipeId(null); }}
          >
            <div className="bg-zinc-900 p-2 rounded-xl shadow-lg">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tighter uppercase">
              HotWings<span className="text-orange-600">Matriz</span>
            </h1>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-900 transition-all flex items-center gap-2 shadow-lg shadow-orange-100"
          >
            <Upload className="w-4 h-4" />
            Sincronizar Excel
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {error && (
          <div className="bg-red-50 text-red-700 p-6 rounded-3xl border-l-8 border-red-500 mb-8 font-bold">
            {error}
          </div>
        )}

        {selectedRecipeId && selectedRecipe ? (
          <RecipeDetail 
            recipe={selectedRecipe} 
            onBack={() => setSelectedRecipeId(null)} 
          />
        ) : currentFamily ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button 
                  onClick={() => setCurrentFamily(null)}
                  className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-widest mb-2 hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a Familias
                </button>
                <h2 className="text-4xl font-black text-zinc-900 uppercase italic tracking-tighter leading-none">
                  {currentFamily}
                </h2>
                <p className="text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-widest">
                  {filteredRecipes.length} Recetas encontradas
                </p>
              </div>
              
              <div className="relative max-w-md w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Buscar en esta familia..."
                  className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-orange-100 transition font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard 
                  key={recipe.id_receta} 
                  recipe={recipe} 
                  onClick={() => setSelectedRecipeId(recipe.id_receta)} 
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 text-center py-10">
            <div className="mb-12">
              <h2 className="text-5xl font-black text-zinc-900 uppercase tracking-tighter italic">Base de Recetas</h2>
              <p className="text-gray-400 font-medium mt-2">Explora la matriz técnica completa de Hot Wings</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {families.map(family => {
                const count = recipes.filter(r => r.familia === family).length;
                return (
                  <button 
                    key={family}
                    onClick={() => setCurrentFamily(family)}
                    className="group relative bg-white p-12 rounded-[3rem] shadow-xl border-b-8 border-gray-100 hover:border-orange-600 hover:-translate-y-2 transition-all text-left overflow-hidden"
                  >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <span className="text-orange-600 font-black text-xs uppercase tracking-[0.2em] mb-4">Familia</span>
                      <h3 className="text-3xl font-black text-zinc-900 uppercase leading-none">{family}</h3>
                      <div className="mt-8 flex items-center justify-between">
                        <span className="text-gray-400 font-bold text-sm">
                          {count} Recetas
                        </span>
                        <div className="bg-gray-50 p-2 rounded-full group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                    <LayoutGrid className="absolute -right-10 -bottom-10 w-48 h-48 text-gray-50 group-hover:text-orange-50/50 transition-colors" />
                  </button>
                );
              })}

              {families.length === 0 && (
                <div className="col-span-full bg-white p-20 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center">
                  <Utensils className="w-20 h-20 text-gray-100 mb-6" />
                  <p className="text-gray-400 font-bold text-xl mb-6">Matriz vacía. Por favor cargue el archivo de costos.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="py-10 text-center border-t border-gray-100">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">Hot Wings Master Recipe System v3.6</p>
      </footer>
    </div>
  );
};

export default App;
