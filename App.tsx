
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, ChefHat, AlertCircle, Sparkles, Search, FileSpreadsheet, Upload } from 'lucide-react';
import { RecipeWithIngredients } from './types';
import { fetchRecipesFromJson } from './services/dataService';
import { parseHotWingsExcel } from './services/excelService';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import KitchenMode from './components/KitchenMode';

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [isKitchenMode, setIsKitchenMode] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Intento 1: Cargar JSON (para GitHub Pages / Producción)
      const data = await fetchRecipesFromJson();
      setRecipes(data);
    } catch (err: any) {
      console.warn("No se pudo cargar JSON, esperando acción manual o Excel.");
      setError("No encontramos datos automáticos. Sube tu Excel o usa datos de prueba.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        const data = parseHotWingsExcel(ab);
        if (data.length === 0) throw new Error("No se detectaron recetas en el Excel.");
        setRecipes(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Error al procesar el Excel.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadMockData = () => {
    const mock: RecipeWithIngredients[] = [
      {
        id_receta: "M001",
        nombre_receta: "Muestra: Alitas BBQ x 12",
        familia: "ALITAS",
        categoria: "ENTRADA",
        descripcion_carta: "Datos de ejemplo de Hot Wings.",
        preparacion: "1. Freír.\n2. Salsear.\n3. Servir.",
        rendimiento: "1",
        unidad_rendimiento: "Orden",
        foto: "",
        costo_plato: 15000,
        valor_venta: 32000,
        ingredients: [
          { id_receta: "M001", insumo: "Alitas", cantidad: 12, unidad: "und", costo_linea: 10000 },
          { id_receta: "M001", insumo: "Salsa BBQ", cantidad: 60, unidad: "ml", costo_linea: 2000 }
        ]
      }
    ];
    setRecipes(mock);
    setError(null);
  };

  const families = useMemo(() => ['Todas', ...new Set(recipes.map(r => r.familia))].filter(Boolean), [recipes]);
  const categories = useMemo(() => ['Todas', ...new Set(recipes.map(r => r.categoria))].filter(Boolean), [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const s = searchTerm.toLowerCase();
      const matchSearch = (recipe.nombre_receta?.toLowerCase().includes(s) || 
                          recipe.ingredients?.some(i => i.insumo?.toLowerCase().includes(s)));
      const matchFamily = (selectedFamily === 'Todas' || recipe.familia === selectedFamily);
      const matchCategory = (selectedCategory === 'Todas' || recipe.categoria === selectedCategory);
      return matchSearch && matchFamily && matchCategory;
    });
  }, [recipes, searchTerm, selectedFamily, selectedCategory]);

  const selectedRecipe = useMemo(() => 
    recipes.find(r => String(r.id_receta) === String(selectedRecipeId)), 
  [recipes, selectedRecipeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950">
        <div className="relative">
          <ChefHat className="w-20 h-20 text-orange-600 animate-bounce" />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-orange-600/20 rounded-full blur-sm"></div>
        </div>
        <p className="mt-8 text-orange-500 font-black uppercase text-xs tracking-[0.4em] animate-pulse">Sincronizando Matriz...</p>
      </div>
    );
  }

  if (error && recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-lg w-full text-center space-y-8 border-b-8 border-orange-600">
          <div className="bg-orange-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto rotate-3">
            <AlertCircle className="text-orange-600 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic">¡OPPS!</h2>
            <p className="text-gray-500 font-medium">No detectamos el archivo de datos automático.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-zinc-900 text-white font-black py-5 rounded-2xl hover:bg-black transition flex items-center justify-center gap-3 text-lg shadow-xl"
            >
              <FileSpreadsheet className="w-6 h-6 text-orange-500" />
              Cargar Excel de Hot Wings
            </button>
            <button 
              onClick={loadMockData}
              className="w-full bg-orange-100 text-orange-700 font-black py-5 rounded-2xl hover:bg-orange-200 transition flex items-center justify-center gap-3"
            >
              <Sparkles className="w-5 h-5" />
              Ver demo con datos de ejemplo
            </button>
          </div>
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Hot Wings Kitchen OS v1.0</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 selection:bg-orange-100 selection:text-orange-900">
      {!isKitchenMode && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setSelectedRecipeId(null)}
            >
              <div className="bg-zinc-900 p-2 rounded-xl group-hover:bg-orange-600 transition-colors shadow-lg">
                <ChefHat className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-black text-zinc-900 tracking-tighter uppercase">HotWings<span className="text-orange-600">Matriz</span></h1>
            </div>
            <div className="flex items-center gap-2">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="hidden md:flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-200 transition"
              >
                <Upload className="w-4 h-4" />
                CAMBIAR EXCEL
              </button>
              <button 
                onClick={loadData}
                className="p-3 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all"
                title="Sincronizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 ${isKitchenMode ? 'bg-black' : 'max-w-7xl mx-auto w-full p-4 md:p-8'}`}>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
        
        {selectedRecipeId && selectedRecipe ? (
          isKitchenMode ? (
            <KitchenMode recipe={selectedRecipe} onExit={() => setIsKitchenMode(false)} />
          ) : (
            <RecipeDetail 
              recipe={selectedRecipe} 
              onBack={() => setSelectedRecipeId(null)} 
              onEnterKitchenMode={() => setIsKitchenMode(true)}
            />
          )
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Buscador y Filtros */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-6 h-6" />
                <input 
                  type="text"
                  placeholder="Busca por nombre o ingrediente..."
                  className="w-full pl-16 pr-8 py-6 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-orange-100 transition text-xl font-black text-gray-700 placeholder:text-gray-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Familia / Hoja</span>
                  <select 
                    value={selectedFamily}
                    onChange={(e) => setSelectedFamily(e.target.value)}
                    className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-50 text-gray-600 font-black appearance-none cursor-pointer"
                  >
                    {families.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Categoría</span>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-orange-50 text-gray-600 font-black appearance-none cursor-pointer"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Contador de Resultados */}
            <div className="flex items-center justify-between px-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Mostrando {filteredRecipes.length} recetas encontradas
              </span>
            </div>

            {/* Grid de Recetas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {filteredRecipes.map((recipe, index) => (
                <div key={recipe.id_receta} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 30}ms` }}>
                  <RecipeCard 
                    recipe={recipe} 
                    onClick={() => setSelectedRecipeId(recipe.id_receta)} 
                  />
                </div>
              ))}
              {filteredRecipes.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                   <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <Search className="w-8 h-8" />
                   </div>
                   <p className="text-gray-400 font-bold">No encontramos recetas con esos criterios.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
