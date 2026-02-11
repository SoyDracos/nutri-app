"use client";

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  User, 
  Activity, 
  Utensils, 
  MessageSquare, 
  ChevronRight, 
  Sparkles, 
  Scale, 
  TrendingUp, 
  Info,
  RefreshCw,
  CheckCircle2,
  BrainCircuit,
  Leaf
} from 'lucide-react';

// --- CONFIGURACIÓN IA ---
// CLAVE NUEVA HARDCODED (Para que funcione YA)
const apiKey = "AIzaSyAqnUY8EWiUc_JavA9YzArmL_NJjK4ij70";
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// --- TIPOS ---
interface UserProfile {
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  goal: 'lose_weight' | 'maintain' | 'gain_muscle';
  dietType: 'omnivore' | 'vegetarian' | 'vegan' | 'keto';
}

interface UserMetrics {
  bmi: number;
  bmiCategory: string;
  tdee: number; // Calorías de mantenimiento
  targetCalories: number; // Calorías para el objetivo
  protein: number;
  carbs: number;
  fats: number;
}

interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
}

interface DailyPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- UTILS ---
const calculateMetrics = (profile: UserProfile): UserMetrics => {
  // 1. BMI
  const heightM = profile.height / 100;
  const bmi = parseFloat((profile.weight / (heightM * heightM)).toFixed(1));
  let bmiCategory = 'Normal';
  if (bmi < 18.5) bmiCategory = 'Bajo Peso';
  else if (bmi >= 25 && bmi < 29.9) bmiCategory = 'Sobrepeso';
  else if (bmi >= 30) bmiCategory = 'Obesidad';

  // 2. BMR (Mifflin-St Jeor)
  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr += profile.gender === 'male' ? 5 : -161;

  // 3. TDEE (Activity)
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9
  };
  const tdee = Math.round(bmr * activityMultipliers[profile.activityLevel]);

  // 4. Target Calories
  let targetCalories = tdee;
  if (profile.goal === 'lose_weight') targetCalories -= 400;
  if (profile.goal === 'gain_muscle') targetCalories += 300;

  // 5. Macros (Simple split 30P/40C/30F approx)
  const protein = Math.round((targetCalories * 0.3) / 4);
  const fats = Math.round((targetCalories * 0.3) / 9);
  const carbs = Math.round((targetCalories * 0.4) / 4);

  return { bmi, bmiCategory, tdee, targetCalories, protein, carbs, fats };
};

// --- COMPONENTES ---

const LoadingScreen = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center p-10 space-y-4 animate-in fade-in">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
    <p className="text-emerald-500 font-medium animate-pulse">{text}</p>
  </div>
);

// 1. ONBOARDING
const Onboarding = ({ onComplete }: { onComplete: (p: UserProfile) => void }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({
    name: '', age: '', weight: '', height: '', gender: 'male',
    activityLevel: 'moderate', goal: 'maintain', dietType: 'omnivore'
  });

  const next = () => {
    if (step < 4) {
      setStep(s => s + 1);
    } else {
      onComplete({
        ...data,
        age: Number(data.age) || 30,
        weight: Number(data.weight) || 75,
        height: Number(data.height) || 170
      });
    }
  };
   
  const update = (k: keyof UserProfile, v: any) => setData((p: any) => ({...p, [k]: v}));

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-zinc-950 to-zinc-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-2">
            <BrainCircuit size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NutriGenius AI</h1>
          <p className="text-zinc-400">Tu nutricionista personal inteligente</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl space-y-6 bg-zinc-900/50 border border-zinc-800">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in duration-300">
              <h2 className="text-xl font-semibold text-white">Datos Básicos</h2>
              <input type="text" placeholder="Tu Nombre" className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors" value={data.name} onChange={e => update('name', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Edad" className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" value={data.age} onChange={e => update('age', e.target.value)} />
                <select className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" value={data.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in duration-300">
              <h2 className="text-xl font-semibold text-white">Medidas Corporales</h2>
              <div className="space-y-4">
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Peso Actual (kg)</label>
                    <input type="number" placeholder="Ej: 75" className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500 text-2xl font-bold text-center" value={data.weight} onChange={e => update('weight', e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Altura (cm)</label>
                    <input type="number" placeholder="Ej: 175" className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500 text-2xl font-bold text-center" value={data.height} onChange={e => update('height', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in duration-300">
              <h2 className="text-xl font-semibold text-white">Nivel de Actividad</h2>
              <div className="space-y-2">
                {[
                  { id: 'sedentary', label: 'Sedentario', desc: 'Poco o nada de ejercicio' },
                  { id: 'light', label: 'Ligero', desc: 'Ejercicio 1-3 días/sem' },
                  { id: 'moderate', label: 'Moderado', desc: 'Ejercicio 3-5 días/sem' },
                  { id: 'active', label: 'Activo', desc: 'Ejercicio 6-7 días/sem' },
                  { id: 'athlete', label: 'Atleta', desc: 'Físico intenso diario' },
                ].map((opt) => (
                  <button key={opt.id} onClick={() => update('activityLevel', opt.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${data.activityLevel === opt.id ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-xs opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

           {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right fade-in duration-300">
              <h2 className="text-xl font-semibold text-white">Objetivo & Dieta</h2>
              <div className="grid grid-cols-1 gap-3">
                 <select className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" value={data.goal} onChange={e => update('goal', e.target.value)}>
                  <option value="lose_weight">🔥 Perder Grasa</option>
                  <option value="maintain">⚖️ Mantener Peso</option>
                  <option value="gain_muscle">💪 Ganar Músculo</option>
                </select>
                <select className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" value={data.dietType} onChange={e => update('dietType', e.target.value)}>
                  <option value="omnivore">🥩 Omnívoro (Todo)</option>
                  <option value="vegetarian">🥗 Vegetariano</option>
                  <option value="vegan">🌱 Vegano</option>
                  <option value="keto">🥑 Keto</option>
                </select>
              </div>
            </div>
          )}

          <button onClick={next} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group">
            {step === 4 ? 'Crear mi Plan' : 'Siguiente'}
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </div>
         
        <div className="flex justify-center gap-2">
            {[1,2,3,4].map(i => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-800'}`} />)}
        </div>
      </div>
    </div>
  );
};

// 2. MAIN APP
export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'coach' | 'profile'>('plan');
   
  // State for Plan
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // State for Coach
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load from localstorage
    const savedProfile = localStorage.getItem('nutri_profile');
    if (savedProfile) {
      const p = JSON.parse(savedProfile);
      setProfile(p);
      setMetrics(calculateMetrics(p));
    }
    
    const savedPlan = localStorage.getItem('nutri_plan');
    if (savedPlan) setPlan(JSON.parse(savedPlan));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleProfileComplete = (p: UserProfile) => {
    setProfile(p);
    setMetrics(calculateMetrics(p));
    localStorage.setItem('nutri_profile', JSON.stringify(p));
    generateDiet(p, calculateMetrics(p));
  };

  const generateDiet = async (userProfile: UserProfile, userMetrics: UserMetrics) => {
    if (!genAI) {
      alert("Error de configuración: Falta la API Key");
      return;
    }

    setLoadingPlan(true);
    setPlan(null); // Clear previous
    try {
      // USAMOS MODELO 1.5 FLASH (MÁS ESTABLE)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Crea un plan de alimentación de 1 día (Desayuno, Almuerzo, Cena, Snack).
        Perfil: ${userProfile.dietType}, Objetivo: ${userProfile.goal}.
        Calorías Totales Objetivo: ${userMetrics.targetCalories}.
         
        CONTEXTO LOCAL: Chile.
        INSTRUCCIONES DE INGREDIENTES: Usa exclusivamente ingredientes económicos y muy comunes en supermercados o ferias de Chile.
        - Prioriza: Pollo, pavo, carne molida baja en grasa, jurel en lata, atún, huevos, legumbres (lentejas, porotos, garbanzos), arroz, fideos, papas, avena, pan (marraqueta/hallulla integral), frutas de estación (manzana, plátano, naranja) y verduras comunes (lechuga, tomate, zanahoria, zapallo).
        - EVITA: Salmón, camarones, cortes de carne caros, frutas exóticas o ingredientes difíciles de encontrar.
        - Estilo: Cocina casera, simple y rica.
         
        Devuelve SOLO un JSON con esta estructura exacta, sin texto extra:
        {
          "breakfast": { "name": "", "description": "", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "ingredients": [""] },
          "lunch": { ... igual },
          "dinner": { ... igual },
          "snack": { ... igual }
        }
        Asegúrate que la suma de calorías sea aprox ${userMetrics.targetCalories}.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
       
      // Limpiar el JSON si viene con bloques de código
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const jsonPlan = JSON.parse(text);
      setPlan(jsonPlan);
      localStorage.setItem('nutri_plan', JSON.stringify(jsonPlan));
    } catch (e) {
      console.error(e);
      alert('Error generando dieta. Intenta de nuevo.');
    } finally {
      setLoadingPlan(false);
    }
  };

  const sendMessage = async () => {
    if (!msgInput.trim()) return;
    if (!genAI) return;

    const newMsg: ChatMessage = { role: 'user', text: msgInput };
    setMessages(prev => [...prev, newMsg]);
    setMsgInput('');
    setLoadingMsg(true);

    try {
      // USAMOS MODELO 1.5 FLASH (MÁS ESTABLE)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
       
      const context = `
        Eres un Nutricionista experto enfocado en Chile.
        Usuario: ${profile?.name}, ${profile?.age} años, Objetivo: ${profile?.goal}.
        Calorías diarias: ${metrics?.targetCalories}.
        Recomienda alimentos accesibles en Chile y económicos (feria/supermercado).
        Responde de forma corta, motivadora y útil.
      `;
       
      const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: context }],
            },
            ...messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }))
        ],
      });

      const result = await chat.sendMessage(msgInput);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'model', text: text }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Error de conexión. Verifica tu conexión." }]);
    } finally {
      setLoadingMsg(false);
    }
  };

  if (!profile) return <Onboarding onComplete={handleProfileComplete} />;

  return (
    <div className="flex justify-center min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md bg-zinc-950 flex flex-col h-screen border-x border-zinc-800 relative shadow-2xl">
         
        {/* HEADER */}
        <header className="px-6 py-4 flex items-center justify-between bg-zinc-900/50 backdrop-blur border-b border-zinc-800 z-10 sticky top-0">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Leaf className="text-emerald-500 fill-emerald-500" size={18} />
                NutriGenius
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
                {activeTab === 'plan' ? 'Tu Plan de Hoy' : activeTab === 'coach' ? 'Asistente IA' : 'Tu Perfil'}
            </p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
            {metrics?.targetCalories} kcal
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 hide-scrollbar">
           
          {/* TAB: PLAN */}
          {activeTab === 'plan' && (
            <div className="space-y-6 pb-20 animate-in fade-in zoom-in-95 duration-300">
               
              {/* Macro Summary */}
              <div className="glass-panel p-4 rounded-3xl relative overflow-hidden bg-zinc-900/40 border border-zinc-800">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="flex justify-between items-end mb-4 relative z-10">
                   <div>
                       <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Objetivo Diario</span>
                       <div className="text-2xl font-bold text-white mt-1">{metrics?.targetCalories} <span className="text-sm font-normal text-zinc-500">kcal</span></div>
                   </div>
                   <div className="bg-emerald-500 text-black p-2 rounded-xl">
                       <TrendingUp size={20} />
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-2 relative z-10">
                    <div className="bg-zinc-900/50 p-2 rounded-xl text-center border border-zinc-800">
                        <div className="text-emerald-400 font-bold">{metrics?.protein}g</div>
                        <div className="text-[10px] text-zinc-500 uppercase">Prot</div>
                    </div>
                    <div className="bg-zinc-900/50 p-2 rounded-xl text-center border border-zinc-800">
                        <div className="text-blue-400 font-bold">{metrics?.carbs}g</div>
                        <div className="text-[10px] text-zinc-500 uppercase">Carb</div>
                    </div>
                    <div className="bg-zinc-900/50 p-2 rounded-xl text-center border border-zinc-800">
                        <div className="text-yellow-400 font-bold">{metrics?.fats}g</div>
                        <div className="text-[10px] text-zinc-500 uppercase">Grasa</div>
                    </div>
                </div>
              </div>

              {loadingPlan && <LoadingScreen text="Diseñando tu menú con ingredientes chilenos..." />}

              {!loadingPlan && plan && (
                <div className="space-y-4">
                  {Object.entries(plan).map(([key, meal]: [string, any], idx) => (
                    <div key={key} className="glass-panel p-5 rounded-3xl border border-zinc-800 bg-zinc-900/30 border-l-4 border-l-emerald-500 hover:bg-zinc-800/60 transition-colors" style={{ animationDelay: `${idx * 100}ms` }}>
                       <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-md">
                               {key === 'breakfast' ? 'Desayuno' : key === 'lunch' ? 'Almuerzo' : key === 'dinner' ? 'Cena' : 'Snack'}
                           </span>
                           <span className="text-xs text-zinc-400 font-mono">{meal.calories} kcal</span>
                       </div>
                       <h3 className="text-lg font-bold text-white mb-1 leading-snug">{meal.name}</h3>
                       <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{meal.description}</p>
                       <div className="flex flex-wrap gap-1.5">
                           {meal.ingredients.slice(0, 4).map((ing: string, i: number) => (
                               <span key={i} className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-md">{ing}</span>
                           ))}
                       </div>
                    </div>
                  ))}
                   
                  <button 
                    onClick={() => metrics && generateDiet(profile, metrics)}
                    className="w-full py-4 text-zinc-500 text-sm font-medium flex items-center justify-center gap-2 hover:text-white transition-colors"
                  >
                    <RefreshCw size={16} /> Regenerar Menú
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: COACH */}
          {activeTab === 'coach' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex-1 space-y-4 overflow-y-auto pb-4">
                    {messages.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="text-emerald-500" />
                            </div>
                            <p className="text-sm text-zinc-400">Pregúntame sobre tu dieta, sustituciones o dudas nutricionales.</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                                m.role === 'user' 
                                ? 'bg-emerald-600 text-white rounded-tr-sm' 
                                : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                            }`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loadingMsg && <div className="flex justify-start"><div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-sm flex gap-1"><span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-75"></span><span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-150"></span></div></div>}
                    <div ref={chatEndRef} />
                </div>
                <div className="pt-2 sticky bottom-0 bg-zinc-950 pb-20">
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-5 pr-12 py-4 text-white focus:border-emerald-500 focus:outline-none shadow-lg"
                            placeholder="Escribe tu duda..."
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button onClick={sendMessage} disabled={loadingMsg || !msgInput.trim()} className="absolute right-2 top-2 bg-emerald-500 p-2 rounded-full text-black hover:scale-105 transition-transform disabled:opacity-50">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && metrics && (
             <div className="space-y-6 pb-20 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-xl shadow-emerald-900/20">
                        <User size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                    <p className="text-emerald-500 font-medium capitalize">{profile.goal.replace('_', ' ')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-4 rounded-2xl text-center bg-zinc-900/40 border border-zinc-800">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">IMC</div>
                        <div className="text-2xl font-bold text-white">{metrics.bmi}</div>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${metrics.bmiCategory === 'Normal' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {metrics.bmiCategory}
                        </div>
                    </div>
                     <div className="glass-panel p-4 rounded-2xl text-center bg-zinc-900/40 border border-zinc-800">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Mantenimiento</div>
                        <div className="text-2xl font-bold text-white">{metrics.tdee}</div>
                        <div className="text-xs text-zinc-500">kcal/día</div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800">
                    <h3 className="text-white font-bold mb-4 flex items-center"><Info size={16} className="mr-2 text-emerald-500"/> Tus Datos</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                            <span className="text-zinc-500">Peso</span>
                            <span className="text-white font-bold">{profile.weight} kg</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                            <span className="text-zinc-500">Altura</span>
                            <span className="text-white font-bold">{profile.height} cm</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                            <span className="text-zinc-500">Dieta</span>
                            <span className="text-white font-bold capitalize">{profile.dietType}</span>
                        </div>
                    </div>
                </div>

                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-4 rounded-xl bg-red-500/10 text-red-400 font-bold border border-red-500/20 hover:bg-red-500/20 transition-all">
                    Cerrar Sesión / Resetear
                </button>
             </div>
          )}

        </main>

        {/* BOTTOM NAV */}
        <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex justify-between shadow-2xl z-20">
           {[ 
             { id: 'plan', icon: Utensils, label: 'Dieta' }, 
             { id: 'coach', icon: BrainCircuit, label: 'Coach' }, 
             { id: 'profile', icon: User, label: 'Yo' } 
           ].map(tab => (
             <button 
               key={tab.id} 
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 relative ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
                {activeTab === tab.id && <div className="absolute inset-0 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 -z-10 animate-in zoom-in-90 duration-200"></div>}
                <tab.icon size={20} className={activeTab === tab.id ? 'drop-shadow-md' : ''} />
                {activeTab === tab.id && <span className="text-[10px] font-bold mt-1 leading-none">{tab.label}</span>}
             </button>
           ))}
        </nav>

      </div>
    </div>
  );
}
