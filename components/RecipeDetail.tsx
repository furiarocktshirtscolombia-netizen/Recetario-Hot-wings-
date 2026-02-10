
import React, { useMemo, useState } from 'react';
import { ArrowLeft, FileText, ChefHat, List, Play } from 'lucide-react';
import { RecipeWithIngredients } from '../types';
import KitchenMode from './KitchenMode';

interface RecipeDetailProps {
  recipe: RecipeWithIngredients | any; 
  onBack: () => void;
}

function pick<T = any>(obj: any, keys: string[], fallback?: T): T {
  if (!obj) return fallback as T;
  for (const k of keys) {
    const v = obj[k];
    if (v === 0) return v as T;
    if (v !== undefined && v !== null && String(v).trim() !== '') return v as T;
  }
  return fallback as T;
}

function toNumber(v: any): number | null {
  if (v === 0) return 0;
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v)
    .replace(/\./g, '')      
    .replace(/,/g, '.')      
    .replace(/[^\d.-]/g, ''); 
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeIngredients(recipe: any) {
  const raw = pick<any[]>(recipe, ['ingredients', 'ingredientes', 'items', 'insumos', 'matriz'], []) || [];
  return raw.map((ing: any) => ({
    insumo: pick<string>(ing, ['insumo', 'articulo', 'artículo', 'ingrediente', 'nombre'], '—'),
    cantidad: pick<any>(ing, ['cantidad', 'qty', 'unidades_netas', 'unidadesNetas', 'unidades', 'cant'], '—'),
    unidad: pick<string>(ing, ['unidad', 'udm', 'unidad_medida', 'unidadMedida', 'unit'], '—'),
    merma: pick<any>(ing, ['merma', '%_merma', 'porc_merma', 'porcentaje_merma', 'percentMerma'], ''),
    costo_linea: toNumber(pick<any>(ing, ['costo_linea', 'costolinea', 'costoLinea', 'subtotal', 'costo', 'valor'], null)),
  }));
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack }) => {
  const [showKitchenMode, setShowKitchenMode] = useState(false);

  const familia = pick<string>(recipe, ['familia', 'family', 'categoria', 'category'], 'Sin familia');
  const nombreReceta = pick<string>(recipe, ['nombre_receta', 'nombreReceta', 'nombre', 'receta', 'title', 'name'], 'Receta');
  const costoPlato = toNumber(pick<any>(recipe, ['costo_plato', 'costoPlato', 'costo', 'costo_receta', 'costoReceta'], null));
  const valorVenta = toNumber(pick<any>(recipe, ['valor_venta', 'valorVenta', 'venta', 'precio_venta', 'precioVenta', 'precio'], null));
  const foto = pick<string>(recipe, ['foto', 'fotoUrl', 'imageUrl', 'image'], '');

  const desc = pick<string>(recipe, ['descripcionCarta', 'descripcion_carta', 'DescripcionCarta', 'descripcion', 'descCarta'], 'Pendiente de registro en matriz.');
  const proc = pick<string>(recipe, ['procesoElaboracion', 'proceso_elaboracion', 'ProcesoElaboracion', 'preparacion', 'preparación', 'procedimiento'], 'Pendiente de registro en matriz.');

  const ingredients = useMemo(() => normalizeIngredients(recipe), [recipe]);

  const normalizedRecipe = useMemo(() => ({
    ...recipe,
    familia,
    nombre_receta: nombreReceta,
    costo_plato: costoPlato,
    valor_venta: valorVenta,
    descripcionCarta: desc,
    procesoElaboracion: proc,
    foto,
    ingredients, 
  }), [recipe, familia, nombreReceta, costoPlato, valorVenta, desc, proc, foto, ingredients]);

  const resolveImageUrl = (foto: string) => {
    if (!foto || foto.trim().length < 3) {
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
    }
    if (foto.startsWith('http')) {
      return foto;
    }
    return `/images/${foto}`;
  };

  const imageUrl = resolveImageUrl(foto);

  if (showKitchenMode) {
    return <KitchenMode recipe={normalizedRecipe} onExit={() => setShowKitchenMode(false)} />;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-hw-muted hover:text-hw-orange font-bold transition uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-5 h-5" /> VOLVER AL LISTADO
        </button>

        <button
          onClick={() => setShowKitchenMode(true)}
          className="bg-hw-orange hover:bg-hw-orange2 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          Iniciar Modo Cocina
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-hw-surface rounded-[2.5rem] shadow-2xl border border-hw-border overflow-hidden">
            <div className="h-64 bg-hw-surface2">
              <img 
                src={imageUrl} 
                alt={nombreReceta} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=800&auto=format&fit=crop';
                }}
              />
            </div>
            <div className="p-8">
              <span className="text-xs font-black text-hw-orange uppercase tracking-[0.3em]">{familia}</span>
              <h2 className="text-4xl font-black text-hw-text leading-tight uppercase tracking-tighter mt-1">
                {nombreReceta}
              </h2>
              {valorVenta && valorVenta > 0 && (
                <div className="mt-4 inline-block bg-hw-bg text-hw-text px-4 py-2 rounded-xl font-black border border-hw-border">
                  PVP: ${valorVenta.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-hw-surface p-8 rounded-[2.5rem] shadow-sm border border-hw-border">
            <h3 className="text-sm font-black text-hw-orange mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-hw-border pb-2">
              <FileText className="w-5 h-5" />
              🧾 Descripción Carta
            </h3>
            <div className="p-5 bg-hw-surface2/50 rounded-2xl border border-hw-border">
              <p className="text-hw-text font-bold italic leading-relaxed text-lg">{desc}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <section className="bg-hw-surface p-8 md:p-10 rounded-[3rem] shadow-sm border border-hw-border">
            <h3 className="text-xl font-black text-hw-orange mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <List className="w-6 h-6" />
              MATRIZ DE INGREDIENTES
            </h3>

            {!ingredients.length ? (
              <div className="p-6 bg-hw-surface2 rounded-2xl border border-hw-border text-hw-muted font-bold">
                No se detectaron ingredientes para esta receta.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-hw-muted uppercase text-[10px] font-black tracking-[0.2em] border-b border-hw-border">
                      <th className="pb-6 px-2">Artículo</th>
                      <th className="pb-6 px-2 text-right">Unidad</th>
                      <th className="pb-6 px-2 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hw-border/50">
                    {ingredients.map((ing: any, idx: number) => (
                      <tr key={idx} className="group hover:bg-hw-orange/5 transition-colors">
                        <td className="py-5 px-2 font-black text-hw-text text-lg uppercase tracking-tight">
                          {ing.insumo}
                        </td>
                        <td className="py-5 px-2 text-right text-hw-muted font-bold uppercase text-xs">{ing.unidad}</td>
                        <td className="py-5 px-2 text-right font-black text-2xl text-hw-orange font-mono">
                          {ing.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-hw-surface2 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-t-8 border-hw-orange">
            <h3 className="text-2xl font-black text-hw-text mb-8 flex items-center gap-3 italic uppercase tracking-tighter">
              <ChefHat className="w-8 h-8 text-hw-orange" />
              👨‍🍳 PROCESO DE ELABORACIÓN
            </h3>
            <div className="bg-hw-bg/50 p-8 md:p-10 rounded-[2.5rem] border border-hw-border shadow-inner">
              <pre className="text-hw-text text-2xl md:text-3xl leading-relaxed font-black whitespace-pre-wrap font-sans tracking-tight">
                {proc}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
